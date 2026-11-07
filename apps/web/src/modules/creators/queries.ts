import 'server-only'
import { formatCreatorCode, isListed, normaliseCode, type CreatorSummary } from '@shoot/domain/creators'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import type { Lookups } from './describe'
import { buildProfileView, type ProfileView, type RawProfileDoc } from './profile'
import { locationParents, publicSummaries, type RawListing, type RawProfile } from './summary'

const TAGS = ['creators', 'media', 'personas', 'categories', 'locations', 'site-settings']

/**
 * Every public creator (published, active, not suspended) as lightweight summaries, one cached read
 * per locale. Directory filters, counts, ordering and the landing selection are pure functions over
 * this list (research §3). Listing state is read here, server-side only; it is never publicly readable.
 */
function getPublicList(locale: Locale): Promise<CreatorSummary[]> {
  return cachedQuery(TAGS, ['creators', locale], async () => {
    const payload = await getPayloadClient()
    const [profiles, listings, locations] = await Promise.all([
      payload.find({
        collection: 'creator-profiles',
        where: { _status: { equals: 'published' } },
        locale,
        fallbackLocale: 'en',
        depth: 1,
        pagination: false,
        select: { displayName: true, bio: true, code: true, personas: true, specialties: true, cities: true, languages: true, photo: true, samples: { category: true }, createdAt: true },
        populate: { media: { alt: true, url: true, width: true, height: true, sizes: true } },
        overrideAccess: true,
      }),
      payload.find({ collection: 'creator-listings', depth: 0, pagination: false, overrideAccess: true }),
      payload.find({ collection: 'locations', depth: 0, pagination: false, select: { parent: true }, overrideAccess: true }),
    ])
    return publicSummaries(profiles.docs as RawProfile[], listings.docs as unknown as RawListing[], locationParents(locations.docs))
  })
}

/**
 * Public creators in the cached order of the database. By default only those *listed*: at least one
 * of their professional types is in the site's audience (the directory, landing block, specialty
 * pages and sitemap). `listedOnly: false` also returns reachable-but-unlisted creators.
 */
export async function getPublicCreators(locale: Locale, options: { listedOnly?: boolean } = {}): Promise<CreatorSummary[]> {
  const all = await getPublicList(locale)
  if (options.listedOnly === false) return all
  const audience = (await getActivePersonas(locale)).map((p) => p.id)
  return all.filter((c) => isListed({ published: true, hasNewerDraft: false, personaIds: c.personaIds }, { active: true, suspended: false }, audience))
}

/** A creator by any spelling of its code; `canBook` is false when none of their types is in the audience. */
export async function getCreatorByCode(rawCode: string, locale: Locale): Promise<{ creator: CreatorSummary; canBook: boolean } | null> {
  const code = normaliseCode(rawCode)
  if (!code) return null
  const creator = (await getPublicList(locale)).find((c) => c.code === code)
  if (!creator) return null
  const audience = (await getActivePersonas(locale)).map((p) => p.id)
  const canBook = isListed({ published: true, hasNewerDraft: false, personaIds: creator.personaIds }, { active: true, suspended: false }, audience)
  return { creator, canBook }
}

/** The code as people see it, with the brand prefix currently set in Site settings. */
export async function formatCode(code: string, locale: Locale): Promise<string> {
  const settings = await getSiteSettings(locale)
  return formatCreatorCode(settings.creatorCodePrefix ?? 'CR', code)
}

export interface DirectoryLocation {
  id: string
  slug: string
  name: string
  parentId: string | null
  order: number
}

/** Emirates and cities with names in the locale, cached under the `locations` tag (research §9). */
export function getLocations(locale: Locale): Promise<DirectoryLocation[]> {
  return cachedQuery(['locations'], ['locations', locale], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'locations',
      where: { active: { equals: true } },
      locale,
      fallbackLocale: 'en',
      depth: 0,
      pagination: false,
      sort: 'order',
    })
    return docs.map((l) => ({
      id: String(l.id),
      slug: l.slug,
      name: l.name,
      parentId: l.parent ? String(typeof l.parent === 'object' ? l.parent.id : l.parent) : null,
      order: l.order ?? 100,
    }))
  })
}

export interface DirectoryContext {
  lookups: Lookups
  /** Audience professional types in Site settings order. */
  personas: { id: string; slug: string; name: string }[]
  /** Specialties of the audience. */
  specialties: { id: string; slug: string; name: string }[]
  emirates: { id: string; slug: string; name: string }[]
  prefix: string
  pageSize: number
}

/** Everything a page needs to turn creator summaries into rows and filters, in one place. */
export async function getDirectoryContext(locale: Locale): Promise<DirectoryContext> {
  const [personas, categories, locations, settings] = await Promise.all([
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    getLocations(locale),
    getSiteSettings(locale),
  ])
  return {
    lookups: {
      personas: new Map(personas.map((p) => [p.id, p.singular])),
      specialties: new Map(categories.map((c) => [c.id, c.name])),
      locations: new Map(locations.map((l) => [l.id, l.name])),
    },
    personas: personas.map((p) => ({ id: p.id, slug: p.slug, name: p.plural })),
    specialties: categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    emirates: locations.filter((l) => !l.parentId).map((l) => ({ id: l.id, slug: l.slug, name: l.name })),
    prefix: settings.creatorCodePrefix ?? 'CR',
    pageSize: settings.directoryPageSize ?? 24,
  }
}

export interface CreatorProfilePage {
  view: ProfileView
  /** With the brand prefix: "CR-7K4Q2". */
  displayCode: string
  canBook: boolean
  /** Slugs of the creator's professional types that the site offers (the booking's allowed types). */
  personaSlugs: string[]
}

/** A public creator's full profile for the profile and booking pages; null unless they are public. */
export async function getCreatorProfile(rawCode: string, locale: Locale): Promise<CreatorProfilePage | null> {
  const found = await getCreatorByCode(rawCode, locale)
  if (!found) return null
  const { creator, canBook } = found
  const [doc, context, personas] = await Promise.all([
    cachedQuery(['creators', 'media', 'personas', 'categories', 'locations'], ['creator-profile', locale, creator.id], async () => {
      const payload = await getPayloadClient()
      return payload.findByID({ collection: 'creator-profiles', id: Number(creator.id), locale, fallbackLocale: 'en', depth: 1 })
    }),
    getDirectoryContext(locale),
    getActivePersonas(locale),
  ])
  return {
    view: buildProfileView(doc as unknown as RawProfileDoc, context.lookups, locale),
    displayCode: formatCreatorCode(context.prefix, creator.code),
    canBook,
    personaSlugs: personas.filter((p) => creator.personaIds.includes(p.id)).map((p) => p.slug),
  }
}
