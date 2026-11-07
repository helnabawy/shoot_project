export type PaymentKind = 'received' | 'payout' | 'refund'

/** Money held for a booking: received from the client, not yet released to the creator or refunded (FR-007). */
export function heldAmount(payments: readonly { kind: PaymentKind; amount: number }[]): number {
  return payments.reduce((sum, p) => sum + (p.kind === 'received' ? p.amount : -p.amount), 0)
}

/** Which payment records an admin may add in each booking state. */
export function paymentAllowed(kind: PaymentKind, state: string): boolean {
  if (kind === 'received') return state === 'confirmed'
  if (kind === 'payout') return state === 'completed'
  return state === 'cancelled' || state === 'on-hold'
}
