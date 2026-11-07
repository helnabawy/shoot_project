import 'server-only'
import { formatCreatorCode, isListed, normaliseCode, type CreatorSummary } from '@shoot/domain/creators'
import { getActivePersonas } from '@/modules/personas/queries'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
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
