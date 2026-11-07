import { heldAmount } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, eventsOf, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload, readable, rejectsWithKey } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')

describe('QM-US3-S3 / QM-FR-007 payments are recorded by hand', () => {
  let world: BookingWorld
  let n = 0
  const confirmed = async () => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: ['event', 'portrait', 'clinic', 'car', 'property'][n++ % 5]! })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await applyTransition(payload, booking.id, 'accept', { actor: 'client', now: new Date() })
    await applyTransition(payload, booking.id, 'confirm', { actor: 'admin', now: new Date() })
    return booking.id
  }
  const record = async (booking: number, kind: 'received' | 'payout' | 'refund', amount = 800) =>
    (await getTestPayload()).create({ collection: 'payments', data: { booking, kind, amount, method: 'bank-transfer', note: 'TRX-1' }, user: world.admin, overrideAccess: false, depth: 0 })

  beforeAll(async () => {
    world = await bookingWorld()
  })

  it('a received payment moves a confirmed booking to paid (held) and tells client and creator', async () => {
    const id = await confirmed()
    const payment = await record(id, 'received')
    expect(payment).toMatchObject({ recordedBy: world.admin.id, amount: 800 })
    const payload = await getTestPayload()
    const booking = await payload.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true })
    expect(booking.state).toBe('paid')
    expect(booking.paidAt).toBeTruthy()
    const audiences = (await notificationsOf(payload, id)).filter((x) => x.event === 'paid').map((x) => x.audience)
    expect(new Set(audiences)).toEqual(new Set(['client', 'creator']))
    expect((await eventsOf(payload, id)).at(-1)).toMatchObject({ event: 'pay', from: 'confirmed', to: 'paid', actorRole: 'admin', actor: world.admin.id })
  })

  it('payments are refused outside their state; held = received − payouts − refunds', async () => {
    const id = await confirmed()
    await rejectsWithKey(record(id, 'payout'), 'booking.errors.paymentState')
    await rejectsWithKey(record(id, 'refund'), 'booking.errors.paymentState')
    await record(id, 'received')
    await rejectsWithKey(record(id, 'received'), 'booking.errors.paymentState')
    const payload = await getTestPayload()
    await applyTransition(payload, id, 'cancel', { actor: 'admin', now: new Date() })
    await record(id, 'refund')
    const { docs } = await payload.find({ collection: 'payments', where: { booking: { equals: id } }, depth: 0, overrideAccess: true })
    expect(heldAmount(docs.map((p) => ({ kind: p.kind, amount: p.amount })))).toBe(0)
  })

  it('a payout is recorded once the booking is completed', async () => {
    const id = await confirmed()
    await record(id, 'received')
    const payload = await getTestPayload()
    for (const event of ['schedule', 'deliver', 'complete'] as const) await applyTransition(payload, id, event, { actor: 'admin', now: new Date() })
    await record(id, 'payout')
    expect((await eventsOf(payload, id)).at(-1)).toMatchObject({ event: 'payout', actorRole: 'admin' })
  })

  it('only admins may record or read payments', async () => {
    const id = await confirmed()
    const payload = await getTestPayload()
    await expect(payload.create({ collection: 'payments', data: { booking: id, kind: 'received', amount: 1, method: 'cash' }, user: world.creators.sara!.user, overrideAccess: false })).rejects.toThrow()
    expect(await readable(() => payload.find({ collection: 'payments', user: world.creators.sara!.user, overrideAccess: false }))).toBe(0)
  })
})
