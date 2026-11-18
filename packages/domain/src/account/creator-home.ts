import type { ProfileStatus } from '../creators/types'

/**
 * Feature 023, the creator home: what a signed-in creator answers first, and which home they see. The
 * inputs are already scoped to the creator and filtered by the existing rules (booking requests waiting
 * for them, open briefs that match them); nothing here decides who may see what.
 */

/** Rows shown under the card before the "See all" row. */
export const NEXT_LIMIT = 5

/** The fields the order needs; items carry whatever else the page shows. */
export interface HomeBookingItem {
  kind: 'booking'
  ref: string
  /** When the answer is due (ISO instant). */
  respondBy: string
}
export interface HomeBriefItem {
  kind: 'brief'
  ref: string
  /** When the client sent the brief (ISO instant). */
  sentAt: string
}

const byRef = (a: { ref: string }, b: { ref: string }) => a.ref.localeCompare(b.ref, 'en')

/** Booking requests first, nearest answer-by time first; then briefs, newest first. Ties by reference. */
export function buildQueue<B extends HomeBookingItem, R extends HomeBriefItem>(bookings: readonly B[], briefs: readonly R[]): (B | R)[] {
  const due = [...bookings].sort((a, b) => Date.parse(a.respondBy) - Date.parse(b.respondBy) || byRef(a, b))
  const sent = [...briefs].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt) || byRef(a, b))
  return [...due, ...sent]
}

export interface HomeCounts {
  toAnswer: number
  comingUp: number
  completed: number
}

export function homeCounts(queue: readonly unknown[], comingUp: number, completed: number): HomeCounts {
  return { toAnswer: queue.length, comingUp, completed }
}

export type HomeMode = 'live' | 'incomplete' | 'review' | 'paused'

/** Which home a creator sees, from their profile's status; no profile yet reads as incomplete. */
export function homeMode(status: ProfileStatus | null): HomeMode {
  switch (status) {
    case 'live':
    case 'live-with-changes':
      return 'live'
    case 'in-review':
      return 'review'
    case 'paused':
    case 'suspended':
      return 'paused'
    case 'draft':
    case null:
      return 'incomplete'
  }
}

export type TodayState = 'free' | 'blocked' | 'booked'

/** Today in the Availability row: the creator's own block or booking on that day, else free. */
export function todayState(days: readonly { date: string; state: 'blocked' | 'booked' }[], today: string): TodayState {
  return days.find((d) => d.date === today)?.state ?? 'free'
}
