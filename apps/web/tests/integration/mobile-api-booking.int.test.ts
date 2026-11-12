import { bookingViewV1, freshQuotationV1, matchV1, problemV1, quotationIssuedV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { POST as acceptRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/accept/route'
import { POST as confirmRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/confirm-delivery/route'
import { POST as freshRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/fresh/route'
import { POST as pickRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/pick-another/route'
import { POST as reportRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/report/route'
import { GET as viewRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/route'
import { GET as matchRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/route'
import { POST as issueRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/quotation/route'
import type { RouteHandler } from '@/shared/api/handler'
import { bookingByRef, bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { applyTransition, TRANSITION_CONTEXT } = await import('@/modules/booking/transitions')

/** MQ-US1…US5: Quick Match and booking through `/api/mobile/v1` (feature 012). */

function call(handler: RouteHandler, path: string, params: Record<string, string>, { body, token, method = 'GET' }: { body?: unknown; token?: string; method?: string } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method,
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.12.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  )
}

async function read<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBeLessThan(300)
  return schema.parse(await res.json())
}

async function problemOf(res: Response, status: number) {
  expect(res.status).toBe(status)
  expect(res.headers.get('content-type')).toContain('application/problem+json')
  return problemV1.parse(await res.json())
}

describe('MQ mobile Quick Match and booking', () => {
  let world: BookingWorld
  let token: string
  let memberPhone: string
  const brief = (over: Record<string, string | string[]> = {}) => briefFor(submitBrief as never, world, over)
  const match = (b: { ref: string; key: string }, query = '') => call(matchRoute, `match/${b.ref}/${b.key}${query}`, { ref: b.ref, key: b.key })
  const details = (over: Record<string, unknown> = {}) => ({ date: world.date, startTime: '18:30', duration: '2h', venue: 'Dubai Marina, Marina Walk', note: 'Arrive early.', ...over })
  const issue = (b: { ref: string; key: string }, code: string | null, over: Record<string, unknown> = {}, tok: string | undefined = token) =>
    call(issueRoute, `match/${b.ref}/${b.key}/quotation`, { ref: b.ref, key: b.key }, { method: 'POST', token: tok, body: { picks: [{ persona: 'photographer', code }], details: details(over) } })
  const issued = async (code: string | null = world.creators.sara!.code, over: Record<string, unknown> = {}) => {
    const b = await brief()
    return read(await issue(b, code, over), quotationIssuedV1)
  }
  const at = (path: string, q: { reference: string; key: string }) => ({ path: `quotations/${q.reference}/${q.key}${path}`, params: { ref: q.reference, key: q.key } })
  const view = async (q: { reference: string; key: string }) => read(await call(viewRoute, at('', q).path, at('', q).params), bookingViewV1)
  const post = (route: RouteHandler, sub: string, q: { reference: string; key: string }, body?: unknown) => call(route, at(`/${sub}`, q).path, at('', q).params, { method: 'POST', body })
  const block = async (key: 'sara' | 'omar', date = world.date) => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators[key]!.id, user: world.creators[key]!.user.id, date, kind: 'blocked' }, overrideAccess: true, context: quiet })
  }
  const unblock = async () => (await getTestPayload()).delete({ collection: 'availability-blocks', where: { id: { exists: true } }, overrideAccess: true })

  beforeAll(async () => {
    world = await bookingWorld()
    const payload = await getTestPayload()
    memberPhone = '+971501234567'
    const member = await createUser(['member'], { username: memberPhone, name: 'Layla Hassan' })
    token = (await payload.login({ collection: 'users', data: { email: member.email!, password: 'password-123' } })).token as string
  }, 180_000)
  beforeEach(() => asVisitor())

  describe('US1 choose a creator who is free', () => {
    it('MQ-US1-S1 shows the free creators of the type, one fixed price and what it includes', async () => {
      const b = await brief()
      const m = await read(await match(b), matchV1)
      expect(m.sections).toHaveLength(1)
      expect(new Set(m.sections[0]!.creators.map((c) => c.code))).toEqual(new Set([world.creators.sara!.code, world.creators.omar!.code]))
      expect(m.sections[0]).toMatchObject({ priceFils: 80000 })
      expect(m).toMatchObject({ totalFils: 80000, priceOnRequest: false, nearby: [] })
      expect(Array.isArray(m.sections[0]!.includes)).toBe(true)
      expect(m.durations.map((d) => d.value)).toContain('2h')
      expect(m.whatsappUrl).toMatch(/^https:\/\/wa\.me\//)
      expect(JSON.stringify(m)).not.toMatch(/rating|verified|review/i)
    })

    it('MQ-US1-S5 a creator who blocked the date is not shown', async () => {
      await block('sara')
      const m = await read(await match(await brief()), matchV1)
      expect(m.sections[0]!.creators.map((c) => c.code)).toEqual([world.creators.omar!.code])
      await unblock()
    })

    it('MQ-US1-S6 nobody free → the nearest other days with the real number free, never in the past', async () => {
      await block('sara')
      await block('omar')
      const m = await read(await match(await brief()), matchV1)
      expect(m.sections[0]!.creators).toEqual([])
      expect(m.nearby.map((n) => n.date)).toEqual([addDays(world.date, 1), addDays(world.date, -1), addDays(world.date, 2)])
      expect(m.nearby[0]).toMatchObject({ free: 2 })
      await unblock()
    })

    it('MQ-US1-S7 another day changes only the date', async () => {
      await block('sara')
      await block('omar')
      const b = await brief()
      const other = addDays(world.date, 1)
      const m = await read(await match(b, `?date=${other}`), matchV1)
      expect(m.date).toBe(other)
      expect(m.brief.date).toBe(world.date)
      expect(m.sections[0]!.creators).toHaveLength(2)
      await unblock()
    })

    it('MQ-US1-S8 a brief with any date lists every matching creator', async () => {
      const m = await read(await match(await brief({ date: '' })), matchV1)
      expect(m.date).toBeNull()
      expect(m.sections[0]!.creators).toHaveLength(2)
    })

    it('MQ-US1-S9 no price rule → price on request', async () => {
      const payload = await getTestPayload()
      await payload.update({ collection: 'service-tiers', where: { duration: { equals: '3h' } }, data: { active: false }, overrideAccess: true, context: quiet })
      const m = await read(await match(await brief({ duration: '3h' })), matchV1)
      expect(m).toMatchObject({ priceOnRequest: true, totalFils: null })
      expect(m.sections[0]!.priceFils).toBeNull()
      await payload.update({ collection: 'service-tiers', where: { duration: { equals: '3h' } }, data: { active: true }, overrideAccess: true, context: quiet })
    })

    it('MQ-US2-S2 another duration prices the same brief again', async () => {
      const m = await read(await match(await brief(), '?duration=3h'), matchV1)
      expect(m.brief.duration).toBe('3h') // the duration priced
      expect(m.totalFils).not.toBe(80000)
    })

    it('MQ-US3-S7 a wrong key and an unknown reference are the same 404', async () => {
      const b = await brief()
      expect((await problemOf(await match({ ref: b.ref, key: 'x'.repeat(43) }), 404)).code).toBe('api.errors.notFound')
      expect((await problemOf(await match({ ref: 'B-NOPE0', key: b.key }), 404)).code).toBe('api.errors.notFound')
    })
  })

  describe('US2 details, the number at the end, WhatsApp', () => {
    it('MQ-US2-S8 MQ-FR-018 issues a quotation for the signed-in member, with the details and a WhatsApp link', async () => {
      const q = await issued()
      expect(q.state).toBe('quoted')
      expect(q.whatsappUrl).toMatch(/^https:\/\/wa\.me\//)
      const payload = await getTestPayload()
      const booking = (await bookingByRef(payload, q.reference)) as unknown as { client: { name: string; whatsapp: string }; details: Record<string, string>; member: number }
      expect(booking.client).toMatchObject({ name: 'Layla Hassan', whatsapp: memberPhone })
      expect(booking.details).toMatchObject({ startTime: '18:30', duration: '2h', venue: 'Dubai Marina, Marina Walk', note: 'Arrive early.' })
      expect(booking.member).toBeTruthy()
    })

    it('MQ-US2-S10 needs a token', async () => {
      const b = await brief()
      expect((await problemOf(await issue(b, null, {}, ''), 401)).code).toBe('api.errors.unauthorized')
    })

    it('MQ-US2-S4 a missing venue, a bad time or a past date names the field and saves nothing', async () => {
      const payload = await getTestPayload()
      const before = (await payload.count({ collection: 'bookings', overrideAccess: true })).totalDocs
      const b = await brief()
      for (const [over, path] of [
        [{ venue: '' }, 'body.details.venue'],
        [{ startTime: '9pm' }, 'body.details.startTime'],
        [{ date: addDays(world.date, -30) }, 'body.details.date'],
      ] as const) {
        const p = await problemOf(await issue(b, null, over), 422)
        expect(p.fields?.map((f) => f.path)).toContain(path)
      }
      expect((await payload.count({ collection: 'bookings', overrideAccess: true })).totalDocs).toBe(before)
    })

    it('MQ-US2-S3 a creator no longer free on the date is not issued a quotation', async () => {
      const b = await brief()
      await block('sara')
      expect((await problemOf(await issue(b, world.creators.sara!.code), 409)).code).toBe('booking.errors.unavailable')
      await unblock()
    })

    it('MQ-US2-S8 MQ-US3-S8 "let us pick" issues without a creator and the quotation says the team is choosing', async () => {
      const q = await issued(null)
      expect((await view(q)).professionals).toEqual([{ type: expect.any(String), name: null, code: null }])
    })
  })

  describe('US3 accept the quotation, or get a fresh one', () => {
    it('MQ-US3-S1 shows the brief line, the lines stored at issue, the total, the professional and what can be done', async () => {
      const q = await issued()
      const v = await view(q)
      expect(v).toMatchObject({ state: 'quoted', nextStep: 'accept', canAccept: true, totalFils: 80000, shootDate: world.date, startTime: '18:30' })
      expect(v.lines[0]).toMatchObject({ kind: 'tier', amountFils: 80000 })
      expect(v.professionals[0]!.name).toBe('Sara Khan')
      expect(v.whatsappUrl).toBeTruthy()
    })

    it('MQ-US3-S2 MQ-US3-S3 accepting moves the booking to accepted once, however many times it is tapped', async () => {
      const q = await issued()
      const [a, b] = await Promise.all([post(acceptRoute, 'accept', q), post(acceptRoute, 'accept', q)])
      expect([a.status, b.status].filter((s) => s === 200).length).toBeGreaterThanOrEqual(1)
      const v = await read(await post(acceptRoute, 'accept', q), bookingViewV1)
      expect(v).toMatchObject({ state: 'accepted', nextStep: 'waitProfessional', canAccept: false })
      const payload = await getTestPayload()
      const bookings = await payload.count({ collection: 'bookings', where: { reference: { equals: q.reference } }, overrideAccess: true })
      expect(bookings.totalDocs).toBe(1)
      const events = await payload.find({ collection: 'booking-events', where: { event: { equals: 'accept' }, booking: { equals: (await bookingByRef(payload, q.reference)).id } }, overrideAccess: true, depth: 0 })
      expect(events.totalDocs).toBe(1)
    })

    it('MQ-US3-S5 a quotation past its validity reads expired and cannot be accepted', async () => {
      const q = await issued()
      const payload = await getTestPayload()
      const booking = await bookingByRef(payload, q.reference)
      await payload.update({ collection: 'bookings', id: booking.id, data: { quoteValidUntil: new Date(Date.now() - 3600_000).toISOString() } as never, overrideAccess: true, context: TRANSITION_CONTEXT })
      const v = await view(q)
      expect(v).toMatchObject({ state: 'expired', nextStep: 'freshQuotation', canAccept: false })
      expect((await problemOf(await post(acceptRoute, 'accept', q), 409)).code).toMatch(/^booking\.errors\./)
    })

    it('MQ-US3-S6 a fresh quotation gives the brief link and the old picks, and that link opens step 2', async () => {
      const q = await issued()
      const fresh = await read(await post(freshRoute, 'fresh', q), freshQuotationV1)
      expect(fresh.picks).toEqual([{ persona: 'photographer', code: world.creators.sara!.code }])
      const m = await read(await match({ ref: fresh.briefReference, key: fresh.briefKey }), matchV1)
      expect(m.sections).toHaveLength(1)
    })

    it('MQ-US3-S7 a wrong key is 404 and reveals nothing', async () => {
      const q = await issued()
      const res = await call(viewRoute, `quotations/${q.reference}/nope`, { ref: q.reference, key: 'x'.repeat(43) })
      expect((await problemOf(res, 404)).code).toBe('api.errors.notFound')
    })
  })

  describe('US4 follow the booking and arrange payment', () => {
    it('MQ-US4-S1 MQ-US4-S3 MQ-US4-S6 confirmed shows awaiting payment; paid is a state the team recorded; no phone or payment detail ever shows', async () => {
      const q = await issued()
      await post(acceptRoute, 'accept', q)
      const payload = await getTestPayload()
      const id = (await bookingByRef(payload, q.reference)).id
      await applyTransition(payload, id, 'confirm', { actor: 'admin', now: new Date() })
      const confirmed = await view(q)
      expect(confirmed).toMatchObject({ state: 'confirmed', nextStep: 'pay' })
      expect(confirmed.progress.find((p) => p.key === 'confirmed')!.at).not.toBeNull()
      expect(confirmed.whatsappUrl).toContain(encodeURIComponent(q.reference))
      await applyTransition(payload, id, 'pay', { actor: 'admin', now: new Date() })
      const paid = await view(q)
      expect(paid).toMatchObject({ state: 'paid', nextStep: 'shootDay' })
      expect(paid.progress.find((p) => p.key === 'paid')!.at).not.toBeNull()
      expect(JSON.stringify([confirmed, paid])).not.toMatch(/\+9715|iban|card/i)
    })

    it('MQ-US4-S4 a creator who declined → another free creator at the same price', async () => {
      const q = await issued()
      await post(acceptRoute, 'accept', q)
      const payload = await getTestPayload()
      const booking = await bookingByRef(payload, q.reference)
      const rows = (booking.assignments ?? []).map((a) => ({ ...a, status: 'declined' as const }))
      await payload.update({ collection: 'bookings', id: booking.id, data: { assignments: rows } as never, overrideAccess: true, context: TRANSITION_CONTEXT })
      const v = await view(q)
      expect(v.nextStep).toBe('chooseAnother')
      expect(v.replacements[0]!.creators.map((c) => c.code)).toContain(world.creators.omar!.code)
      const next = await read(await post(pickRoute, 'pick-another', q, { persona: 'photographer', code: world.creators.omar!.code }), bookingViewV1)
      expect(next).toMatchObject({ state: 'accepted', nextStep: 'waitProfessional' })
      expect(next.professionals[0]!.name).toBe('Omar Ali')
    })
  })

  describe('US5 confirm delivery or report a problem', () => {
    const delivered = async () => {
      const q = await issued()
      await post(acceptRoute, 'accept', q)
      const payload = await getTestPayload()
      const id = (await bookingByRef(payload, q.reference)).id
      for (const event of ['confirm', 'pay', 'schedule', 'deliver'] as const) await applyTransition(payload, id, event, { actor: 'admin', now: new Date() })
      return q
    }

    it('MQ-US5-S1 MQ-US5-S2 delivered shows confirm and report; confirming completes it, repeats are harmless', async () => {
      const q = await delivered()
      expect(await view(q)).toMatchObject({ state: 'delivered', nextStep: 'confirmDelivery', canConfirmDelivery: true, canReport: true })
      const done = await read(await post(confirmRoute, 'confirm-delivery', q), bookingViewV1)
      expect(done).toMatchObject({ state: 'completed', nextStep: 'none', canConfirmDelivery: false })
      expect((await post(confirmRoute, 'confirm-delivery', q)).status).toBe(200)
      const booking = await bookingByRef(await getTestPayload(), q.reference)
      expect((booking as unknown as { payoutDueAt?: string }).payoutDueAt).toBeTruthy()
    })

    it('MQ-US5-S3 a reported problem puts the booking on hold with the text', async () => {
      const q = await delivered()
      expect((await problemOf(await post(reportRoute, 'report', q, { reason: 'bad' }), 422)).fields?.[0]).toMatchObject({ path: 'body.reason', code: 'booking.errors.reason' })
      const v = await read(await post(reportRoute, 'report', q, { reason: 'The photos never arrived.' }), bookingViewV1)
      expect(v).toMatchObject({ state: 'on-hold', nextStep: 'contactTeam', holdReason: 'The photos never arrived.' })
    })

    it('MQ-US5-S4 confirming is not offered once completed', async () => {
      const q = await delivered()
      await post(confirmRoute, 'confirm-delivery', q)
      expect((await view(q)).canConfirmDelivery).toBe(false)
      expect((await problemOf(await post(reportRoute, 'report', q, { reason: 'Too late to say' }), 409)).code).toBe('booking.errors.terminal')
    })
  })
})
