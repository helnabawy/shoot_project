import type { ListingState, ProfileState, ProfileStatus } from './types'

/** What the provider (and the admin list) sees; the first matching row of the data-model table wins. */
export function profileStatus(profile: ProfileState, listing: ListingState): ProfileStatus {
  if (listing.suspended) return 'suspended'
  if (!listing.active) return 'paused'
  if (profile.published) return profile.hasNewerDraft ? 'live-with-changes' : 'live'
  return listing.submittedAt ? 'in-review' : 'draft'
}
