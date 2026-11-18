import { creatorHomeV1, problemV1 } from '@shoot/domain/api/v1'
import { dubaiToday } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as homeRoute } from '@/app/(payload)/api/mobile/v1/me/creator/home/route'
import { PUT as visibilityRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/visibility/route'
import type { RouteHandler } from '@/shared/api/handler'
import { asClient, bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { createDraft, makeProvider, publish } from './setup/creators'
import { createUser, getTestPayload } from './setup/payload'
import { asVisitor, form, jar } from './setup/next-mocks'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const actions = await import('@/modules/booking/actions')

/** CH: the creator home's read model and endpoint, against the seeded database. */

type Who = { email: string }
async function tokenFor(user: Who) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, token: string | null, locale = 'en') {
  return handler(
    new Request('http://test/api/mobile/v1/me/creator/home', {
      headers: { 'content-type': 'application/json', 'accept-language': locale, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    }),
    { params: Promise.resolve({}) },
  )
}

async function homeOf(token: string, locale = 'en') {
  const res = await call(homeRoute as RouteHandler, token, locale)
  expect(res.status, await res.clone().text()).toBe(200)
  expect(res.headers.get('cache-control')).toContain('no-store')
  return { text: await res.clone().text(), home: creatorHomeV1.parse(await res.json()) }
}

describe('CH-US3 the home of a live creator', () => {
  let world: BookingWorld
  let sara: string
  let omar: string
  const occasions = ['event', 'portrait', 'clinic', 'products', 'car', 'property', 'travel-lifestyle', 'social-media']
  let seq = 0
  /** A booking request waiting for this creator: the client accepted a quotation naming them. */
  const waitingFor = async (key: string) => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: occasions[seq++ % occasions.length]! })
    const q = await quoteFor(actions.requestQuotation as never, b, { pick: `photographer:${world.creators[key]!.code}` })
    await asClient()
    await actions.acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })).catch(() => undefined)
    return q.ref
  }

  beforeAll(async () => {
    world = await bookingWorld()
    sara = await tokenFor(world.creators.sara!.user as Who)
    omar = await tokenFor(world.creators.omar!.user as Who)
  })
  beforeEach(() => jar.clear())

  it('CH-US3-S1 reads who the creator is: name, professions from content, code, live', async () => {
    const { home } = await homeOf(sara)
    expect(home).toMatchObject({ name: 'Sara Khan', code: world.creators.sara!.code, mode: 'live', professions: [expect.any(String)] })
    expect((await homeOf(sara, 'ar')).home.professions[0]).not.toBe(home.professions[0])
  })

  it('CH-US1-S1 CH-US3-S2 puts a waiting booking request first, with its time, length and the client first name, and counts it', async () => {
    const ref = await waitingFor('sara')
    const { home, text } = await homeOf(sara)
    const first = home.queue[0]!
    expect(first).toMatchObject({ kind: 'booking', ref, client: 'Layla', respondBy: expect.any(String) })
    expect(home.counts?.toAnswer).toBe(home.queue.length)
    expect(home.queue.filter((i) => i.kind === 'booking').length).toBeGreaterThan(0)
    // Bookings come before every brief.
    const kinds = home.queue.map((i) => i.kind)
    expect(kinds.lastIndexOf('booking')).toBeLessThan(kinds.indexOf('brief') === -1 ? Infinity : kinds.indexOf('brief'))
    expect(text).not.toContain('Hassan')
    expect(text).not.toContain('971501234567')
  })

  it('CH-US1-S6 orders booking requests by nearest answer-by time, then briefs newest first', async () => {
    await waitingFor('omar')
    await waitingFor('omar')
    const { home } = await homeOf(omar)
    const due = home.queue.filter((i) => i.kind === 'booking').map((i) => Date.parse(i.respondBy))
    expect([...due].sort((a, b) => a - b)).toEqual(due)
    const sent = home.queue.filter((i) => i.kind === 'brief').map((i) => Date.parse(i.sentAt))
    expect([...sent].sort((a, b) => b - a)).toEqual(sent)
  })

  it('CH-US3-S2 counts only this creator: another creator\'s requests never appear', async () => {
    const mine = await waitingFor('sara')
    const abu = await tokenFor(world.creators.abu!.user as Who)
    const { home } = await homeOf(abu)
    expect(home.queue.map((i) => i.ref)).not.toContain(mine)
  })

  it('CH-US3-S3 CH-US3-S2 a confirmed booking becomes Coming up and the Next shoot; Completed counts what was done', async () => {
    const ref = await waitingFor('sara')
    const before = (await homeOf(sara)).home
    const { answerRequest } = await import('@/modules/booking')
    const user = world.creators.sara!.user
    const answer = await answerRequest({ payload: await getTestPayload(), user: user as never, locale: 'en', installId: null, clientAddress: null, visitorKey: 'test', now: () => new Date(), requestId: 'test' }, ref, { decision: 'confirm' })
    expect('status' in answer).toBe(false)
    const after = (await homeOf(sara)).home
    expect(after.counts?.comingUp).toBe((before.counts?.comingUp ?? 0) + 1)
    expect(after.counts?.toAnswer).toBe((before.counts?.toAnswer ?? 0) - 1)
    expect(after.queue.map((i) => i.ref)).not.toContain(ref)
    const booking = await bookingByRef(await getTestPayload(), ref)
    expect(after.next).not.toBeNull()
    expect(after.next!.date! <= (booking.date as string)).toBe(true)
    expect(after.next).toMatchObject({ ref: expect.any(String), paid: false, emirate: expect.any(String) })
  })

  it('CH-US3-S5 today is blocked on a blocked business day', async () => {
    const payload = await getTestPayload()
    const profile = world.creators.omar!.id
    const today = dubaiToday(new Date())
    await payload.create({ collection: 'availability-blocks', data: { creator: profile, date: today, kind: 'blocked', user: world.creators.omar!.user.id }, user: world.creators.omar!.user as never, overrideAccess: false })
    expect((await homeOf(omar)).home.today).toBe('blocked')
    await payload.delete({ collection: 'availability-blocks', where: { and: [{ creator: { equals: profile } }, { date: { equals: today } }] }, overrideAccess: true })
    expect((await homeOf(omar)).home.today).toBe('free')
  })

  it('CH-US1-S4 carries the content reasons for declining a brief', async () => {
    const { home } = await homeOf(sara)
    expect(home.reasons.length).toBeGreaterThan(0)
  })
})

