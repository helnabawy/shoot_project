/** The content half of a creator profile, as far as visibility rules care (data-model.md). */
export interface ProfileState {
  /** The profile has a published version. */
  published: boolean
  /** A draft newer than the published version exists. */
  hasNewerDraft: boolean
  /** Professional types the creator offers (persona ids). */
  personaIds: string[]
}

/** The profile's standing: changes at once and never publishes pending edits (research §18). */
export interface ListingState {
  /** The provider's pause switch: false hides the profile everywhere. */
  active: boolean
  /** Admin suspension: hides a published profile at once. */
  suspended: boolean
  featured?: boolean
  submittedAt?: string | null
  verifiedAt?: string | null
}

export type ProfileStatus = 'draft' | 'in-review' | 'live' | 'live-with-changes' | 'paused' | 'suspended'

/** Lightweight public record the directory, network block and specialty pages are computed from. */
export interface CreatorSummary {
  id: string
  /** Stored code, no prefix. */
  code: string
  displayName: string
  bio: string
  photo: { url: string; alt: string; width?: number; height?: number } | null
  personaIds: string[]
  specialtyIds: string[]
  /** Cities and their emirates. */
  locationIds: string[]
  emirateIds: string[]
  languages: string[]
  /** Samples per specialty (category id → rows), and in total; counts only, to keep the cached list small. */
  sampleCounts: Record<string, number>
  sampleCount: number
  featured: boolean
  /** ISO date of the first publication; drives newest-first ordering. */
  publishedAt: string
  /** Option values the creator satisfies for brief slots that filter creators (feature 003, research §5). */
  matchValues?: string[]
}

export interface DirectoryFilters {
  personaId?: string
  specialtyId?: string
  emirateId?: string
}

export interface FacetCounts {
  personas: Record<string, number>
  specialties: Record<string, number>
  emirates: Record<string, number>
}
