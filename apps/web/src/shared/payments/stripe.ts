import { createHmac, timingSafeEqual } from 'node:crypto'
import { PaymentProviderError, type CheckoutInput, type CheckoutSession, type PaymentEvent, type PaymentProvider } from './types'

/**
 * Stripe Checkout through its REST API with platform primitives only (research R1): one form-encoded call to
 * create a session, and the webhook signature checked with HMAC-SHA256. Keys and card details are never logged.
 */

type Fetch = typeof fetch

const API = 'https://api.stripe.com/v1/checkout/sessions'
/** Stripe's default: a notice older than five minutes may be a replay. */
const TOLERANCE_SECONDS = 300

export function stripeProvider(options: { secretKey: string; webhookSecret: string; fetch?: Fetch; log?: (line: string) => void }): PaymentProvider {
  const doFetch = options.fetch ?? fetch
  const log = options.log ?? ((line: string) => console.warn(line))

  function verified(rawBody: string, header: string | null, now: Date): boolean {
    if (!header) return false
    const parts = header.split(',').map((p) => p.trim().split('='))
    const t = Number(parts.find(([k]) => k === 't')?.[1])
    const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '')
    if (!Number.isFinite(t) || !signatures.length) return false
    if (Math.abs(now.getTime() / 1000 - t) > TOLERANCE_SECONDS) return false
    const expected = Buffer.from(createHmac('sha256', options.webhookSecret).update(`${t}.${rawBody}`).digest('hex'))
    return signatures.some((s) => {
      const given = Buffer.from(s)
      return given.length === expected.length && timingSafeEqual(given, expected)
    })
  }

  return {
    name: 'stripe',

    async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
      const meta = { booking: String(input.bookingId), revision: String(input.revision), reference: input.reference }
      const form = new URLSearchParams({
        mode: 'payment',
        'line_items[0][price_data][currency]': 'aed',
        'line_items[0][price_data][unit_amount]': String(input.amountFils),
        'line_items[0][price_data][product_data][name]': `Booking ${input.reference}`,
        'line_items[0][quantity]': '1',
        client_reference_id: String(input.bookingId),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        // Stripe chooses Arabic from the browser where it offers it.
        locale: input.locale === 'ar' ? 'auto' : 'en',
        expires_at: String(Math.floor(input.expiresAt.getTime() / 1000)),
      })
      for (const [k, v] of Object.entries(meta)) {
        form.set(`metadata[${k}]`, v)
        form.set(`payment_intent_data[metadata][${k}]`, v)
      }
      let res: Response
      try {
        res = await doFetch(API, {
          method: 'POST',
          headers: { authorization: `Bearer ${options.secretKey}`, 'content-type': 'application/x-www-form-urlencoded', 'idempotency-key': input.idempotencyKey },
          body: form.toString(),
        })
      } catch {
        log('[payments] stripe unreachable')
        throw new PaymentProviderError('unreachable')
      }
      if (!res.ok) {
        log(`[payments] stripe refused the checkout: ${res.status}`)
        throw new PaymentProviderError(`refused ${res.status}`)
      }
      const json = (await res.json()) as { id: string; url: string; expires_at: number }
      return { id: json.id, url: json.url, expiresAt: new Date(json.expires_at * 1000) }
    },

    readEvent(rawBody: string, signature: string | null, now: Date): PaymentEvent | null {
      if (!verified(rawBody, signature, now)) return null
      let event: { type?: string; data?: { object?: Record<string, unknown> } }
      try {
        event = JSON.parse(rawBody) as typeof event
      } catch {
        return { type: 'ignored' }
      }
      const object = event.data?.object ?? {}
      const id = String(object.id ?? '')
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          if (object.payment_status !== 'paid') return { type: 'ignored' }
          const booking = Number((object.metadata as Record<string, string> | undefined)?.booking)
          return {
            type: 'paid',
            sessionId: id,
            paymentRef: typeof object.payment_intent === 'string' ? object.payment_intent : id,
            amountFils: Number(object.amount_total),
            currency: String(object.currency ?? ''),
            bookingId: Number.isInteger(booking) && booking > 0 ? booking : null,
          }
        }
        case 'checkout.session.expired':
          return { type: 'expired', sessionId: id }
        default:
          return { type: 'ignored' }
      }
    },
  }
}
