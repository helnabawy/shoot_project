import { accountHomeV1, bookingListV1, briefListV1, meV1, problemV1 } from '@shoot/domain/api/v1'
import { addDays, dubaiToday } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GET as accountRoute } from '@/app/(payload)/api/mobile/v1/me/account/route'
import { GET as bookingsRoute } from '@/app/(payload)/api/mobile/v1/me/bookings/route'
import { GET as briefsRoute } from '@/app/(payload)/api/mobile/v1/me/briefs/route'
import { PATCH as updateRoute } from '@/app/(payload)/api/mobile/v1/me/route'
import { mintSession } from '@/modules/auth/otp/mint'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar, signIn } from './setup/next-mocks'
import { bearer, call } from './setup/otp'
import { createUser, getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')

type U = Awaited<ReturnType<typeof createUser>>

describe('013 the client account endpoints (MK-)', () => {
  let world: BookingWorld
  let seekerA: U
  let seekerB: U
  let tokenA: string
  let tokenB: string
  let tokenProvider: string
  let ref: string
  let bookingId: number

  const setBooking = async (data: Record<string, unknown>) => (await getTestPayload()).db.updateOne({ collection: 'bookings', where: { id: { equals: bookingId } }, data })
  const get = (route: Parameters<typeof call>[0], path: string, token?: string) => call(route, path, { method: 'GET', headers: token ? bearer(token) : {} })
  const home = async (token: string) => accountHomeV1.parse(await (await get(accountRoute, 'me/account', token)).json())

  beforeAll(async () => {
    world = await bookingWorld()
    const payload = await getTestPayload()
    seekerA = await createUser(['member'])
    seekerB = await createUser(['member'])
    asVisitor()
    await signIn(payload as never, seekerA.email!)
    const b = await briefFor(submitBrief as never, world)
    const quote = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    jar.clear()
    ref = quote.ref
    bookingId = (await bookingByRef(payload, ref)).id
    tokenA = (await mintSession(payload, seekerA.id)).token
    tokenB = (await mintSession(payload, seekerB.id)).token
    tokenProvider = (await mintSession(payload, world.creators.sara!.user.id)).token
  })

  it('MK-US1-S6 needs a signed-in person on every endpoint', async () => {
    for (const [route, path] of [[accountRoute, 'me/account'], [bookingsRoute, 'me/bookings'], [briefsRoute, 'me/briefs']] as const) {
      const res = await get(route, path)
      expect(res.status).toBe(401)
      expect(problemV1.parse(await res.json()).code).toBe('api.errors.unauthorized')
    }
    expect((await call(updateRoute, 'me', { method: 'PATCH', body: { name: 'Sara' } })).status).toBe(401)
  })

  it('MK-US1-S1 MK-US1-S2 shows the quotation to accept as Up next, with the briefs and finish items', async () => {
    const a = await home(tokenA)
    expect(a.upNext?.kind).toBe('quote')
    expect(a.upNext?.booking).toMatchObject({ reference: ref, status: 'awaitingAcceptance', professional: 'Sara Khan', date: world.date })
    expect(a.places.bookings.waiting).toBe(1)
    expect(a.briefs).toHaveLength(1)
    expect(a.briefs[0]!.bookingReference).toBe(ref)
    expect(a.finish.items.map((i) => i.key)).toEqual(['number', 'name', 'email'])
    expect(a.finish.autoOpen).toBe(true)
  })

  it('MK-US1-S7 gives a creator account no client account', async () => {
    const res = await get(accountRoute, 'me/account', tokenProvider)
    expect(res.status).toBe(404)
    expect(problemV1.parse(await res.json()).code).toBe('api.errors.notFound')
  })

  it('MK-US2-S6 MK-FR-015 never shows another person’s bookings or briefs', async () => {
    const b = await home(tokenB)
    expect(b.upNext).toBeNull()
    expect(b.briefs).toEqual([])
    const list = bookingListV1.parse(await (await get(bookingsRoute, 'me/bookings', tokenB)).json())
    expect(list).toMatchObject({ upcoming: [], past: [], hasMore: false })
    expect(briefListV1.parse(await (await get(briefsRoute, 'me/briefs', tokenB)).json()).items).toEqual([])
  })

  it('MK-US2-S1 groups a booking as Upcoming, then Past once its day has gone', async () => {
    const upcoming = bookingListV1.parse(await (await get(bookingsRoute, 'me/bookings', tokenA)).json())
    expect(upcoming.upcoming.map((x) => x.reference)).toEqual([ref])
    expect(upcoming.past).toEqual([])
    await setBooking({ date: addDays(dubaiToday(new Date()), -3) })
    const past = bookingListV1.parse(await (await get(bookingsRoute, 'me/bookings', tokenA)).json())
    expect(past.upcoming).toEqual([])
    expect(past.past.map((x) => x.reference)).toEqual([ref])
    await setBooking({ date: world.date })
  })

  it('MK-US2-S6 shows the new state when it changes, and nothing waiting once paid', async () => {
    await setBooking({ state: 'confirmed' })
    expect((await home(tokenA)).upNext).toMatchObject({ kind: 'payment' })
    await setBooking({ state: 'paid' })
    const paid = await home(tokenA)
    expect(paid.upNext).toBeNull()
    expect(paid.places.bookings).toEqual({ waiting: 0, open: 1 })
    const list = bookingListV1.parse(await (await get(bookingsRoute, 'me/bookings', tokenA)).json())
    expect(list.upcoming[0]!.status).toBe('paid')
  })

  it('MK-US2-S3 pages briefs and answers an empty page past the last', async () => {
    const page2 = briefListV1.parse(await (await get(briefsRoute, 'me/briefs?page=2', tokenA)).json())
    expect(page2).toMatchObject({ items: [], page: 2, hasMore: false })
    expect((await get(briefsRoute, 'me/briefs?page=0', tokenA)).status).toBe(422)
  })

  it('MK-US3-S3 MK-US3-S6 saves a name and an email', async () => {
    const res = await call(updateRoute, 'me', { method: 'PATCH', headers: bearer(tokenA), body: { name: 'Sara Al Mansoori', email: 'Sara@Example.ae' } })
    expect(res.status).toBe(200)
    expect(meV1.parse(await res.json())).toMatchObject({ name: 'Sara Al Mansoori', email: 'sara@example.ae' })
    const a = await home(tokenA)
    expect(a.person.name).toBe('Sara Al Mansoori')
    // The test account signs in by email, so its number is not verified; name and email are done.
    expect(a.finish.items.map((i) => [i.key, i.done])).toEqual([['number', false], ['name', true], ['email', true]])
  })

  it('MK-US3-S4 refuses an invalid email and an email another account uses, saving nothing', async () => {
    const bad = await call(updateRoute, 'me', { method: 'PATCH', headers: bearer(tokenB), body: { email: 'nope' } })
    expect(bad.status).toBe(422)
    expect(problemV1.parse(await bad.json()).fields).toEqual([{ path: 'body.email', code: 'account.errors.emailInvalid' }])
    const taken = await call(updateRoute, 'me', { method: 'PATCH', headers: bearer(tokenB), body: { email: 'sara@example.ae' } })
    expect(taken.status).toBe(422)
    expect(problemV1.parse(await taken.json()).fields).toEqual([{ path: 'body.email', code: 'account.errors.emailInUse' }])
    const payload = await getTestPayload()
    expect((await payload.findByID({ collection: 'users', id: seekerB.id, depth: 0, overrideAccess: true })).email).toBe(seekerB.email)
  })

  it('MK-US3-S1 MK-US3-S5 opens the finish screen on its own once', async () => {
    expect((await home(tokenA)).finish.autoOpen).toBe(true)
    const first = await call(updateRoute, 'me', { method: 'PATCH', headers: bearer(tokenA), body: { finishShown: true } })
    expect(first.status).toBe(200)
    expect((await home(tokenA)).finish.autoOpen).toBe(false)
    const payload = await getTestPayload()
    const stamp = (await payload.findByID({ collection: 'users', id: seekerA.id, depth: 0, overrideAccess: true })).accountFinishDismissedAt
    await call(updateRoute, 'me', { method: 'PATCH', headers: bearer(tokenA), body: { finishShown: true } })
    expect((await payload.findByID({ collection: 'users', id: seekerA.id, depth: 0, overrideAccess: true })).accountFinishDismissedAt).toBe(stamp)
  })

  it('MK-FR-027 reads the account lines from the CMS in the caller’s language', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { accountAbout: [{ line: 'Find your quotations again.' }] }, locale: 'en', context: { disableRevalidate: true } })
    const a = await home(tokenA)
    expect(a.about).toEqual(['Find your quotations again.'])
  })
})
