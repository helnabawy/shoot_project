import type { ListingState, ProfileState } from './types'

/** Reachable by direct link: published, not paused by the provider, not suspended by an admin. */
export function isPublic(profile: ProfileState, listing: ListingState): boolean {
  return profile.published && listing.active && !listing.suspended
}

/**
 * Shown in the directory, landing block, specialty pages and sitemap: public and at least one of
 * the creator's types is in the site's audience (resolveActivePersonas), so a new persona's
 * creators need no code change (CP-FR-009).
 */
export function isListed(profile: ProfileState, listing: ListingState, audiencePersonaIds: readonly string[]): boolean {
  if (!isPublic(profile, listing)) return false
  const audience = new Set(audiencePersonaIds.map(String))
  return profile.personaIds.some((id) => audience.has(String(id)))
}

/** The builder only offers audience personas, so only listed creators can be booked. */
export function canBook(profile: ProfileState, listing: ListingState, audiencePersonaIds: readonly string[]): boolean {
  return isListed(profile, listing, audiencePersonaIds)
}
