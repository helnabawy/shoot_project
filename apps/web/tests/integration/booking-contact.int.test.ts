import { accountHomeV1, bookingViewV1, creatorBookingsV1, quotationIssuedV1 } from '@shoot/domain/api/v1'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { GET as accountRoute } from '@/app/(payload)/api/mobile/v1/me/account/route'
import { GET as creatorBookingsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/bookings/route'
import { POST as answerRoute } from '@/app/(payload)/api/mobile/v1/me/creator/bookings/[ref]/answer/route'
import { POST as issueRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/quotation/route'
import { POST as acceptRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/accept/route'
import { GET as viewRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/route'
import type { RouteHandler } from '@/shared/api/handler'
import { bookingByRef, bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { applyTransition } = await import('@/modules/booking/transitions')
const { clientContactsFor, creatorContactsFor } = await import('@/modules/booking/contact')
const { getCreatorBookings, myProfileIds } = await import('@/modules/booking/queries')
const { creatorBookingViews } = await import('@/modules/booking/views')

/** BC: who may read the other side's number on a booking (feature 025), against the seeded database. */

const CLIENT = '+971501234567'
const SARA = '+971521112233'

function call(handler: RouteHandler, path: string, params: Record<string, string>, { body, token, method = 'GET' }: { body?: unknown; token?: string | null; method?: string } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.25.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  )
}

async function read<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBeLessThan(300)
  return schema.parse(await res.json())
}

describe('BC booking contact', () => {
  let world: BookingWorld
  let client: string
  let stranger: string
  let sara: string
  let omar: string
  let quote: { reference: string; key: string }
  let bookingId: number

  const tokenFor = async (email: string) => ((await getTestPayload()).login({ collection: 'users', data: { email, password: 'password-123' } })).then((r) => r.token as string)
  const view = (token: string | null, key = quote.key) => call(viewRoute, `quotations/${quote.reference}/${key}`, { ref: quote.reference, key }, { token })
  const bookings = async (token: string) => read(await call(creatorBookingsRoute, 'me/creator/bookings', {}, { token }), creatorBookingsV1)
  const mine = (list: z.output<typeof creatorBookingsV1>) => [...list.waiting, ...list.upcoming, ...list.done].find((r) => r.quotation === quote.reference || r.ref === quote.reference)
  const to = async (...events: ('pay' | 'schedule' | 'deliver' | 'complete' | 'hold')[]) => {
    for (const event of events) expect((await applyTransition(world.payload, bookingId, event, { actor: 'admin', now: new Date() })).ok, event).toBe(true)
  }

  beforeAll(async () => {
    world = await bookingWorld()
    const payload = await getTestPayload()
    const member = await createUser(['member'], { username: CLIENT, name: 'Layla Hassan' })
    const other = await createUser(['member'], { username: '+971509998877', name: 'Other Member' })
    client = await tokenFor(member.email!)
    stranger = await tokenFor(other.email!)
    // Sara signs in with a verified number; Omar is an email-only account.
    await payload.update({ collection: 'users', id: world.creators.sara!.user.id, data: { username: SARA } as never, overrideAccess: true, context: quiet })
    sara = await tokenFor(world.creators.sara!.user.email!)
    omar = await tokenFor(world.creators.omar!.user.email!)

    const brief = await briefFor(submitBrief as never, world)
    const details = { date: world.date, startTime: '18:30', duration: '2h', venue: 'Dubai Marina, Marina Walk' }
    quote = await read(
      await call(issueRoute, `match/${brief.ref}/${brief.key}/quotation`, { ref: brief.ref, key: brief.key }, { method: 'POST', token: client, body: { picks: [{ persona: 'photographer', code: world.creators.sara!.code }], details } }),
      quotationIssuedV1,
    )
    bookingId = (await bookingByRef(payload, quote.reference)).id
  }, 180_000)
  beforeEach(() => asVisitor())

  it('BC-US1-S2 a quoted and an accepted booking carry no contact, for the client or the creator', async () => {
    expect((await read(await view(client), bookingViewV1)).contacts).toBeUndefined()
    await read(await call(acceptRoute, `quotations/${quote.reference}/${quote.key}/accept`, { ref: quote.reference, key: quote.key }, { method: 'POST', token: client }), bookingViewV1)
    const accepted = await read(await view(client), bookingViewV1)
    expect(accepted.state).toBe('accepted')
    expect(accepted.contacts).toBeUndefined()
  })

  it('BC-US2-S2 a creator who has not answered yet sees no client contact', async () => {
    const waiting = mine(await bookings(sara))
    expect(waiting?.answer).toBe('pending')
    expect(waiting?.contact).toBeUndefined()
    expect(JSON.stringify(await bookings(sara))).not.toContain(CLIENT)
  })

  it('BC-US1-S2 a confirmed booking that is not paid yet shares nothing, with either side', async () => {
    const ref = (await bookingByRef(world.payload, quote.reference)).reference
    await read(await call(answerRoute, `me/creator/bookings/${ref}/answer`, { ref }, { method: 'POST', token: sara, body: { decision: 'confirm' } }), creatorBookingsV1)
    const confirmed = await read(await view(client), bookingViewV1)
    expect(confirmed.state).toBe('confirmed')
    expect(confirmed.contacts).toBeUndefined()
    expect(mine(await bookings(sara))?.contact).toBeUndefined()
    expect(JSON.stringify(await bookings(sara))).not.toContain(CLIENT)
  })

  it('BC-US3-S1 the client account lists the confirmed booking before it is paid', async () => {
    const home = await read(await call(accountRoute, 'me/account', {}, { token: client }), accountHomeV1)
    expect(home.confirmed?.map((b) => b.reference)).toEqual([quote.reference])
    expect(home.confirmed?.[0]).toMatchObject({ status: 'awaitingPayment', professional: 'Sara Khan' })
    const empty = await read(await call(accountRoute, 'me/account', {}, { token: stranger }), accountHomeV1)
    expect(empty.confirmed).toBeUndefined()
  })

  it('BC-US1-S1 once paid, the signed-in client sees the booked creator with their verified number and a WhatsApp link', async () => {
    await to('pay')
    const confirmed = await read(await view(client), bookingViewV1)
    expect(confirmed.state).toBe('paid')
    expect(confirmed.contacts).toEqual([{ name: 'Sara Khan', role: 'Photographer', phone: SARA, whatsappUrl: expect.stringMatching(/^https:\/\/wa\.me\/971521112233\?text=/) }])
    expect(decodeURIComponent(confirmed.contacts![0]!.whatsappUrl)).toContain(quote.reference)
    // The owner also gets the private key back, so the app can open the booking without one in the path.
    expect(confirmed.key).toBe(quote.key)
    const keyless = await read(await view(client, 'me'), bookingViewV1)
    expect(keyless.contacts).toHaveLength(1)
    expect(keyless.key).toBe(quote.key)
  })

  it('BC-US1-S3 the private link alone, a guest or another member: the quotation without contact or key', async () => {
    for (const token of [null, stranger, sara]) {
      const res = await view(token)
      const body = await read(res, bookingViewV1)
      expect(body.contacts).toBeUndefined()
      expect(body.key).toBeUndefined()
      expect(JSON.stringify(body)).not.toContain(SARA)
    }
    expect((await view(stranger, 'me')).status).toBe(404)
    const booking = await bookingByRef(world.payload, quote.reference)
    const full = await world.payload.findByID({ collection: 'bookings', id: booking.id, depth: 2, overrideAccess: true })
    expect(await creatorContactsFor(world.payload, full, null, 'en')).toEqual([])
    expect(await creatorContactsFor(world.payload, full, world.creators.omar!.user.id, 'en')).toEqual([])
  })

  it('BC-US2-S1 the booked creator sees the client first name, verified number and WhatsApp link; the website row carries the same', async () => {
    const booked = mine(await bookings(sara))
    expect(booked?.contact).toEqual({ name: 'Layla', role: '', phone: CLIENT, whatsappUrl: expect.stringMatching(/^https:\/\/wa\.me\/971501234567\?text=/) })
    const user = await world.payload.findByID({ collection: 'users', id: world.creators.sara!.user.id, overrideAccess: true })
    const [assigned, profileIds] = await Promise.all([getCreatorBookings(user), myProfileIds(user.id)])
    const contacts = await clientContactsFor(world.payload, assigned, profileIds, 'en')
    const row = creatorBookingViews(assigned, profileIds, 'en', (s) => s, contacts).find((r) => r.bookingId === bookingId)
    expect(row?.contact).toMatchObject({ name: 'Layla', phone: CLIENT, display: '+971 50 123 4567', telHref: `tel:${CLIENT}` })
  })

  it('BC-US2-S2 a creator who is not on the booking can never read the client contact', async () => {
    expect(JSON.stringify(await bookings(omar))).not.toContain(CLIENT)
    const booking = await world.payload.findByID({ collection: 'bookings', id: bookingId, depth: 1, overrideAccess: true })
    expect((await clientContactsFor(world.payload, [booking], [world.creators.omar!.id], 'en')).size).toBe(0)
    expect((await clientContactsFor(world.payload, [booking], [], 'en')).size).toBe(0)
  })

  it('BC-US2-S3 an account with no verified number shows no contact; nothing else changes', async () => {
    await world.payload.update({ collection: 'users', id: world.creators.sara!.user.id, data: { username: null } as never, overrideAccess: true, context: quiet })
    const body = await read(await view(client), bookingViewV1)
    expect(body.contacts).toBeUndefined()
    expect(body.professionals[0]).toMatchObject({ name: 'Sara Khan' })
    await world.payload.update({ collection: 'users', id: world.creators.sara!.user.id, data: { username: SARA } as never, overrideAccess: true, context: quiet })
  })

  it('BC-US1-S1 contact stays through scheduled and delivered', async () => {
    await to('schedule', 'deliver')
    expect((await read(await view(client), bookingViewV1)).contacts).toHaveLength(1)
    expect(mine(await bookings(sara))?.contact?.phone).toBe(CLIENT)
  })

  it('BC-US1-S2 a completed booking shares nothing any more, with either side', async () => {
    await to('complete')
    const done = await read(await view(client), bookingViewV1)
    expect(done.state).toBe('completed')
    expect(done.contacts).toBeUndefined()
    expect(mine(await bookings(sara))?.contact).toBeUndefined()
  })
})
