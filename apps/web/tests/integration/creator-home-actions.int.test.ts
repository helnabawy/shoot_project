import { addDays } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { asClient, bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, form, jar, redirectOf, signIn } from './setup/next-mocks'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const booking = await import('@/modules/booking/actions')
const { answerBookingFromHome, answerBriefFromHome } = await import('@/modules/creator-home/actions')
const { creatorHome } = await import('@/modules/creator-home')

/** CH: answering a request from the creator home with the website's two actions. */

type Key = 'sara' | 'omar' | 'abu'
let world: BookingWorld
const occasions = ['event', 'portrait', 'clinic', 'products', 'car', 'property', 'travel-lifestyle', 'social-media']
let seq = 0
/** Every request gets its own shoot day, so confirming one never makes the creator busy for the next. */
const nextDay = () => addDays(world.date, ++seq)

async function ctxFor(key: Key) {
  const user = world.creators[key]!.user
  return { payload: await getTestPayload(), user: user as never, locale: 'en' as const, installId: null, clientAddress: null, visitorKey: 'test', now: () => new Date(), requestId: 'test' }
}
const homeOf = async (key: Key) => (await creatorHome(await ctxFor(key))) as Awaited<ReturnType<typeof creatorHome>> & { queue: { kind: string; ref: string; persona?: string }[]; counts: { toAnswer: number; comingUp: number } }

/** A booking request waiting for this creator, then the creator signs in. */
async function waitingFor(key: Key) {
  asVisitor()
  const b = await briefFor(submitBrief as never, world, { occasion: occasions[seq % occasions.length]!, date: nextDay() })
  const q = await quoteFor(booking.requestQuotation as never, b, { pick: `photographer:${world.creators[key]!.code}` })
  await asClient()
  await booking.acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })).catch(() => undefined)
  jar.clear()
  await signIn((await getTestPayload()) as never, world.creators[key]!.user.email!)
  return q.ref
}
/** An open brief that matches this creator, then the creator signs in. */
async function briefTo(key: Key) {
  asVisitor()
  const b = await briefFor(submitBrief as never, world, { occasion: occasions[seq % occasions.length]!, date: nextDay() })
  jar.clear()
  await signIn((await getTestPayload()) as never, world.creators[key]!.user.email!)
  return b.ref
}

beforeAll(async () => {
  world = await bookingWorld()
})
beforeEach(() => jar.clear())

describe('CH-US1 answering a booking request from the home', () => {
  it('CH-US1-S2 Accept confirms the booking, and the request leaves the queue', async () => {
    const ref = await waitingFor('sara')
    const before = await homeOf('sara')
    const to = await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref, decision: 'confirm' })))
    expect(to).toBe('/')
    const stored = await bookingByRef(await getTestPayload(), ref)
    expect(stored.assignments?.[0]?.status).toBe('confirmed')
    const after = await homeOf('sara')
    expect(after.queue.map((i) => i.ref)).not.toContain(ref)
    expect(after.counts.comingUp).toBe(before.counts.comingUp + 1)
  })

  it('CH-US1-S4 Decline records the optional reason, or none', async () => {
    const withReason = await waitingFor('omar')
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref: withReason, decision: 'decline', reason: 'Booked elsewhere' })))).toBe('/')
    const stored = await bookingByRef(await getTestPayload(), withReason)
    expect(stored.assignments?.[0]?.status).toBe('declined')
    expect(stored.assignments?.[0]?.declineReason).toBe('Booked elsewhere')

    const without = await waitingFor('omar')
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref: without, decision: 'decline' })))).toBe('/')
    expect((await bookingByRef(await getTestPayload(), without)).assignments?.[0]?.status).toBe('declined')
  })

  it('CH-US1-S8 an answer after the deadline records nothing and says so', async () => {
    const ref = await waitingFor('omar')
    const payload = await getTestPayload()
    const stored = await bookingByRef(payload, ref)
    await payload.update({
      collection: 'bookings',
      id: stored.id,
      data: { assignments: stored.assignments!.map((a) => ({ ...a, respondBy: new Date(Date.now() - 3_600_000).toISOString() })) } as never,
      overrideAccess: true,
      context: { bookingTransition: true, disableRevalidate: true },
    })
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref, decision: 'confirm' })))).toBe('/?error=booking.errors.not-allowed')
    expect((await bookingByRef(payload, ref)).assignments?.[0]?.status).toBe('pending')
  })

  it('CH-US1-S8 another creator’s request is refused, and a signed-out caller is sent to sign in', async () => {
    const ref = await waitingFor('sara')
    jar.clear()
    await signIn((await getTestPayload()) as never, world.creators.omar!.user.email!)
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref, decision: 'confirm' })))).toBe('/?error=booking.errors.notYours')
    jar.clear()
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref, decision: 'confirm' })))).toMatch(/login/)
  })

  it('CH-US1-S2 a decision it does not know is refused before anything is read', async () => {
    const ref = await waitingFor('sara')
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref, decision: 'delete' })))).toBe('/?error=booking.errors.generic')
  })

  it('answers back to the Arabic home for an Arabic form', async () => {
    const ref = await waitingFor('sara')
    expect(await redirectOf(() => answerBookingFromHome(form({ locale: 'ar', ref, decision: 'delete' })))).toBe('/ar?error=booking.errors.generic')
  })
})

