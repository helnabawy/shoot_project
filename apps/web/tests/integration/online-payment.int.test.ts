import { createHmac } from 'node:crypto'
import { checkoutV1, problemV1 } from '@shoot/domain/api/v1'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as payRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/pay/route'
import { POST as webhook } from '@/app/(payload)/api/webhooks/stripe/route'
import type { RouteHandler } from '@/shared/api/handler'
import { stripeProvider } from '@/shared/payments/stripe'
import { bookingByRef, bookingWorld, briefFor, eventsOf, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')
const { getQuotationAccess } = await import('@/modules/booking/queries')
const { quotationView } = await import('@/modules/booking/commands/quotation-view')
const { startCheckout, recordPaymentEvent, setPaymentProvider, offProvider } = await import('@/modules/payments')

/** Feature 020: online payment for confirmed bookings, through Stripe's API (a fake network) and signed notices. */

const SECRET = 'whsec_integration'
let sessionNo = 0
const stripeCalls: URLSearchParams[] = []
const fakeFetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
  stripeCalls.push(new URLSearchParams(String(init?.body)))
  const id = `cs_test_${++sessionNo}`
  return new Response(JSON.stringify({ id, url: `https://checkout.stripe.com/c/pay/${id}`, expires_at: Math.floor(Date.now() / 1000) + 3600 }), { status: 200 })
})
const stripe = stripeProvider({ secretKey: 'sk_test_integration', webhookSecret: SECRET, fetch: fakeFetch as typeof fetch })

function signed(object: Record<string, unknown>, type = 'checkout.session.completed', secret = SECRET) {
  const body = JSON.stringify({ type, data: { object } })
  const t = Math.floor(Date.now() / 1000)
  const signature = `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`
  return new Request('http://test/api/webhooks/stripe', { method: 'POST', headers: { 'stripe-signature': signature, 'content-type': 'application/json' }, body })
}

const paidNotice = (sessionId: string, amountFils: number, paymentRef = `pi_${sessionId}`, currency = 'aed') =>
  signed({ id: sessionId, payment_status: 'paid', payment_intent: paymentRef, amount_total: amountFils, currency, metadata: {} })

