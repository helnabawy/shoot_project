import { availabilityV1, creatorAccountV1, creatorBookingsV1, myProfileV1, problemV1 } from '@shoot/domain/api/v1'
import { addDays, dubaiToday } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { GET as accountRoute } from '@/app/(payload)/api/mobile/v1/me/creator/account/route'
import { GET as availabilityRoute } from '@/app/(payload)/api/mobile/v1/me/creator/availability/route'
import { PUT as availabilitySetRoute } from '@/app/(payload)/api/mobile/v1/me/creator/availability/[date]/route'
import { GET as bookingsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/bookings/route'
import { POST as answerRoute } from '@/app/(payload)/api/mobile/v1/me/creator/bookings/[ref]/answer/route'
import { PUT as identityRoute } from '@/app/(payload)/api/mobile/v1/me/creator/identity/[kind]/route'
import { GET as profileRoute, PATCH as patchRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/route'
import { POST as submitRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/submit/route'
import { PUT as visibilityRoute } from '@/app/(payload)/api/mobile/v1/me/creator/profile/visibility/route'
import type { RouteHandler } from '@/shared/api/handler'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { createUser, getTestPayload } from './setup/payload'
import { asVisitor, form, jar } from './setup/next-mocks'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const actions = await import('@/modules/booking/actions')

/** MW: the creator's own account over the mobile API, against the seeded database. */

type Who = { email: string }
async function tokenFor(user: Who) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, opts: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

async function ok<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBe(200)
  return schema.parse(await res.json())
}

async function problemOf(res: Response, status: number) {
  expect(res.status, await res.clone().text()).toBe(status)
  return problemV1.parse(await res.json())
}

const pdf = { contentType: 'image/png', filename: 'id.png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }

describe('MW-US1 the profile in the app', () => {
  let world: BookingWorld
  let token: string
  beforeAll(async () => {
    world = await bookingWorld()
    const provider = await createUser(['member'], { accountType: 'provider', persona: [world.personas.photographer], name: 'Nour Ali' })
    token = await tokenFor(provider as Who)
  })

  it('MW-US1-S1 a creator with nothing saved reads a draft with seven steps and the missing items', async () => {
    const view = await ok(await call(profileRoute, 'me/creator/profile', token), myProfileV1)
    expect(view.status).toBe('draft')
    expect(view.canSubmit).toBe(false)
    expect(view.steps.map((s) => s.key)).toEqual(['basics', 'about', 'places', 'links', 'samples', 'calendar', 'identity'])
    expect(view.steps.find((s) => s.key === 'about')?.required).toEqual(['gender'])
    expect(view.fields.displayName.en).toBe('Nour Ali')
    expect(view.options.emirates.length).toBeGreaterThan(0)
  })

  it('MW-US1-S3 a client, and a signed-out caller, are refused', async () => {
    const client = await createUser(['member'])
    const clientToken = await tokenFor(client as Who)
    expect((await problemOf(await call(profileRoute, 'me/creator/profile', clientToken), 403)).code).toBe('creators.errors.notProvider')
    expect((await problemOf(await call(profileRoute, 'me/creator/profile', null), 401)).code).toBe('api.errors.unauthorized')
  })

  it('MW-US1-S4 saving a step stores it and the strength and states change; a bad value names its field', async () => {
    const before = await ok(await call(profileRoute, 'me/creator/profile', token), myProfileV1)
    const saved = await ok(
      await call(patchRoute, 'me/creator/profile', token, { method: 'PATCH', body: { gender: 'woman', languages: ['en'], emirates: [String(world.dubai)], specialties: [String(world.category)], bio: { en: 'Weddings and portraits.', ar: '' } } }),
      myProfileV1,
    )
    expect(saved.strength).toBeGreaterThan(before.strength)
    expect(saved.fields.gender).toBe('woman')
    expect(saved.steps.find((s) => s.key === 'about')?.required).toEqual([])
    expect(saved.code).not.toBe('')
    const bad = await problemOf(await call(patchRoute, 'me/creator/profile', token, { method: 'PATCH', body: { social: [{ platform: 'instagram', url: 'http://nope.example' }] } }), 422)
    expect(bad.fields?.map((f) => f.path)).toContain('body.social')
  })

  it('MW-US1-S8 identity files: a wrong type is refused, a PDF is stored and waits for the check, a newer one replaces it', async () => {
    const wrong = await problemOf(await call(identityRoute, 'me/creator/identity/emirates-id', token, { method: 'PUT', params: { kind: 'emirates-id' }, body: { ...pdf, contentType: 'text/plain' } }), 422)
    expect(wrong.fields?.[0]?.code).toBe('creators.identity.type')
    const first = await ok(await call(identityRoute, 'me/creator/identity/emirates-id', token, { method: 'PUT', params: { kind: 'emirates-id' }, body: pdf }), myProfileV1)
    expect(first.identity['emirates-id'].state).toBe('pending')
    await ok(await call(identityRoute, 'me/creator/identity/emirates-id', token, { method: 'PUT', params: { kind: 'emirates-id' }, body: pdf }), myProfileV1)
    const payload = await getTestPayload()
    const docs = await payload.find({ collection: 'identity-documents', where: { kind: { equals: 'emirates-id' } }, depth: 0, overrideAccess: true, pagination: false })
    expect(docs.docs).toHaveLength(1)
  })

  it('MW-US1-S5 sending for review is refused while required items are missing, then accepted', async () => {
    const refused = await problemOf(await call(submitRoute, 'me/creator/profile/submit', token, { method: 'POST' }), 422)
    expect(refused.code).toBe('creators.submit.incomplete')
    expect(refused.fields?.map((f) => f.path)).toContain('body.tradeLicense')
    await ok(await call(identityRoute, 'me/creator/identity/trade-license', token, { method: 'PUT', params: { kind: 'trade-license' }, body: pdf }), myProfileV1)
    const view = await ok(await call(submitRoute, 'me/creator/profile/submit', token, { method: 'POST' }), myProfileV1)
    expect(view.canSubmit).toBe(true)
    expect(view.status).toBe('in-review')
    expect(view.submittedAt).not.toBeNull()
  })

  it('MW-US5-S5 hiding the profile pauses it, and showing it again returns it', async () => {
    const hidden = await ok(await call(visibilityRoute, 'me/creator/profile/visibility', token, { method: 'PUT', body: { hidden: true } }), myProfileV1)
    expect(hidden.status).toBe('paused')
    const shown = await ok(await call(visibilityRoute, 'me/creator/profile/visibility', token, { method: 'PUT', body: { hidden: false } }), myProfileV1)
    expect(shown.status).toBe('in-review')
  })

  it('MW-US3-S1 My account lists what the profile still needs', async () => {
    const fresh = await createUser(['member'], { accountType: 'provider', persona: [world.personas.photographer], name: 'Dana Fresh' })
    const account = await ok(await call(accountRoute, 'me/creator/account', await tokenFor(fresh as Who)), creatorAccountV1)
    expect(account.status).toBe('draft')
    expect(account.needs.some((n) => n.step === 'about' && n.required.includes('gender'))).toBe(true)
    expect(account.waiting).toBeNull()
  })
})

describe('MW-US2 / MW-US4 bookings and availability in the app', () => {
  let world: BookingWorld
  let sara: string
  const occasions = ['event', 'portrait', 'clinic', 'products', 'car', 'property', 'travel-lifestyle', 'social-media']
  let seq = 0
  const accepted = async (key: string) => {
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { occasion: occasions[seq++ % occasions.length]! })
    const q = await quoteFor(actions.requestQuotation as never, b, { pick: `photographer:${world.creators[key]!.code}` })
    await actions.acceptQuotation(form({ locale: 'en', ref: q.ref, key: q.key })).catch(() => undefined)
    return q.ref
  }

  beforeAll(async () => {
    world = await bookingWorld()
    sara = await tokenFor(world.creators.sara!.user as Who)
  })
  beforeEach(() => jar.clear())

  it('MW-US2-S1 a request waiting for the creator shows the client first name, the deadline and no phone number', async () => {
    const ref = await accepted('sara')
    const view = await ok(await call(bookingsRoute, 'me/creator/bookings', sara), creatorBookingsV1)
    const request = view.waiting.find((r) => r.ref === ref)
    expect(request).toMatchObject({ client: 'Layla', answer: 'pending', profession: expect.any(String) })
    expect(request?.respondBy).not.toBeNull()
    expect(JSON.stringify(view)).not.toContain('971501234567')
    expect(JSON.stringify(view)).not.toContain('Hassan')
  })

  it('MW-US2-S2 confirming books the day and moves the request to coming up', async () => {
    const ref = await accepted('sara')
    const view = await ok(await call(answerRoute, `me/creator/bookings/${ref}/answer`, sara, { method: 'POST', params: { ref }, body: { decision: 'confirm' } }), creatorBookingsV1)
    expect(view.waiting.find((r) => r.ref === ref)).toBeUndefined()
    expect(view.upcoming.find((r) => r.ref === ref)).toMatchObject({ answer: 'confirmed' })
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, ref)
    const blocks = await payload.find({ collection: 'availability-blocks', where: { booking: { equals: booking.id } }, depth: 0, overrideAccess: true })
    expect(blocks.docs[0]?.kind).toBe('booking')
  })

  it('MW-US2-S3 declining with a reason lapses the answer and takes the request off the list', async () => {
    const ref = await accepted('omar')
    const omar = await tokenFor(world.creators.omar!.user as Who)
    const view = await ok(await call(answerRoute, `me/creator/bookings/${ref}/answer`, omar, { method: 'POST', params: { ref }, body: { decision: 'decline', reason: 'Booked elsewhere' } }), creatorBookingsV1)
    expect(view.waiting.find((r) => r.ref === ref)).toBeUndefined()
    const booking = await bookingByRef(await getTestPayload(), ref)
    expect(booking.assignments?.[0]?.status).toBe('declined')
    expect(booking.assignments?.[0]?.declineReason).toBe('Booked elsewhere')
  })

  it('MW-US2-S4 an answer after the deadline is refused', async () => {
    const ref = await accepted('abu')
    const payload = await getTestPayload()
    const booking = await bookingByRef(payload, ref)
    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { assignments: booking.assignments!.map((a) => ({ ...a, respondBy: new Date(Date.now() - 3600_000).toISOString() })) } as never,
      overrideAccess: true,
      context: { bookingTransition: true, disableRevalidate: true },
    })
    const abu = await tokenFor(world.creators.abu!.user as Who)
    expect((await problemOf(await call(answerRoute, `me/creator/bookings/${ref}/answer`, abu, { method: 'POST', params: { ref }, body: { decision: 'confirm' } }), 409)).code).toBe('booking.errors.not-allowed')
  })

  it("MW-US2-S8 another creator's request cannot be answered", async () => {
    const ref = await accepted('vera')
    expect((await problemOf(await call(answerRoute, `me/creator/bookings/${ref}/answer`, sara, { method: 'POST', params: { ref }, body: { decision: 'confirm' } }), 403)).code).toBe('booking.errors.notYours')
  })

  it('MW-US4-S2 a tap blocks a free day and the next frees it; the window and booked days are respected', async () => {
    const today = dubaiToday(new Date())
    const day = addDays(today, 40)
    const set = (date: string, blocked: boolean) => call(availabilitySetRoute, `me/creator/availability/${date}`, sara, { method: 'PUT', params: { date }, body: { blocked } })
    const blocked = await ok(await set(day, true), availabilityV1)
    expect(blocked.days).toContainEqual({ date: day, state: 'blocked' })
    expect(blocked.blockedCount).toBeGreaterThanOrEqual(1)
    const freed = await ok(await set(day, false), availabilityV1)
    expect(freed.days.find((d) => d.date === day)).toBeUndefined()
    expect((await problemOf(await set(addDays(today, 200), true), 409)).code).toBe('availability.errors.generic')
    expect((await problemOf(await set(addDays(today, -1), true), 409)).code).toBe('availability.errors.generic')
    const view = await ok(await call(availabilityRoute, 'me/creator/availability', sara), availabilityV1)
    expect(view.windowDays).toBe(90)
    expect(view.days.filter((d) => d.state === 'booked').length).toBeGreaterThanOrEqual(1)
    const bookedDay = view.days.find((d) => d.state === 'booked')!.date
    expect((await problemOf(await set(bookedDay, true), 409)).code).toBe('availability.errors.generic')
    const still = await ok(await set(bookedDay, false), availabilityV1)
    expect(still.days).toContainEqual({ date: bookedDay, state: 'booked' })
  })
})
