import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')
const { runBookingClock } = await import('@/modules/booking/clock')
const { GET } = await import('@/app/(payload)/api/cron/bookings/route')

const DAY = 24 * 3600 * 1000

describe('QM-US3 the booking clock', () => {
  let world: BookingWorld
  let n = 0
  const quoted = async () => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: ['event', 'portrait', 'clinic', 'car', 'property', 'products'][n++ % 6]! })
    const q = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    return (await bookingByRef(await getTestPayload(), q.ref)).id
  }
  const at = (id: number) => getTestPayload().then((p) => p.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true }))

  beforeAll(async () => {
    world = await bookingWorld()
  })

  it('edge: a quotation never accepted expires when its validity ends; a second run changes nothing', async () => {
    const id = await quoted()
    const payload = await getTestPayload()
    expect((await runBookingClock(payload, new Date(Date.now() + 6 * DAY))).expired).toBe(0)
    expect((await runBookingClock(payload, new Date(Date.now() + 8 * DAY))).expired).toBeGreaterThanOrEqual(1)
    expect((await at(id)).state).toBe('expired')
    expect((await notificationsOf(payload, id)).some((x) => x.event === 'expired' && x.audience === 'client')).toBe(true)
    expect((await runBookingClock(payload, new Date(Date.now() + 8 * DAY))).expired).toBe(0)
  })

  it('QM-US3-S2 edge: an unanswered request lapses after the window and the client is told', async () => {
    const id = await quoted()
    const payload = await getTestPayload()
    await applyTransition(payload, id, 'accept', { actor: 'client', now: new Date(), data: { assignments: (await at(id)).assignments!.map((a) => ({ ...a, respondBy: new Date(Date.now() + DAY).toISOString() })) } as never })
    await runBookingClock(payload, new Date(Date.now() + 2 * DAY))
    const booking = await at(id)
    expect(booking.state).toBe('accepted')
    expect(booking.assignments?.[0]?.status).toBe('lapsed')
    expect((await notificationsOf(payload, id)).some((x) => x.event === 'lapsed' && x.audience === 'client')).toBe(true)
  })

  it('QM-US3-S3 a paid booking becomes scheduled on the shoot day (UAE)', async () => {
    const id = await quoted()
    const payload = await getTestPayload()
    for (const event of ['accept', 'confirm', 'pay'] as const) await applyTransition(payload, id, event, { actor: event === 'accept' ? 'client' : 'admin', now: new Date() })
    await runBookingClock(payload, new Date(`${addDays(world.date, -1)}T12:00:00Z`))
    expect((await at(id)).state).toBe('paid')
    await runBookingClock(payload, new Date(`${world.date}T00:30:00+04:00`))
    expect((await at(id)).state).toBe('scheduled')
  })

  it('admins hear once about deliveries the client has not confirmed within the window', async () => {
    const id = await quoted()
    const payload = await getTestPayload()
    for (const event of ['accept', 'confirm', 'pay', 'schedule', 'deliver'] as const) await applyTransition(payload, id, event, { actor: event === 'accept' ? 'client' : 'admin', now: new Date() })
    const later = new Date(Date.now() + 8 * DAY)
    expect((await runBookingClock(payload, later)).overdueDeliveries).toBe(1)
    expect((await runBookingClock(payload, later)).overdueDeliveries).toBe(0)
    expect((await notificationsOf(payload, id)).filter((x) => x.event === 'delivery-overdue')).toHaveLength(1)
  })

  it('the cron route needs the bearer secret', async () => {
    expect((await GET(new Request('http://x/api/cron/bookings'))).status).toBe(401)
    const ok = await GET(new Request('http://x/api/cron/bookings', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ expired: expect.any(Number), lapsed: expect.any(Number), scheduled: expect.any(Number), overdueDeliveries: expect.any(Number) })
  })
})
