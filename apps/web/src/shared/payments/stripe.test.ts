import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { stripeProvider } from './stripe'
import { PaymentProviderError } from './types'

const SECRET = 'whsec_test_secret'
const now = new Date('2026-11-14T10:00:00Z')
const at = Math.floor(now.getTime() / 1000)
const sign = (body: string, t = at, secret = SECRET) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`

const input = {
  bookingId: 14,
  reference: 'Q-AAKMJ',
  revision: 3,
  amountFils: 155000,
  locale: 'en' as const,
  successUrl: 'https://shoot.ae/q/Q-AAKMJ/k?payment=done',
  cancelUrl: 'https://shoot.ae/q/Q-AAKMJ/k?payment=cancelled',
  expiresAt: new Date('2026-11-14T11:00:00Z'),
  idempotencyKey: 'checkout-14-3-155000-1',
}

describe('PY-US1-S2 the Stripe checkout for a booking', () => {
  it('asks Stripe for one AED line of the server-held total, with the reference, language and return links', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', expires_at: 1763118000 }), { status: 200 }))
    const session = await stripeProvider({ secretKey: 'sk_test_1', webhookSecret: SECRET, fetch }).createCheckout(input)
    expect(session).toEqual({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', expiresAt: new Date(1763118000 * 1000) })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer sk_test_1')
    expect(new Headers(init.headers).get('idempotency-key')).toBe('checkout-14-3-155000-1')
    const form = new URLSearchParams(String(init.body))
    expect(form.get('mode')).toBe('payment')
    expect(form.get('line_items[0][price_data][currency]')).toBe('aed')
    expect(form.get('line_items[0][price_data][unit_amount]')).toBe('155000')
    expect(form.get('line_items[0][price_data][product_data][name]')).toBe('Booking Q-AAKMJ')
    expect(form.get('line_items[0][quantity]')).toBe('1')
    expect(form.get('client_reference_id')).toBe('14')
    expect(form.get('metadata[booking]')).toBe('14')
    expect(form.get('metadata[revision]')).toBe('3')
    expect(form.get('payment_intent_data[metadata][reference]')).toBe('Q-AAKMJ')
    expect(form.get('success_url')).toBe(input.successUrl)
    expect(form.get('cancel_url')).toBe(input.cancelUrl)
    expect(form.get('locale')).toBe('en')
    expect(form.get('expires_at')).toBe(String(Math.floor(input.expiresAt.getTime() / 1000)))
    // Methods come from the dashboard (cards, Apple Pay, Google Pay); none are forced here.
    expect([...form.keys()].some((k) => k.startsWith('payment_method_types'))).toBe(false)
  })

  it('an Arabic client gets the page in their browser language', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'cs', url: 'https://checkout.stripe.com/c', expires_at: 1 }), { status: 200 }))
    await stripeProvider({ secretKey: 'sk_test_1', webhookSecret: SECRET, fetch }).createCheckout({ ...input, locale: 'ar' })
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(new URLSearchParams(String(init.body)).get('locale')).toBe('auto')
  })

  it('a refusal or an unreachable Stripe is a provider error (no card detail is logged)', async () => {
    const refused = vi.fn(async () => new Response('{"error":{"message":"Invalid API Key"}}', { status: 401 }))
    await expect(stripeProvider({ secretKey: 'sk_test_1', webhookSecret: SECRET, fetch: refused }).createCheckout(input)).rejects.toBeInstanceOf(PaymentProviderError)
    const down = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    await expect(stripeProvider({ secretKey: 'sk_test_1', webhookSecret: SECRET, fetch: down }).createCheckout(input)).rejects.toBeInstanceOf(PaymentProviderError)
  })
})

describe('PY-US3-S5 only notices signed by Stripe are read', () => {
  const provider = stripeProvider({ secretKey: 'sk_test_1', webhookSecret: SECRET, fetch: vi.fn() })
  const completed = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 155000, currency: 'aed', metadata: { booking: '14' } } },
  })

  it('a signed, paid checkout is a payment of that amount for that booking', () => {
    expect(provider.readEvent(completed, sign(completed), now)).toEqual({ type: 'paid', sessionId: 'cs_test_1', paymentRef: 'pi_1', amountFils: 155000, currency: 'aed', bookingId: 14 })
  })

  it('no signature, a wrong secret, a changed body or an old timestamp: refused', () => {
    expect(provider.readEvent(completed, null, now)).toBeNull()
    expect(provider.readEvent(completed, sign(completed, at, 'whsec_other'), now)).toBeNull()
    expect(provider.readEvent(completed.replace('155000', '1'), sign(completed), now)).toBeNull()
    expect(provider.readEvent(completed, sign(completed, at - 301), now)).toBeNull()
    expect(provider.readEvent(completed, 'garbage', now)).toBeNull()
    expect(provider.readEvent(completed, `t=${at},v1=abc`, now)).toBeNull()
  })

  it('a second signature (secret rotation) is accepted when one matches', () => {
    const header = `${sign(completed, at, 'whsec_old')},v1=${createHmac('sha256', SECRET).update(`${at}.${completed}`).digest('hex')}`
    expect(provider.readEvent(completed, header, now)?.type).toBe('paid')
  })

  it('async success pays; an unpaid completion waits; expiry and other events are read as such', () => {
    const body = (type: string, object: Record<string, unknown>) => JSON.stringify({ type, data: { object } })
    const async = body('checkout.session.async_payment_succeeded', { id: 'cs_2', payment_status: 'paid', payment_intent: null, amount_total: 100, currency: 'aed', metadata: {} })
    expect(provider.readEvent(async, sign(async), now)).toEqual({ type: 'paid', sessionId: 'cs_2', paymentRef: 'cs_2', amountFils: 100, currency: 'aed', bookingId: null })
    const unpaid = body('checkout.session.completed', { id: 'cs_3', payment_status: 'unpaid' })
    expect(provider.readEvent(unpaid, sign(unpaid), now)).toEqual({ type: 'ignored' })
    const expired = body('checkout.session.expired', { id: 'cs_4' })
    expect(provider.readEvent(expired, sign(expired), now)).toEqual({ type: 'expired', sessionId: 'cs_4' })
    const other = body('charge.refunded', { id: 'ch_1' })
    expect(provider.readEvent(other, sign(other), now)).toEqual({ type: 'ignored' })
    expect(provider.readEvent('not json', sign('not json'), now)).toEqual({ type: 'ignored' })
  })
})
