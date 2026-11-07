import type { CreatorSummary } from '../creators/types'

/** What an intent page is about: who, what kind of job, where, and any other builder answers. */
export interface IntentKey {
  personaId?: string | null
  specialtyId?: string | null
  locationId?: string | null
  presets?: readonly { token?: string | null; value?: string | null }[] | null
}

/** An intent page needs at least one of persona, specialty or location to be about something. */
export const intentHasTarget = (i: IntentKey): boolean => Boolean(i.personaId || i.specialtyId || i.locationId)

/**
 * Two intent pages with the same fingerprint compete for the same search (spec US4-S5). The order of
 * the extra answers does not matter; empty ones do not count.
 */
export function intentFingerprint(i: IntentKey): string {
  const extra = (i.presets ?? [])
    .filter((p) => p.token && p.value)
    .map((p) => `${p.token}=${p.value}`)
    .sort()
  return [i.personaId ?? '', i.specialtyId ?? '', i.locationId ?? '', ...extra].join('|')
}

type Matchable = Pick<CreatorSummary, 'personaIds' | 'specialtyIds' | 'locationIds' | 'emirateIds'>

/** Whether a creator fits the page: every part the page names must match (a city or its emirate for the place). */
export function matchesIntent(creator: Matchable, i: IntentKey): boolean {
  return (
    (!i.personaId || creator.personaIds.includes(i.personaId)) &&
    (!i.specialtyId || creator.specialtyIds.includes(i.specialtyId)) &&
    (!i.locationId || creator.locationIds.includes(i.locationId) || creator.emirateIds.includes(i.locationId))
  )
}

type Ref = string | number | { id?: string | number | null } | null | undefined
const refId = (value: Ref): string | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value.id === null || value.id === undefined ? null : String(value.id)
  return String(value)
}

export interface IntentPageLike {
  id: string | number
  intent?: { persona?: Ref; specialty?: Ref; location?: Ref; presets?: IntentKey['presets'] } | null
}

/** The other intent pages that are about exactly the same thing (spec US4-S5). */
export function similarIntents<T extends IntentPageLike>(pages: readonly T[], key: IntentKey, excludeId?: string | number | null): T[] {
  const mine = intentFingerprint(key)
  return pages.filter(
    (p) =>
      String(p.id) !== String(excludeId ?? '') &&
      intentFingerprint({ personaId: refId(p.intent?.persona), specialtyId: refId(p.intent?.specialty), locationId: refId(p.intent?.location), presets: p.intent?.presets }) === mine,
  )
}
