/** What starting a payment needs (research R2). The amount is the booking's own total, read on the server. */
export interface CheckoutInput {
  bookingId: number
  reference: string
  revision: number
  amountFils: number
  locale: 'en' | 'ar'
  successUrl: string
  cancelUrl: string
  expiresAt: Date
  /** The same key returns the same session if a request is retried. */
  idempotencyKey: string
}

export interface CheckoutSession {
  id: string
  url: string
  expiresAt: Date
}

/** A provider notice, once its signature checked out. */
export type PaymentEvent =
  | { type: 'paid'; sessionId: string; paymentRef: string; amountFils: number; currency: string; bookingId: number | null }
  | { type: 'expired'; sessionId: string }
  | { type: 'ignored' }

export interface PaymentProvider {
  name: 'stripe' | 'off' | 'fake'
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>
  /** `null` when the notice is not signed by the provider (or too old): refuse it (FR-010). */
  readEvent(rawBody: string, signature: string | null, now: Date): PaymentEvent | null
}

/** The provider refused or could not be reached. */
export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentProviderError'
  }
}
