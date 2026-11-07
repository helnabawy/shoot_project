import { addDays, daysBetween } from './dates'

/** The fields of a public creator summary that matching reads. */
export interface MatchCandidate {
  id: string
  personaIds: readonly string[]
  emirateIds: readonly string[]
  specialtyIds: readonly string[]
  matchValues?: readonly string[]
}

/** A brief slot that narrows the creators (e.g. "shot by"), as configured in the content area. */
export interface MatchFilter {
  value: string
  /** The option means "no preference" (e.g. "anyone"). */
  matchesAny: boolean
}

export interface MatchInput {
  personaId: string
  emirateId: string | null
  /** Creators not free that day (blocked or already booked). Ignored when the brief has no date. */
  blocked: ReadonlySet<string>
  filters?: readonly MatchFilter[]
  /** The occasion's specialty, if the content area links one: ranks, never filters (research §5). */
  categoryId?: string | null
}

/** Creators who offer the type, serve the emirate, are free and satisfy every filtering slot (FR-002). */
export function matchCreators<T extends MatchCandidate>(creators: readonly T[], input: MatchInput): T[] {
  const filters = (input.filters ?? []).filter((f) => !f.matchesAny && f.value)
  const matches = creators.filter(
    (c) =>
      c.personaIds.includes(input.personaId) &&
      (input.emirateId === null || c.emirateIds.includes(input.emirateId)) &&
      !input.blocked.has(c.id) &&
      filters.every((f) => (c.matchValues ?? []).includes(f.value)),
  )
  if (!input.categoryId) return matches
  const category = input.categoryId
  return [...matches.filter((c) => c.specialtyIds.includes(category)), ...matches.filter((c) => !c.specialtyIds.includes(category))]
}

/**
 * Up to `max` other dates within `span` days that someone is free on (US1-S2): nearest first, the later
 * date first on a tie (a client who wanted the 10th would rather wait than move earlier), never before today.
 */
export function nearbyDates(date: string, isFree: (day: string) => boolean, options: { today: string; span?: number; max?: number }): string[] {
  const span = options.span ?? 7
  const max = options.max ?? 3
  const found: string[] = []
  for (let distance = 1; distance <= span && found.length < max; distance += 1) {
    for (const day of [addDays(date, distance), addDays(date, -distance)]) {
      if (found.length >= max) break
      if (daysBetween(options.today, day) < 0) continue
      if (isFree(day)) found.push(day)
    }
  }
  return found
}