function callPay(ref: string, key: string) {
  return (payRoute as RouteHandler)(
    new Request(`http://test/api/mobile/v1/quotations/${ref}/${key}/pay`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.20.${sessionNo % 250}.${Math.floor(Math.random() * 250)}` } }),
    { params: Promise.resolve({ ref, key }) },
  )
}

describe('020 online payment', () => {
  let world: BookingWorld
  let n = 0

  /** A booking the creator confirmed, with its private link. */
  const confirmedBooking = async (state: 'confirmed' | 'accepted' = 'confirmed') => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: ['event', 'portrait', 'clinic', 'car', 'property'][n++ % 5]! })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await applyTransition(payload, booking.id, 'accept', { actor: 'client', now: new Date() })
    if (state === 'confirmed') await applyTransition(payload, booking.id, 'confirm', { actor: 'admin', now: new Date() })
    const access = (await getQuotationAccess(q.ref, q.key))!
    return { id: booking.id, ref: q.ref, key: q.key, access, total: access.current.totalFils }
  }

  const start = async (b: Awaited<ReturnType<typeof confirmedBooking>>) =>
    startCheckout(await getTestPayload(), (await getQuotationAccess(b.ref, b.key))!, { locale: 'en', now: new Date(), returnPath: `/q/${b.ref}/${b.key}` })

  const sessionsOf = async (bookingId: number) =>
    (await (await getTestPayload()).find({ collection: 'payment-sessions', where: { booking: { equals: bookingId } }, sort: 'createdAt', depth: 0, overrideAccess: true })).docs

  const paymentsOf = async (bookingId: number) =>
    (await (await getTestPayload()).find({ collection: 'payments', where: { booking: { equals: bookingId } }, depth: 0, overrideAccess: true })).docs

  const stateOf = async (bookingId: number) => (await (await getTestPayload()).findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true })).state

  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => setPaymentProvider(stripe))
  afterAll(() => setPaymentProvider(undefined))

  describe('US1 the client pays a confirmed booking online', () => {
    it('PY-US1-S1 a confirmed booking offers Pay with its total; the app says so too', async () => {
      const b = await confirmedBooking()
      const view = await quotationView(b.access, { locale: 'en', now: new Date() })
      expect(view.canPayOnline).toBe(true)
      expect(view.nextStep).toBe('pay')
    })

    it('PY-US1-S2 Pay opens a checkout for the server-held total and the booking reference, and stores the attempt', async () => {
      const b = await confirmedBooking()
      const result = await start(b)
      expect(result).toMatchObject({ ok: true, url: expect.stringMatching(/^https:\/\/checkout\.stripe\.com\//) })
      const form = stripeCalls.at(-1)!
      expect(form.get('line_items[0][price_data][unit_amount]')).toBe(String(b.total))
      expect(form.get('line_items[0][price_data][product_data][name]')).toBe(`Booking ${b.ref}`)
      expect(form.get('success_url')).toMatch(new RegExp(`/q/${b.ref}/${b.key}\\?payment=done$`))
      expect(form.get('cancel_url')).toMatch(/\?payment=cancelled$/)
      const [session] = await sessionsOf(b.id)
      expect(session).toMatchObject({ status: 'open', amountFils: b.total, url: (result as { url: string }).url })
    })

    it('PY-US1-S2 the app asks the same through POST quotations/{ref}/{key}/pay', async () => {
      const b = await confirmedBooking()
      const res = await callPay(b.ref, b.key)
      expect(res.status, await res.clone().text()).toBe(200)
      expect(checkoutV1.parse(await res.json()).url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    })

    it('PY-US1-S3 a signed paid notice records one online payment, and the booking is paid with the usual notices', async () => {
      const b = await confirmedBooking()
      await start(b)
      const [session] = await sessionsOf(b.id)
      const res = await webhook(paidNotice(session!.providerSessionId, b.total, 'pi_us1_s3'))
      expect(res.status).toBe(200)
      expect(await stateOf(b.id)).toBe('paid')
      const payments = await paymentsOf(b.id)
      expect(payments).toHaveLength(1)
      expect(payments[0]).toMatchObject({ kind: 'received', amount: b.total / 100, method: 'card-online', source: 'online', providerRef: 'pi_us1_s3', recordedBy: null })
      expect((await sessionsOf(b.id))[0]).toMatchObject({ status: 'paid', paymentRef: 'pi_us1_s3' })
      const payload = await getTestPayload()
      expect((await eventsOf(payload, b.id)).at(-1)).toMatchObject({ event: 'pay', from: 'confirmed', to: 'paid', actorRole: 'system' })
      const paid = (await notificationsOf(payload, b.id)).filter((x) => x.event === 'paid').map((x) => x.audience)
      expect(new Set(paid)).toEqual(new Set(['client', 'creator']))
      // Paid: the quotation no longer offers Pay.
      expect((await quotationView((await getQuotationAccess(b.ref, b.key))!, { locale: 'en', now: new Date() })).canPayOnline).toBe(false)
    })

    it('PY-US1-S5 a left or expired checkout keeps the booking confirmed; Pay again reuses an open one, or starts a new one', async () => {
      const b = await confirmedBooking()
      const first = await start(b)
      const calls = fakeFetch.mock.calls.length
      expect(await start(b)).toEqual(first)
      expect(fakeFetch.mock.calls.length).toBe(calls)
      const [session] = await sessionsOf(b.id)
      expect((await webhook(signed({ id: session!.providerSessionId }, 'checkout.session.expired'))).status).toBe(200)
      expect((await sessionsOf(b.id))[0]!.status).toBe('expired')
      expect(await stateOf(b.id)).toBe('confirmed')
      const second = await start(b)
      expect(second).toMatchObject({ ok: true })
      expect(second).not.toEqual(first)
      expect(await sessionsOf(b.id)).toHaveLength(2)
    })

    it('PY-US1-S6 a booking that is not confirmed offers no Pay, and starting is refused (web and app)', async () => {
      const b = await confirmedBooking('accepted')
      expect((await quotationView(b.access, { locale: 'en', now: new Date() })).canPayOnline).toBe(false)
      expect(await start(b)).toEqual({ ok: false, reason: 'not-allowed' })
      const res = await callPay(b.ref, b.key)
      expect(res.status).toBe(409)
      expect(problemV1.parse(await res.json()).code).toBe('booking.errors.not-allowed')
      expect(await sessionsOf(b.id)).toHaveLength(0)
    })
  })

  describe('US3 the team keeps control', () => {
    it('PY-US3-S1 switched off: no Pay, starting is refused, notices are not read', async () => {
      setPaymentProvider(offProvider)
      const b = await confirmedBooking()
      expect((await quotationView(b.access, { locale: 'en', now: new Date() })).canPayOnline).toBe(false)
      expect(await start(b)).toEqual({ ok: false, reason: 'unavailable' })
      const res = await callPay(b.ref, b.key)
      expect(res.status).toBe(503)
      expect(problemV1.parse(await res.json()).code).toBe('payment.errors.unavailable')
      expect((await webhook(paidNotice('cs_off', b.total))).status).toBe(400)
    })

    it('PY-US3-S2 a payment recorded by hand still pays the booking; a later online payment waits for the team', async () => {
      const b = await confirmedBooking()
      await start(b)
      const payload = await getTestPayload()
      await payload.create({ collection: 'payments', data: { booking: b.id, kind: 'received', amount: b.total / 100, method: 'bank-transfer', note: 'TRX-9' }, user: world.admin, overrideAccess: false })
      expect(await stateOf(b.id)).toBe('paid')
      const [session] = await sessionsOf(b.id)
      expect((await webhook(paidNotice(session!.providerSessionId, b.total, 'pi_after_manual'))).status).toBe(200)
      expect(await stateOf(b.id)).toBe('paid')
      expect(await paymentsOf(b.id)).toHaveLength(2)
      const alerts = (await notificationsOf(payload, b.id)).filter((x) => x.event === 'payment-attention')
      expect(alerts.map((a) => a.audience)).toEqual(['admin'])
    })

    it('PY-US3-S3 an unexpected payment (cancelled booking, wrong amount) is recorded as held, the booking is unchanged, the team is alerted', async () => {
      const payload = await getTestPayload()
      const cancelled = await confirmedBooking()
      await start(cancelled)
      await applyTransition(payload, cancelled.id, 'cancel', { actor: 'admin', now: new Date() })
      const [s1] = await sessionsOf(cancelled.id)
      expect((await webhook(paidNotice(s1!.providerSessionId, cancelled.total, 'pi_cancelled'))).status).toBe(200)
      expect(await stateOf(cancelled.id)).toBe('cancelled')
      expect(await paymentsOf(cancelled.id)).toHaveLength(1)
      expect((await eventsOf(payload, cancelled.id)).at(-1)).toMatchObject({ event: 'payment-attention', actorRole: 'system' })
      expect((await notificationsOf(payload, cancelled.id)).some((x) => x.event === 'payment-attention' && x.audience === 'admin')).toBe(true)

      const short = await confirmedBooking()
      await start(short)
      const [s2] = await sessionsOf(short.id)
      expect((await webhook(paidNotice(s2!.providerSessionId, short.total - 100, 'pi_short'))).status).toBe(200)
      expect(await stateOf(short.id)).toBe('confirmed')
      expect((await paymentsOf(short.id))[0]).toMatchObject({ amount: (short.total - 100) / 100, source: 'online' })
      expect((await notificationsOf(payload, short.id)).some((x) => x.event === 'payment-attention')).toBe(true)
    })

    it('PY-US3-S4 the same notice twice records one payment and one set of notices', async () => {
      const b = await confirmedBooking()
      await start(b)
      const [session] = await sessionsOf(b.id)
      await webhook(paidNotice(session!.providerSessionId, b.total, 'pi_twice'))
      const payload = await getTestPayload()
      const before = (await notificationsOf(payload, b.id)).length
      const again = await recordPaymentEvent(payload, { type: 'paid', sessionId: session!.providerSessionId, paymentRef: 'pi_twice', amountFils: b.total, currency: 'aed', bookingId: null })
      expect(again).toBe('duplicate')
      expect((await webhook(paidNotice(session!.providerSessionId, b.total, 'pi_twice'))).status).toBe(200)
      expect(await paymentsOf(b.id)).toHaveLength(1)
      expect((await notificationsOf(payload, b.id)).length).toBe(before)
    })

    it('PY-US3-S5 a notice that is not signed by Stripe is refused and nothing is recorded', async () => {
      const b = await confirmedBooking()
      await start(b)
      const [session] = await sessionsOf(b.id)
      const forged = paidNotice(session!.providerSessionId, b.total)
      const unsigned = new Request(forged.url, { method: 'POST', body: await forged.clone().text() })
      expect((await webhook(unsigned)).status).toBe(400)
      expect((await webhook(signed({ id: session!.providerSessionId, payment_status: 'paid', payment_intent: 'pi_forged', amount_total: b.total, currency: 'aed' }, 'checkout.session.completed', 'whsec_wrong'))).status).toBe(400)
      expect(await paymentsOf(b.id)).toHaveLength(0)
      expect(await stateOf(b.id)).toBe('confirmed')
    })
  })
})
