import type { BookingState } from '../booking/states'

/** A booking as the client reads it, in words the app keeps as labels (feature 013, FR-011). */
export const BOOKING_STATUSES = [
  'awaitingAcceptance',
  'waitingProfessional',
  'awaitingPayment',
  'paid',
  'scheduled',
  'delivered',
  'completed',
  'cancelled',
  'expired',
  'onHold',
  'declined',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

const BY_STATE: Record<BookingState, BookingStatus> = {
  quoted: 'awaitingAcceptance',
  accepted: 'waitingProfessional',
  confirmed: 'awaitingPayment',
  paid: 'paid',
  scheduled: 'scheduled',
  delivered: 'delivered',
  completed: 'completed',
  cancelled: 'cancelled',
  expired: 'expired',
  'on-hold': 'onHold',
}

/**
 * The client-facing status of a booking whose `state` is already effective (an expired quotation reads
 * `expired`). An accepted booking whose professional declined or let the request lapse reads `declined`.
 */
export function bookingStatus(state: BookingState, professionalDeclined: boolean): BookingStatus {
  return state === 'accepted' && professionalDeclined ? 'declined' : BY_STATE[state]
}
