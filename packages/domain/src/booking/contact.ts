import { normaliseE164 } from '../contact/whatsapp'
import type { AssignmentStatus } from './assignments'
import type { BookingState } from './states'

/**
 * Feature 025: when the client and the booked creators see each other's number. From Paid (the owner,
 * 2026-11-18: "show contact only after paid, not confirmed") until the work is delivered; not before, not
 * once it is over, and not while it is on hold (the team handles a reported problem).
 */
export const CONTACT_STATES: readonly BookingState[] = ['paid', 'scheduled', 'delivered']

/** The client sees the booked creators' contact (FR-001). */
export function sharesContact(state: BookingState): boolean {
  return CONTACT_STATES.includes(state)
}

/** A creator sees the client's contact only when their own part of the booking is confirmed. */
export function creatorSeesClient(state: BookingState, assignment: AssignmentStatus): boolean {
  return sharesContact(state) && assignment === 'confirmed'
}

/** Bookings listed as "Confirmed": agreed and still ahead (US3). */
export const CONFIRMED_STATES: readonly BookingState[] = ['confirmed', 'paid', 'scheduled']

export function isConfirmedBooking(state: BookingState): boolean {
  return CONFIRMED_STATES.includes(state)
}

/**
 * A number grouped for reading: `+971 50 123 4567` for a UAE mobile, `+CC` and groups of three and four
 * otherwise. `null` when it is not an international number (so nothing is shown).
 */
export function formatPhone(value: string | null | undefined): string | null {
  const e164 = value ? normaliseE164(value) : null
  if (!e164) return null
  const uae = /^\+971(5\d)(\d{3})(\d{4})$/.exec(e164)
  if (uae) return `+971 ${uae[1]} ${uae[2]} ${uae[3]}`
  const digits = e164.slice(1)
  const tail = digits.slice(-7)
  return `+${digits.slice(0, -7)} ${tail.slice(0, 3)} ${tail.slice(3)}`
}

/** The verified number as a contact, or `null` when there is none to show (FR-002). */
export function contactNumber(value: string | null | undefined): { phone: string; display: string } | null {
  const phone = value ? normaliseE164(value) : null
  const display = formatPhone(phone)
  return phone && display ? { phone, display } : null
}
