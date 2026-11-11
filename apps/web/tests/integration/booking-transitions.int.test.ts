import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, eventsOf, notificationsOf, quoteFor, type BookingWorld } from './setup/booking'
import { listingOf } from './setup/creators'
import { asVisitor, form, jar, redirectOf, signIn } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const actions = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')

describe('QM-US2-S3 / QM-US3 booking transitions', () => {
  let world: BookingWorld
  let seq = 0
  const occasions = ['event', 'portrait', 'clinic', 'products', 'car', 'property', 'travel-lifestyle', 'social-media', 'food-drinks', 'music-entertainment', 'sport-fitness', 'aerial-drone', 'documentary-editorial', 'friends-party', 'family-newborn']
  /** A quoted booking for a creator (or "any"), from a fresh brief. */
  const quoted = async (pick = `photographer:${world.creators.sara!.code}`, over: Record<string, string> = {}) => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: occasions[seq++ % occasions.length]!, ...over })
    return quoteFor(actions.requestQuotation as never, b, { pick, ...over })
  }
  const access = (q: { ref: string; key: string }) => form({ locale: 'en', ref: q.ref, key: q.key })
  const accept = (q: { ref: string; key: string }) => redirectOf(() => actions.acceptQuotation(access(q)))
  const asCreator = async (key: string) => signIn((await getTestPayload()) as never, world.creators[key]!.user.email!)
  const respond = (bookingId: number, personaId: number, decision: 'confirm' | 'decline', reason?: string) =>
    redirectOf(() => actions.respondToAssignment(form({ locale: 'en', booking: bookingId, persona: personaId, decision, reason })))
  const state = async (ref: string) => (await bookingByRef(await getTestPayload(), ref)).state

  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => jar.clear())

  it('QM-US2-S3 accept → accepted, the window starts, both sides are notified', async () => {
    const q = await quoted()
    expect(await accept(q)).toBe(`/q/${q.ref}/${q.key}`)
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    expect(booking.state).toBe('accepted')
    expect(Date.parse(booking.assignments![0]!.respondBy!) - Date.parse(booking.acceptedAt!)).toBe(24 * 3600 * 1000)
    const audiences = (await notificationsOf(payload, booking.id)).filter((n) => n.event === 'accepted').map((n) => n.audience)
    expect(new Set(audiences)).toEqual(new Set(['client', 'creator', 'admin']))
    expect((await eventsOf(payload, booking.id)).map((e) => e.event)).toEqual(['quote', 'accept'])
  })

  it('edge: a double tap accepts once, writes one event and counts the promo once', async () => {
    const q = await quoted(`photographer:${world.creators.omar!.code}`, { promo: 'WELCOME20' })
    const [a, b] = await Promise.all([accept(q), accept(q)])
    expect([a, b]).toEqual([`/q/${q.ref}/${q.key}`, `/q/${q.ref}/${q.key}`])
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    expect(booking.state).toBe('accepted')
    expect((await eventsOf(payload, booking.id)).filter((e) => e.event === 'accept')).toHaveLength(1)
    const promo = (await payload.find({ collection: 'promo-codes', where: { code: { equals: 'WELCOME20' } }, depth: 0, overrideAccess: true })).docs[0]!
    expect(promo.usedCount).toBe(1)
  })

  it('QM-US2-S5 an expired quotation cannot be accepted; a fresh one comes from the same brief', async () => {
    const q = await quoted()
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await payload.update({ collection: 'bookings', id: booking.id, data: { quoteValidUntil: '2020-01-01T00:00:00.000Z' } as never, overrideAccess: true, context: { bookingTransition: true, ...quiet } })
    expect(await accept(q)).toBe(`/q/${q.ref}/${q.key}?error=booking.errors.expired-quotation`)
    expect(await state(q.ref)).toBe('quoted')
    const fresh = await redirectOf(() => actions.requestFreshQuotation(access(q)))
    expect(fresh).toMatch(new RegExp(`^/match/B-[A-Z0-9]{5}/[A-Za-z0-9_-]{43}/details\\?pick=photographer%3A${world.creators.sara!.code}$`))
  })

  it('edge: a creator unlisted after the quotation cannot be accepted and needs replacing', async () => {
    const q = await quoted(`photographer:${world.creators.omar!.code}`)
    const payload = await getTestPayload()
    const listing = await listingOf(world, world.creators.omar!.id)
    await payload.update({ collection: 'creator-listings', id: listing!.id, data: { active: false }, overrideAccess: true, context: quiet })
    expect(await accept(q)).toBe(`/q/${q.ref}/${q.key}?error=booking.errors.creatorUnavailable`)
    const booking = await bookingByRef(payload, q.ref)
    expect(booking.state).toBe('quoted')
    expect(booking.assignments?.[0]?.status).toBe('lapsed')
    await payload.update({ collection: 'creator-listings', id: listing!.id, data: { active: true }, overrideAccess: true, context: quiet })
  })

  it('QM-US3-S1 the creator confirms → confirmed, the date is booked, payment instructions show', async () => {
    const q = await quoted()
    await accept(q)
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await asCreator('sara')
    expect(await respond(booking.id, world.personas.photographer, 'confirm')).toBe('/account/bookings')
    const after = await bookingByRef(payload, q.ref)
    expect(after.state).toBe('confirmed')
    const blocks = await payload.find({ collection: 'availability-blocks', where: { booking: { equals: booking.id } }, depth: 0, overrideAccess: true })
    expect(blocks.docs).toMatchObject([{ kind: 'booking', date: world.date, creator: world.creators.sara!.id }])
    const { getQuotationAccess } = await import('@/modules/booking/queries')
    const { quotationView } = await import('@/modules/booking/views')
    const view = await quotationView((await getQuotationAccess(q.ref, q.key))!, { locale: 'en', key: q.key, now: new Date(), settings: await payload.findGlobal({ slug: 'site-settings', depth: 1 }), replacements: [], prefix: 'CR' })
    expect(view.status.payment?.receiptHref).toMatch(/^https:\/\/wa\.me\/\d+\?text=Payment%20receipt%20for%20Q-/)
    await payload.delete({ collection: 'availability-blocks', where: { booking: { equals: booking.id } }, overrideAccess: true })
  })

  it('another provider cannot answer; a second answer is refused', async () => {
    const q = await quoted()
    await accept(q)
    const booking = await bookingByRef(await getTestPayload(), q.ref)
    await asCreator('omar')
    expect(await respond(booking.id, world.personas.photographer, 'confirm')).toBe('/account/bookings?error=booking.errors.notYours')
    await asCreator('sara')
    await respond(booking.id, world.personas.photographer, 'decline', 'Busy that day')
    expect(await respond(booking.id, world.personas.photographer, 'confirm')).toBe('/account/bookings?error=booking.errors.not-pending')
  })

  it('QM-US3-S2 decline → the assignment is declined, the booking stays accepted, the client picks another at the same price', async () => {
    const q = await quoted()
    await accept(q)
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await asCreator('sara')
    await respond(booking.id, world.personas.photographer, 'decline', 'Busy that day')
    let after = await bookingByRef(payload, q.ref)
    expect(after.state).toBe('accepted')
    expect(after.assignments?.[0]).toMatchObject({ status: 'declined', declineReason: 'Busy that day' })
    expect((await notificationsOf(payload, booking.id)).some((n) => n.event === 'declined' && n.audience === 'client')).toBe(true)
    jar.clear()
    const back = await redirectOf(() => actions.pickAnotherCreator(form({ locale: 'en', ref: q.ref, key: q.key, persona: world.personas.photographer, code: world.creators.omar!.code })))
    expect(back).toBe(`/q/${q.ref}/${q.key}`)
    after = await bookingByRef(payload, q.ref)
    expect(after.assignments?.[0]).toMatchObject({ creator: world.creators.omar!.id, status: 'pending' })
    expect(after.totalFils).toBe(booking.totalFils)
  })

  it('edge: two bookings for one creator and date — the first confirmation wins', async () => {
    const a = await quoted(`photographer:${world.creators.omar!.code}`)
    const b = await quoted(`photographer:${world.creators.omar!.code}`)
    await accept(a)
    await accept(b)
    const payload = await getTestPayload()
    const ba = await bookingByRef(payload, a.ref)
    const bb = await bookingByRef(payload, b.ref)
    await asCreator('omar')
    await respond(ba.id, world.personas.photographer, 'confirm')
    expect(await respond(bb.id, world.personas.photographer, 'confirm')).toBe('/account/bookings?error=booking.errors.dateTaken')
    expect((await bookingByRef(payload, a.ref)).state).toBe('confirmed')
    const second = await bookingByRef(payload, b.ref)
    expect(second.state).toBe('accepted')
    expect(second.assignments?.[0]?.status).toBe('lapsed')
    await payload.delete({ collection: 'availability-blocks', where: { booking: { equals: ba.id } }, overrideAccess: true })
  })

  it('QM-US3-S4 delivered → client confirms → completed with payout due in 10 days; a problem puts it on hold', async () => {
    const payload = await getTestPayload()
    const toScheduled = async () => {
      const q = await quoted(`photographer:any`)
      const booking = await bookingByRef(payload, q.ref)
      for (const event of ['accept', 'confirm', 'pay', 'schedule'] as const) {
        const actor = event === 'accept' ? 'client' : 'admin'
        expect((await applyTransition(payload, booking.id, event, { actor, now: new Date() })).ok).toBe(true)
      }
      return q
    }
    const q = await toScheduled()
    const booking = await bookingByRef(payload, q.ref)
    expect((await applyTransition(payload, booking.id, 'deliver', { actor: 'creator', now: new Date() })).ok).toBe(true)
    expect(await redirectOf(() => actions.confirmDelivery(access(q)))).toBe(`/q/${q.ref}/${q.key}`)
    const done = await bookingByRef(payload, q.ref)
    expect(done.state).toBe('completed')
    expect(Date.parse(done.payoutDueAt!) - Date.parse(done.completedAt!)).toBe(10 * 24 * 3600 * 1000)

    const q2 = await toScheduled()
    const b2 = await bookingByRef(payload, q2.ref)
    await applyTransition(payload, b2.id, 'deliver', { actor: 'creator', now: new Date() })
    expect(await redirectOf(() => actions.reportProblem(form({ locale: 'en', ref: q2.ref, key: q2.key, reason: 'Half the photos are missing' })))).toBe(`/q/${q2.ref}/${q2.key}`)
    expect(await bookingByRef(payload, q2.ref)).toMatchObject({ state: 'on-hold', holdReason: 'Half the photos are missing' })
  })

  it('QM-US3-S5 a disallowed transition is refused and nothing changes', async () => {
    const q = await quoted()
    const payload = await getTestPayload()
    const before = await bookingByRef(payload, q.ref)
    expect(await applyTransition(payload, before.id, 'pay', { actor: 'admin', now: new Date() })).toMatchObject({ ok: false, reason: 'not-allowed' })
    expect(await redirectOf(() => actions.confirmDelivery(access(q)))).toBe(`/q/${q.ref}/${q.key}?error=booking.errors.not-allowed`)
    const after = await bookingByRef(payload, q.ref)
    expect(after).toMatchObject({ state: 'quoted', revision: before.revision })
  })

  it('a client may cancel before paying; the creator\'s date is freed', async () => {
    const q = await quoted()
    await accept(q)
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, q.ref)
    await asCreator('sara')
    await respond(booking.id, world.personas.photographer, 'confirm')
    jar.clear()
    expect(await redirectOf(() => actions.cancelByClient(access(q)))).toBe(`/q/${q.ref}/${q.key}`)
    expect(await state(q.ref)).toBe('cancelled')
    expect((await payload.find({ collection: 'availability-blocks', where: { booking: { equals: booking.id } }, overrideAccess: true })).totalDocs).toBe(0)
  })
})
