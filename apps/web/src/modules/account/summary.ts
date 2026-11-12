import { bookingStatus, type AccountBookingRow } from '@shoot/domain/account'
import type { BookingSummaryV1, BriefSummaryV1 } from '@shoot/domain/api/v1'
import { effectiveState, type BookingState } from '@shoot/domain/booking'
import type { Booking, Brief } from '@/payload-types'

/** A booking as read for the account: the wire summary plus what the ranking rules need. */
export interface AccountBooking {
  summary: BookingSummaryV1
  row: AccountBookingRow
  briefId: string | null
  /** Where it stands for the shoot day filter. */
  date: string | null
}

const label = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

/** The label the brief recorded for a token ("an event", "Dubai"), in the language it was written in. */
function selected(brief: Brief | null, token: string): string | null {
  const s = (brief?.selections ?? []).find((x) => x.token === token)
  return label(s?.label) ?? label(s?.value)
}

/**
 * One booking as the client reads it (feature 013, FR-011): the status words' key from the effective
 * state (an expired quotation already reads `expired`), occasion and place from the recorded brief,
 * the professionals' names, the price when set. Only these fields leave the server.
 */
export function toAccountBooking(booking: Booking, now: Date): AccountBooking {
  const state = effectiveState({ state: booking.state as BookingState, validUntil: booking.quoteValidUntil ?? null }, now)
  const assignments = booking.assignments ?? []
  const declined = assignments.some((a) => a.status === 'declined' || a.status === 'lapsed')
  const brief = typeof booking.brief === 'object' && booking.brief !== null ? booking.brief : null
  const names = assignments.flatMap((a) => (typeof a.creator === 'object' && a.creator !== null ? [label(a.creator.displayName)] : [])).filter((n): n is string => n !== null)
  const status = bookingStatus(state, declined)
  const date = booking.date ?? null
  return {
    summary: {
      reference: booking.reference,
      status,
      occasion: selected(brief, 'occasion'),
      place: label(booking.location) ? (selected(brief, 'location') ?? booking.location ?? null) : null,
      date,
      startTime: null,
      professional: names.length ? names.join(', ') : null,
      totalFils: typeof booking.totalFils === 'number' ? booking.totalFils : null,
    },
    row: { reference: booking.reference, status, validUntil: booking.quoteValidUntil ?? null, date },
    briefId: brief ? String(brief.id) : typeof booking.brief === 'number' ? String(booking.brief) : null,
    date,
  }
}

export function toBriefSummary(brief: Brief, bookingReference: string | null): BriefSummaryV1 {
  return {
    reference: brief.reference ?? String(brief.id),
    sentence: brief.sentence ?? '',
    sentAt: new Date(brief.createdAt).toISOString(),
    status: brief.status === 'contacted' || brief.status === 'closed' ? brief.status : 'new',
    bookingReference,
  }
}
