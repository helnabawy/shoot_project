import type { BookingState } from '@shoot/domain/booking'
import type { ProfileStatus } from '@shoot/domain/creators'

/** Feature 019: open client briefs that match the creator, and the soonest one. */
export interface AccountBriefs {
  count: number
  soonest: { ref: string; profession: string; occasion: string; emirate: string; date: string | null; dateLabel?: string } | null
}

/** A client's booking, with its effective state (an expired quotation already reads `expired`). */
export interface AccountBooking {
  reference: string
  state: BookingState
  date: string | null
}

/** A booking assigned to the creator. */
export interface AccountJob {
  reference: string
  state: BookingState
  awaitingAnswer: boolean
  date: string
}

/** The one thing the account page puts first, with the one action that answers it. */
export type NextUp<J extends AccountJob = AccountJob, B extends AccountBooking = AccountBooking> =
  | { kind: 'answer'; count: number; job: J }
  | { kind: 'briefs'; count: number; brief: NonNullable<AccountBriefs['soonest']> }
  | { kind: 'profile'; status: ProfileStatus }
  | { kind: 'job'; job: J }
  | { kind: 'clear' }
  | { kind: 'quote'; booking: B }
  | { kind: 'booking'; booking: B }
  | { kind: 'brief' }

const CLOSED: readonly BookingState[] = ['delivered', 'completed', 'cancelled', 'expired']
const HIDDEN: readonly ProfileStatus[] = ['draft', 'in-review', 'paused', 'suspended']

const ahead = (date: string | null, today: string) => date !== null && date.slice(0, 10) >= today
const soonest = <T extends { date: string | null }>(rows: T[]) => [...rows].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]

/** Bookings still going somewhere: a quotation to answer, or a shoot on or after today. */
const openBookings = <B extends AccountBooking>(bookings: B[], today: string) =>
  bookings.filter((b) => b.state === 'quoted' || (!CLOSED.includes(b.state) && ahead(b.date, today)))
const upcomingJobs = <J extends AccountJob>(jobs: J[], today: string) => jobs.filter((j) => !j.awaitingAnswer && !CLOSED.includes(j.state) && ahead(j.date, today))

/**
 * What the account page leads with. A creator: requests waiting for an answer, then open briefs that match
 * them (019), then a profile the public cannot see, then the next job, else nothing waiting. A client: an open quotation, then the next booking,
 * else a new brief.
 */
export function pickNextUp<J extends AccountJob, B extends AccountBooking>(input: {
  today: string
  provider: boolean
  profileStatus: ProfileStatus | null
  jobs: J[]
  bookings: B[]
  /** 019: `null` or absent when the profile is not live. */
  briefs?: AccountBriefs | null
}): NextUp<J, B> {
  const { today, provider, profileStatus, jobs, bookings, briefs } = input
  if (provider) {
    const waiting = jobs.filter((j) => j.awaitingAnswer)
    if (waiting.length) return { kind: 'answer', count: waiting.length, job: soonest(waiting)! }
    if (briefs?.count && briefs.soonest) return { kind: 'briefs', count: briefs.count, brief: briefs.soonest }
    if (profileStatus && HIDDEN.includes(profileStatus)) return { kind: 'profile', status: profileStatus }
    const next = soonest(upcomingJobs(jobs, today))
    return next ? { kind: 'job', job: next } : { kind: 'clear' }
  }
  const open = openBookings(bookings, today)
  const quote = open.find((b) => b.state === 'quoted')
  if (quote) return { kind: 'quote', booking: quote }
  const next = soonest(open)
  return next ? { kind: 'booking', booking: next } : { kind: 'brief' }
}

/** The Bookings row's one-line status: what waits on you, else unread updates, else how many are open. */
export function placeStatus(input: { today: string; waiting: number; unread: number; jobs: AccountJob[]; bookings: AccountBooking[] }) {
  const { today, waiting, unread, jobs, bookings } = input
  if (waiting) return { key: 'waiting', count: waiting } as const
  if (unread) return { key: 'updates', count: unread } as const
  const count = upcomingJobs(jobs, today).length + openBookings(bookings, today).length
  return count ? ({ key: 'open', count } as const) : ({ key: 'none', count: 0 } as const)
}