describe('CH-US1 answering a brief from the home', () => {
  it('CH-US1-S3 Accept records the answer; Coming up does not change', async () => {
    const ref = await briefTo('sara')
    const before = await homeOf('sara')
    const item = before.queue.find((i) => i.ref === ref)!
    expect(item.kind).toBe('brief')
    expect(await redirectOf(() => answerBriefFromHome(form({ locale: 'en', ref, persona: item.persona, decision: 'accept' })))).toBe('/')
    const rows = await (await getTestPayload()).find({ collection: 'brief-answers', where: { decision: { equals: 'accepted' } }, depth: 1, pagination: false, overrideAccess: true })
    expect(rows.docs.some((r) => typeof r.brief === 'object' && r.brief?.reference === ref)).toBe(true)
    const after = await homeOf('sara')
    expect(after.queue.map((i) => i.ref)).not.toContain(ref)
    expect(after.counts.comingUp).toBe(before.counts.comingUp)
  })

  it('CH-US1-S4 Decline records a reason from the content list, a note, or neither; an unknown reason is refused', async () => {
    const ref = await briefTo('omar')
    const home = await homeOf('omar')
    const item = home.queue.find((i) => i.ref === ref)!
    const reasons = (home as unknown as { reasons: { value: string }[] }).reasons
    expect(reasons.length).toBeGreaterThan(0)
    expect(await redirectOf(() => answerBriefFromHome(form({ locale: 'en', ref, persona: item.persona, decision: 'reject', reason: 'not-a-reason' })))).toBe('/?error=inbox.errors.reasonUnknown')
    expect(await redirectOf(() => answerBriefFromHome(form({ locale: 'en', ref, persona: item.persona, decision: 'reject', reason: reasons[0]!.value, note: 'Too far for me' })))).toBe('/')
    const rejected = await (await getTestPayload()).find({ collection: 'brief-answers', where: { decision: { equals: 'rejected' } }, depth: 1, pagination: false, overrideAccess: true })
    const row = rejected.docs.find((r) => typeof r.brief === 'object' && r.brief?.reference === ref)
    expect(row).toMatchObject({ reason: reasons[0]!.value })
    expect((await homeOf('omar')).queue.map((i) => i.ref)).not.toContain(ref)

    const bare = await briefTo('omar')
    const bareItem = (await homeOf('omar')).queue.find((i) => i.ref === bare)!
    expect(await redirectOf(() => answerBriefFromHome(form({ locale: 'en', ref: bare, persona: bareItem.persona, decision: 'reject' })))).toBe('/')
  })

  it('CH-US1-S8 a brief that is no longer open records nothing and says so', async () => {
    const ref = await briefTo('omar')
    const item = (await homeOf('omar')).queue.find((i) => i.ref === ref)!
    const payload = await getTestPayload()
    const brief = (await payload.find({ collection: 'briefs', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    await payload.update({ collection: 'briefs', id: brief.id, data: { status: 'closed' }, overrideAccess: true, context: { disableRevalidate: true } })
    expect(await redirectOf(() => answerBriefFromHome(form({ locale: 'en', ref, persona: item.persona, decision: 'accept' })))).toBe('/?error=inbox.errors.briefClosed')
  })
})

describe('CH-US1-S2 the home and the bookings page confirm the same way', () => {
  it('give the same booking, assignment and blocked day', async () => {
    const viaHome = await waitingFor('sara')
    await redirectOf(() => answerBookingFromHome(form({ locale: 'en', ref: viaHome, decision: 'confirm' })))
    const viaPage = await waitingFor('omar')
    await redirectOf(async () => booking.respondToAssignment(form({ locale: 'en', booking: String((await bookingByRef(await getTestPayload(), viaPage)).id), persona: String(world.personas.photographer), decision: 'confirm' })))
    const payload = await getTestPayload()
    const [a, b] = [await bookingByRef(payload, viaHome), await bookingByRef(payload, viaPage)]
    expect(a.state).toBe(b.state)
    expect(a.assignments?.[0]?.status).toBe(b.assignments?.[0]?.status)
    const blocks = (id: number) => payload.find({ collection: 'availability-blocks', where: { booking: { equals: id } }, depth: 0, overrideAccess: true })
    expect((await blocks(a.id)).docs.map((d) => d.kind)).toEqual((await blocks(b.id)).docs.map((d) => d.kind))
  })
})