describe('CH-US3-S2 Completed', () => {
  it('counts every finished booking of this creator, all time, and Coming up no longer counts it', async () => {
    const world = await bookingWorld()
    jar.clear()
    asVisitor()
    const b = await briefFor(submitBrief as never, world, {})
    const q = await quoteFor(actions.requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    await asClient()
    await actions.acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })).catch(() => undefined)
    const token = await tokenFor(world.creators.sara!.user as Who)
    const { answerRequest } = await import('@/modules/booking')
    const ctx = { payload: await getTestPayload(), user: world.creators.sara!.user as never, locale: 'en' as const, installId: null, clientAddress: null, visitorKey: 'test', now: () => new Date(), requestId: 'test' }
    await answerRequest(ctx, q.ref, { decision: 'confirm' })
    expect((await homeOf(token)).home.counts).toMatchObject({ comingUp: 1, completed: 0 })
    const booking = await bookingByRef(ctx.payload, q.ref)
    await ctx.payload.update({ collection: 'bookings', id: booking.id, data: { state: 'completed' }, overrideAccess: true, context: { bookingTransition: true, disableRevalidate: true } })
    const done = (await homeOf(token)).home
    expect(done.counts).toMatchObject({ comingUp: 0, completed: 1 })
    expect(done.next).toBeNull()
  })
})

describe('CH-US4 a creator who is not live', () => {
  let world: BookingWorld
  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => jar.clear())

  it('CH-US4-S3 CH-US4-S1 a creator with no profile is incomplete: the missing steps, no counts, no queue', async () => {
    const provider = await createUser(['member'], { accountType: 'provider', persona: [world.personas.photographer], name: 'Nour Ali' })
    const { home } = await homeOf(await tokenFor(provider as Who))
    expect(home).toMatchObject({ mode: 'incomplete', name: 'Nour Ali', queue: [], next: null })
    expect(home.counts).toBeUndefined()
    expect(home.needs.length).toBeGreaterThan(0)
  })

  it('CH-US4-S4 an approved profile gets the live home on the next open', async () => {
    const provider = await makeProvider(world)
    const profile = await createDraft(world, provider, { displayName: 'Layla Noor' })
    const token = await tokenFor(provider as Who)
    expect((await homeOf(token)).home).toMatchObject({ mode: 'incomplete', queue: [], next: null })
    await publish(world, profile.id)
    const live = (await homeOf(token)).home
    expect(live.mode).toBe('live')
    expect(live.counts).toEqual({ toAnswer: expect.any(Number), comingUp: 0, completed: 0 })
  })

  it('CH-US4-S5 a paused profile reads as paused, with no queue and no counts; showing it again returns the live home', async () => {
    const token = await tokenFor(world.creators.vera!.user as Who)
    const visibility = (hidden: boolean) =>
      visibilityRoute(
        new Request('http://test/api/mobile/v1/me/creator/profile/visibility', {
          method: 'PUT',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ hidden }),
        }),
        { params: Promise.resolve({}) },
      )
    expect((await visibility(true)).status).toBe(200)
    const paused = (await homeOf(token)).home
    expect(paused).toMatchObject({ mode: 'paused', queue: [], next: null })
    expect(paused.counts).toBeUndefined()
    expect((await visibility(false)).status).toBe(200)
    expect((await homeOf(token)).home.mode).toBe('live')
  })
})

describe('CH-US3-S1 who may read it', () => {
  it('a client gets 403, a signed-out caller 401', async () => {
    const client = await createUser(['member'])
    const refused = await call(homeRoute as RouteHandler, await tokenFor(client as Who))
    expect(refused.status).toBe(403)
    expect(problemV1.parse(await refused.json()).code).toBe('creators.errors.notProvider')
    expect((await call(homeRoute as RouteHandler, null)).status).toBe(401)
  })
})
