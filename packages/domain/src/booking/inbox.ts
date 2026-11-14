import type { Assignment } from './assignments'
import { daysBetween, toDubaiDay } from './dates'
import { matchCreators, type MatchCandidate, type MatchFilter } from './matching'

/**
 * The creator brief inbox (feature 019): which client briefs are still open, which a creator matches
 * (the Quick Match step 2 rules, research R1), how the inbox is ordered, and how creators who said yes
 * are carried into step 2 and the booking (research R5).
 */

/** A brief as the inbox reads it. Dates are Dubai days (`YYYY-MM-DD`); `createdAt` is an ISO time. */
export interface InboxBrief {
  id: string
  status: string
  personaIds: readonly string[]
  emirateId: string | null
  date: string | null
  createdAt: string
  /** Sent to one creator from their profile: only they see it. */
  namedCreatorId: string | null
  filters: readonly MatchFilter[]
  categoryId: string | null
  /** States of the bookings made from this brief. */
  bookingStates: readonly string[]
}

/** Booking states that leave a brief open: a quotation not yet accepted, or one that expired. */
const STILL_OPEN: readonly string[] = ['quoted', 'expired']

/** Open = new, not yet booked (past a quotation), and dated today or later, or sent within `inboxDays` when undated. */
export function isBriefOpen(brief: Pick<InboxBrief, 'status' | 'date' | 'createdAt' | 'bookingStates'>, window: { today: string; inboxDays: number }): boolean {
  if (brief.status !== 'new') return false
  if (brief.bookingStates.some((s) => !STILL_OPEN.includes(s))) return false
  if (brief.date) return brief.date >= window.today
  return daysBetween(toDubaiDay(brief.createdAt), window.today) <= window.inboxDays
}

/**
 * The brief's professional types this creator matches, in the brief's order (empty: no match). A named
 * brief matches only its creator, on the types they offer; any other brief uses `matchCreators`.
 * `blockedDays` are the days this creator is not free.
 */
export function briefMatchesCreator(candidate: MatchCandidate, brief: Pick<InboxBrief, 'personaIds' | 'emirateId' | 'date' | 'namedCreatorId' | 'filters'>, blockedDays: ReadonlySet<string>): string[] {
  if (brief.namedCreatorId) {
    return brief.namedCreatorId === candidate.id ? brief.personaIds.filter((p) => candidate.personaIds.includes(p)) : []
  }
  const blocked = brief.date && blockedDays.has(brief.date) ? new Set([candidate.id]) : new Set<string>()
  return brief.personaIds.filter((personaId) => matchCreators([candidate], { personaId, emirateId: brief.emirateId, blocked, filters: brief.filters }).length > 0)
}

export interface InboxAnswer {
  decision: 'accepted' | 'rejected'
  answeredAt: string
  withdrawnAt?: string | null
}

/** One row of a creator's inbox, before it is turned into a view. */
export interface InboxEntry {
  ref: string
  date: string | null
  createdAt: string
  /** The brief's occasion specialty is one of the creator's (ranks, never filters). */
  specialtyMatch: boolean
  answer: InboxAnswer | null
}

const current = (a: InboxAnswer | null) => (a && !a.withdrawnAt ? a : null)

/** Open (soonest date, then matching specialty, then newest; undated last), then the creator's current answers, newest first. */
export function inboxSections<T extends InboxEntry>(entries: readonly T[]): { open: T[]; accepted: T[]; rejected: T[] } {
  const open = entries
    .filter((e) => !current(e.answer))
    .sort(
      (a, b) =>
        (a.date ?? '9999').localeCompare(b.date ?? '9999') ||
        Number(b.specialtyMatch) - Number(a.specialtyMatch) ||
        b.createdAt.localeCompare(a.createdAt),
    )
  const answered = (decision: InboxAnswer['decision']) =>
    entries.filter((e) => current(e.answer)?.decision === decision).sort((a, b) => b.answer!.answeredAt.localeCompare(a.answer!.answeredAt))
  return { open, accepted: answered('accepted'), rejected: answered('rejected') }
}

/** Creators who said yes first, each group keeping the matching order (step 2, US2-S3). */
export function acceptorsFirst<T extends { id: string }>(creators: readonly T[], acceptedIds: ReadonlySet<string>): T[] {
  return [...creators.filter((c) => acceptedIds.has(c.id)), ...creators.filter((c) => !acceptedIds.has(c.id))]
}

/**
 * When the client accepts the quotation: a pending row whose creator accepted the brief for that type
 * starts confirmed (US2-S4). The caller still blocks the day and reverts a row whose day is taken.
 */
export function preconfirm(
  list: readonly Assignment[],
  acceptedByPersona: ReadonlyMap<string, ReadonlySet<string>>,
  now: Date,
): { assignments: Assignment[]; confirmed: { personaId: string; creatorId: string }[] } {
  const confirmed: { personaId: string; creatorId: string }[] = []
  const assignments = list.map((a) => {
    if (a.status !== 'pending' || !a.creatorId || !acceptedByPersona.get(a.personaId)?.has(a.creatorId)) return a
    confirmed.push({ personaId: a.personaId, creatorId: a.creatorId })
    return { ...a, status: 'confirmed' as const, respondedAt: now.toISOString() }
  })
  return { assignments, confirmed }
}
