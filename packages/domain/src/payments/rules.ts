/**
 * Online payment rules (feature 020). The amount is always the booking's own total on the server; a payment
 * the booking does not expect is still recorded (money arrived) but never moves the booking.
 */

export interface PayableBooking {
  state: string
  /** The current quotation's total, in fils (1 AED = 100 fils). */
  totalFils: number | null | undefined
}

/** FR-001, FR-004: only a confirmed booking with something to pay offers "Pay". */
export function onlinePaymentAllowed(booking: PayableBooking): boolean {
  return booking.state === 'confirmed' && typeof booking.totalFils === 'number' && booking.totalFils > 0
}

export type PaymentOutcome = { outcome: 'apply' } | { outcome: 'attention'; reason: 'state' | 'currency' | 'amount' }

/** FR-007, FR-009: apply only the expected payment; anything else is held for the team to check. */
export function paymentOutcome(booking: PayableBooking, paid: { amountFils: number; currency: string }): PaymentOutcome {
  if (booking.state !== 'confirmed') return { outcome: 'attention', reason: 'state' }
  if (paid.currency.toLowerCase() !== 'aed') return { outcome: 'attention', reason: 'currency' }
  if (paid.amountFils !== booking.totalFils) return { outcome: 'attention', reason: 'amount' }
  return { outcome: 'apply' }
}

/** Payment records keep AED with two decimals. */
export function filsToAed(fils: number): number {
  return Math.round(fils) / 100
}
