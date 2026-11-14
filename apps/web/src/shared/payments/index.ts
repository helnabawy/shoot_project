import { paymentProviderOf, type Env } from '@/shared/lib/env'
import { stripeProvider } from './stripe'
import { PaymentProviderError, type PaymentProvider } from './types'

export type { CheckoutInput, CheckoutSession, PaymentEvent, PaymentProvider } from './types'
export { PaymentProviderError } from './types'

/** Switched off: no checkout can start and no notice is accepted; today's WhatsApp receipt flow applies. */
export const offProvider: PaymentProvider = {
  name: 'off',
  createCheckout: async () => {
    throw new PaymentProviderError('off')
  },
  readEvent: () => null,
}

let cached: PaymentProvider | undefined
let override: PaymentProvider | undefined

/** Integration tests swap in a fake provider; `undefined` restores the configured one. */
export function setPaymentProvider(provider: PaymentProvider | undefined): void {
  override = provider
}

/** The provider `PAYMENT_PROVIDER` names; unset, `stripe` when a Stripe secret key is set, else `off` (R8). */
export function getPaymentProvider(e: Pick<Env, 'PAYMENT_PROVIDER' | 'STRIPE_SECRET_KEY' | 'STRIPE_WEBHOOK_SECRET'>): PaymentProvider {
  if (override) return override
  if (cached) return cached
  cached = paymentProviderOf(e) === 'stripe' ? stripeProvider({ secretKey: e.STRIPE_SECRET_KEY ?? '', webhookSecret: e.STRIPE_WEBHOOK_SECRET ?? '' }) : offProvider
  return cached
}
