import type { BookingStatus } from './status'

export type UpNextKind = 'quote' | 'delivery' | 'payment' | 'declined'

export interface AccountBookingRow {
  reference: string
  status: BookingStatus
  /** When a quotation stops being valid (ISO), used to rank quotations. */
  validUntil: string | null
  /** Shoot day, YYYY-MM-DD. */
  date: string | null
}

const KIND_BY_STATUS: Partial<Record<BookingStatus, UpNextKind>> = {
  awaitingAcceptance: 'quote',
  delivered: 'delivery',
  awaitingPayment: 'payment',
  declined: 'declined',
}

/** Most urgent first (FR-003). */
const ORDER: readonly UpNextKind[] = ['quote', 'delivery', 'payment', 'declined']

/** The kind of "needs the client" a booking is, or null. */
export const upNextKind = (status: BookingStatus): UpNextKind | null => KIND_BY_STATUS[status] ?? null

const LAST = '￿'

/** How many bookings wait for the client (the Bookings row, FR-004). */
export const waitingCount = (rows: readonly AccountBookingRow[]): number => rows.filter((r) => upNextKind(r.status) !== null).length

/**
 * The one booking Up next shows (FR-003): a quotation to accept (soonest expiry first), a delivery to
 * confirm, a booking awaiting payment, a booking whose professional declined; null when none.
 */
export function pickUpNext(rows: readonly AccountBookingRow[]): { kind: UpNextKind; reference: string } | null {
  for (const kind of ORDER) {
    const [first] = rows
      .filter((r) => upNextKind(r.status) === kind)
      .sort((a, b) => (kind === 'quote' ? (a.validUntil ?? LAST).localeCompare(b.validUntil ?? LAST) : (a.date ?? LAST).localeCompare(b.date ?? LAST)))
    if (first) return { kind, reference: first.reference }
  }
  return null
}

const CLOSED: readonly BookingStatus[] = ['delivered', 'completed', 'cancelled', 'expired', 'declined']

/** Bookings still going somewhere: awaiting acceptance, or not closed and on or after today. */
export function openCount(rows: readonly AccountBookingRow[], today: string): number {
  return rows.filter((r) => r.status === 'awaitingAcceptance' || (!CLOSED.includes(r.status) && (r.date === null || r.date >= today))).length
}

/** Upcoming (shoot day today or later, soonest first) and Past (the rest, most recent first), FR-011. */
export function splitBookings<T extends { date: string | null }>(rows: readonly T[], today: string): { upcoming: T[]; past: T[] } {
  const upcoming = rows.filter((r) => r.date === null || r.date >= today).sort((a, b) => (a.date ?? LAST).localeCompare(b.date ?? LAST))
  const past = rows.filter((r) => r.date !== null && r.date < today).sort((a, b) => (b.date as string).localeCompare(a.date as string))
  return { upcoming, past }
}
