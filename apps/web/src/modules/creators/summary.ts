import { isPublic, type CreatorSummary, type ListingState } from '@shoot/domain/creators'
import { refId, type Ref } from '@shoot/domain/personas'
import type { Media } from '@/payload-types'

/** Cards show a short excerpt; the full bio is read on the profile page. Keeps the cached list small (research §3). */
export const BIO_EXCERPT_LENGTH = 140

export function excerpt(text: string | null | undefined, max = BIO_EXCERPT_LENGTH): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

/** The fields of a profile row a summary needs (relations at depth 0 or populated). */
export interface RawProfile {
  id: number | string
  code?: string | null
  displayName?: string | null
  bio?: string | null
  personas?: Ref[] | null
  specialties?: Ref[] | null
  cities?: Ref[] | null
  languages?: string[] | null
  photo?: Media | number | null
  samples?: { category?: Ref | null }[] | null
}

export interface RawListing extends ListingState {
  profile: Ref
}

function countSamples(samples: RawProfile['samples']): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const sample of samples ?? []) {
    if (!sample.category) continue
    const id = refId(sample.category)
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

/** location id → parent id, for locations that are cities. */
export type LocationParents = ReadonlyMap<string, string | null>

export function locationParents(locations: { id: number | string; parent?: Ref | null }[]): LocationParents {
  return new Map(locations.map((l) => [String(l.id), l.parent ? refId(l.parent) : null]))
}

export function photoOf(photo: RawProfile['photo']): CreatorSummary['photo'] {
  if (!photo || typeof photo !== 'object') return null
  const size = photo.sizes?.thumbnail?.url ? photo.sizes.thumbnail : photo.sizes?.card?.url ? photo.sizes.card : null
  const url = size?.url ?? photo.url
  if (!url) return null
  return { url, alt: photo.alt ?? '', width: size?.width ?? photo.width ?? undefined, height: size?.height ?? photo.height ?? undefined }
}

/** The public record for one creator; `publishedAt` is the first verification (the listing's `verifiedAt`). */
export function toSummary(profile: RawProfile, listing: RawListing, parents: LocationParents, createdAt = ''): CreatorSummary {
  const locationIds = (profile.cities ?? []).map(refId)
  const emirateIds = [...new Set(locationIds.map((id) => parents.get(id) ?? id))]
  return {
    id: String(profile.id),
    code: profile.code ?? '',
    displayName: profile.displayName ?? '',
    bio: excerpt(profile.bio),
    photo: photoOf(profile.photo),
    personaIds: (profile.personas ?? []).map(refId),
    specialtyIds: (profile.specialties ?? []).map(refId),
    locationIds,
    emirateIds,
    languages: profile.languages ?? [],
    sampleCounts: countSamples(profile.samples),
    sampleCount: (profile.samples ?? []).length,
    featured: Boolean(listing.featured),
    publishedAt: listing.verifiedAt ?? createdAt,
  }
}

/** Joins published profiles with their listings and keeps the public ones, never trusting a missing listing. */
export function publicSummaries(
  profiles: (RawProfile & { createdAt?: string })[],
  listings: RawListing[],
  parents: LocationParents,
): CreatorSummary[] {
  const byProfile = new Map(listings.map((l) => [refId(l.profile), l]))
  const result: CreatorSummary[] = []
  for (const profile of profiles) {
    const listing = byProfile.get(String(profile.id))
    if (!listing) continue
    const personaIds = (profile.personas ?? []).map(refId)
    if (!isPublic({ published: true, hasNewerDraft: false, personaIds }, listing)) continue
    result.push(toSummary(profile, listing, parents, profile.createdAt))
  }
  return result
}
