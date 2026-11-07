import 'server-only'
import { COUNTRIES, type ListingState, missingForReview, profileStatus, type ProfileStatus, type ReviewField, SPOKEN_LANGUAGES } from '@shoot/domain/creators'
import type { Media, User } from '@/payload-types'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { countryName, languageName } from './profile'
import { getLocations } from './queries'
import { relId } from './references'

export interface LocalizedText {
  en: string
  ar: string
}

export interface MyImage {
  id: number
  url: string
  alt: string
}

export interface MySample {
  id: string
  kind: 'image' | 'video'
  image: MyImage | null
  videoUrl: string
  caption: LocalizedText
  category: number | null
}

/** The provider's own profile as the editor needs it: the latest draft in both languages, plus standing. */
export interface MyProfile {
  id: number
  code: string
  status: ProfileStatus
  displayName: LocalizedText
  bio: LocalizedText
  personas: number[]
  specialties: number[]
  cities: number[]
  languages: string[]
  gender: 'woman' | 'man' | null
  nationality: string | null
  yearsExperience: number | null
  social: { platform: string; url: string }[]
  photo: MyImage | null
  samples: MySample[]
  reviewNote: string
  submittedAt: string | null
  verifiedAt: string | null
  /** Anything saved but not yet public: the editor says so. */
  hasNewerDraft: boolean
  isPublished: boolean
  paused: boolean
  missing: ReviewField[]
  /** Site setting: a verified creator's edits go live at once. */
  autoPublish: boolean
}

type AllLocales = { en?: string | null; ar?: string | null } | string | null | undefined
const pair = (value: AllLocales): LocalizedText =>
  typeof value === 'object' && value !== null ? { en: value.en ?? '', ar: value.ar ?? '' } : { en: value ?? '', ar: '' }

const numbers = (value: unknown): number[] => (Array.isArray(value) ? value.map((v) => Number(relId(v))).filter((n) => Number.isFinite(n)) : [])

const imageOf = (media: Media | undefined): MyImage | null =>
  media ? { id: media.id, url: media.sizes?.thumbnail?.url ?? media.url ?? '', alt: media.alt ?? '' } : null

/** The signed-in provider's profile and standing, or null before their first save. Never cached. */
export async function getMyProfile(user: User): Promise<MyProfile | null> {
  const payload = await getPayloadClient()
  const latest = (
    await payload.find({ collection: 'creator-profiles', where: { user: { equals: user.id } }, draft: true, locale: 'all', limit: 1, depth: 0, overrideAccess: true })
  ).docs[0]
  if (!latest) return null

  const [published, listingResult, settings] = await Promise.all([
    payload.find({ collection: 'creator-profiles', where: { id: { equals: latest.id } }, limit: 1, depth: 0, select: { _status: true }, overrideAccess: true }),
    payload.find({ collection: 'creator-listings', where: { profile: { equals: latest.id } }, limit: 1, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'site-settings', depth: 0 }),
  ])
  const listing = listingResult.docs[0]
  const isPublished = published.docs[0]?._status === 'published'
  const hasNewerDraft = isPublished && latest._status === 'draft'
  const personas = numbers(latest.personas)
  const listingState: ListingState = {
    active: listing?.active ?? true,
    suspended: listing?.suspended ?? false,
    featured: listing?.featured ?? false,
    submittedAt: listing?.submittedAt ?? null,
    verifiedAt: listing?.verifiedAt ?? null,
  }

  const rows = (latest.samples ?? []) as unknown as {
    id?: string
    kind?: 'image' | 'video'
    image?: unknown
    videoUrl?: string | null
    caption?: AllLocales
    category?: unknown
  }[]
  const mediaIds = [...new Set([relId(latest.photo), ...rows.map((r) => relId(r.image))].filter((v): v is string => v !== null))]
  const media = mediaIds.length
    ? (await payload.find({ collection: 'media', where: { id: { in: mediaIds } }, depth: 0, pagination: false, locale: 'en', fallbackLocale: 'en', overrideAccess: true })).docs
    : []
  const byId = new Map(media.map((m) => [String(m.id), m]))

  const displayName = pair(latest.displayName as unknown as AllLocales)
  const profile = {
    displayName,
    personas,
    specialties: numbers(latest.specialties),
    cities: numbers(latest.cities),
    languages: (latest.languages ?? []) as string[],
    gender: (latest.gender ?? null) as 'woman' | 'man' | null,
  }
  return {
    id: latest.id,
    code: latest.code ?? '',
    status: profileStatus({ published: isPublished, hasNewerDraft, personaIds: personas.map(String) }, listingState),
    ...profile,
    bio: pair(latest.bio as unknown as AllLocales),
    nationality: latest.nationality ?? null,
    yearsExperience: latest.yearsExperience ?? null,
    social: (latest.social ?? []).map((s) => ({ platform: s.platform, url: s.url })),
    photo: imageOf(byId.get(relId(latest.photo) ?? '')),
    samples: rows.map((row, i) => ({
      id: row.id ?? String(i),
      kind: row.kind === 'video' ? 'video' : 'image',
      image: imageOf(byId.get(relId(row.image) ?? '')),
      videoUrl: row.videoUrl ?? '',
      caption: pair(row.caption),
      category: row.category ? Number(relId(row.category)) : null,
    })),
    reviewNote: listing?.reviewNote ?? '',
    submittedAt: listingState.submittedAt ?? null,
    verifiedAt: listingState.verifiedAt ?? null,
    hasNewerDraft,
    isPublished,
    paused: !listingState.active,
    missing: missingForReview({ ...profile, displayName: displayName.en }),
    autoPublish: Boolean(settings.autoPublishEdits),
  }
}

export interface SelectableOptions {
  personas: { id: number; name: string }[]
  /** Specialties of the audience with the professional types they belong to. */
  specialties: { id: number; name: string; personaIds: number[] }[]
  emirates: { id: number; name: string; cities: { id: number; name: string }[] }[]
  languages: { code: string; name: string }[]
  /** Nationalities, named in the page language and sorted by name. */
  countries: { code: string; name: string }[]
}

/** What a provider can choose from, all data (Principle IV), named in the page language. */
export async function getSelectableOptions(locale: Locale): Promise<SelectableOptions> {
  const [personas, categories, locations] = await Promise.all([getActivePersonas(locale), getCategoriesForAudience(locale), getLocations(locale)])
  const emirates = locations.filter((l) => !l.parentId)
  return {
    personas: personas.map((p) => ({ id: Number(p.id), name: p.singular })),
    specialties: categories.map((c) => ({ id: Number(c.id), name: c.name, personaIds: c.personas.map(Number) })),
    emirates: emirates.map((e) => ({
      id: Number(e.id),
      name: e.name,
      cities: locations.filter((l) => l.parentId === e.id).map((c) => ({ id: Number(c.id), name: c.name })),
    })),
    languages: SPOKEN_LANGUAGES.map((code) => ({ code, name: languageName(code, locale) })),
    countries: COUNTRIES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => a.name.localeCompare(b.name, locale)),
  }
}

/** Everything the "My profile" page needs in one read: the profile, the choices, and the registration defaults. */
export async function getMyProfileView(user: User, locale: Locale) {
  const [profile, options] = await Promise.all([getMyProfile(user), getSelectableOptions(locale)])
  const registered = user.persona ? Number(relId(user.persona)) : null
  return {
    profile,
    options,
    defaults: {
      name: user.name,
      personas: registered !== null && Number.isFinite(registered) ? [registered] : [],
      specialties: (user.categories ?? []).map((c) => Number(relId(c))).filter((n) => Number.isFinite(n)),
    },
  }
}
