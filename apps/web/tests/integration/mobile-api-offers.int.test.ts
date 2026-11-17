import { bookingViewV1, briefPricesV1, creatorBriefsV1, matchV1, problemV1, quotationIssuedV1, stampV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { POST as pricesRoute } from '@/app/(payload)/api/mobile/v1/brief-builder/prices/route'
import { GET as builderRoute } from '@/app/(payload)/api/mobile/v1/brief-builder/route'
import { POST as answerRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/[ref]/answer/route'
import { GET as briefsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/route'
import { GET as briefsStampRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/stamp/route'
import { POST as declineRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/offers/decline/route'
import { POST as acceptQuoteRoute } from '@/app/(payload)/api/mobile/v1/quotations/[ref]/[key]/accept/route'
import { POST as issueRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/quotation/route'
import { POST as recordRoute } from '@/app/(payload)/api/mobile/v1/briefs/route'
import { GET as matchRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/route'
import { GET as matchStampRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/stamp/route'
import type { RouteHandler } from '@/shared/api/handler'
import { resetThrottle } from '@/shared/api/throttle'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { briefByRef, offersWorld } from './setup/offers'
import { createUser, getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')

async function tokenFor(user: { email: string }) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, opts: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', 'accept-language': 'en', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

async function ok<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBe(200)
  return schema.parse(await res.json())
}

/** Feature 022 over the mobile API: additive fields and the four new endpoints (contracts/mobile-api.md). */
describe('OF mobile API', () => {
  let world: BookingWorld
  let sara: string
  let day = 0
  const send = async () => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })

  beforeAll(async () => {
    world = await offersWorld()
    sara = await tokenFor(world.creators.sara!.user as never)
    asVisitor()
  })

  it('OF-US1-S1 the brief builder says offers are on, and prices answers the suggestion and range', async () => {
    const builder = (await (await call(builderRoute, 'brief-builder', null)).json()) as { offers?: { enabled: boolean } }
    expect(builder.offers?.enabled).toBe(true)
    const prices = await ok(await call(pricesRoute, 'brief-builder/prices', null, { method: 'POST', body: { values: { persona: 'photographer', occasion: 'event', duration: '2h', location: 'dubai' } } }), briefPricesV1)
    expect(prices.prices[0]).toMatchObject({ persona: 'photographer' })
    expect(prices.prices[0]!.suggestedFils).toBeGreaterThan(0)
    expect(prices.prices[0]!.minFils).toBeLessThan(prices.prices[0]!.suggestedFils!)
  })

  it('OF-US2-S4 OF-US3-S8 the inbox carries the price; an accept from an older app (no amount) is the client price; the stamp moves', async () => {
    const b = await send()
    const before = await ok(await call(briefsStampRoute, 'me/creator/briefs/stamp', sara), stampV1)
    const inbox = await ok(await call(briefsRoute, 'me/creator/briefs', sara), creatorBriefsV1)
    const item = inbox.open.find((i) => i.ref === b.ref)!
    expect(item.budgetFils).toBeGreaterThan(0)
    const answered = await ok(await call(answerRoute, `me/creator/briefs/${b.ref}/answer`, sara, { method: 'POST', params: { ref: b.ref }, body: { persona: item.persona, decision: 'accept' } }), creatorBriefsV1)
    expect(answered.accepted.find((i) => i.ref === b.ref)?.offerFils).toBe(item.budgetFils)
    resetThrottle() // the stamp is polled at most every 3 s (T082); this test reads it twice at once
    const after = await ok(await call(briefsStampRoute, 'me/creator/briefs/stamp', sara), stampV1)
    expect(after.stamp).not.toBe(before.stamp)
  })

  it('OF-US4-S5 OF-SC-006 step 2 lists the offers (older apps see the offerers and one price); declining answers step 2 again', async () => {
    const b = await send()
    const persona = String(world.personas.photographer)
    await call(answerRoute, `me/creator/briefs/${b.ref}/answer`, sara, { method: 'POST', params: { ref: b.ref }, body: { persona, decision: 'accept' } })
    const match = await ok(await call(matchRoute, `match/${b.ref}/${b.key}`, null, { params: { ref: b.ref, key: b.key } }), matchV1)
    expect(match.mode).toBe('offers')
    const section = match.sections[0]!
    expect(section.offers).toHaveLength(1)
    expect(section.creators.map((c) => c.code)).toEqual([world.creators.sara!.code])
    expect(section.priceFils).toBe(section.offers![0]!.totalFils)
    const stamp = await ok(await call(matchStampRoute, `match/${b.ref}/${b.key}/stamp`, null, { params: { ref: b.ref, key: b.key } }), stampV1)
    expect(stamp.stamp.length).toBeGreaterThan(0)
    const declined = await ok(
      await call(declineRoute, `match/${b.ref}/${b.key}/offers/decline`, null, { method: 'POST', params: { ref: b.ref, key: b.key }, body: { persona: 'photographer', creator: world.creators.sara!.code } }),
      matchV1,
    )
    expect(declined.sections[0]!.offers).toEqual([])
    expect(((await briefByRef(b.ref)).offers as { mode: string }).mode).toBe('offers')
  })

  it('OF-US3-S3 an out-of-range offer is a 422 problem', async () => {
    const b = await send()
    const res = await call(answerRoute, `me/creator/briefs/${b.ref}/answer`, sara, { method: 'POST', params: { ref: b.ref }, body: { persona: String(world.personas.photographer), decision: 'accept', amountFils: 100 } })
    expect(res.status).toBe(422)
    expect(problemV1.parse(await res.json()).code).toBe('offers.errors.outOfRange')
  })

  it('OF-SC-006 a released app (no new field anywhere) briefs, is answered, quotes and books on an offers brief', async () => {
    // The brief: the request exactly as a build before 022 sends it (no budgets, no place).
    const recorded = await call(recordRoute, 'briefs', null, { method: 'POST', body: { selections: [{ token: 'persona', value: 'photographer' }, { token: 'occasion', value: 'event' }, { token: 'duration', value: '2h' }, { token: 'location', value: 'dubai' }, { token: 'shotBy', value: 'anyone' }], date: addDays(world.date, 30) } })
    expect(recorded.status, await recorded.clone().text()).toBe(200)
    const receipt = (await recorded.json()) as { reference: string; matchPath: string | null }
    expect(receipt.matchPath).toBeTruthy()
    const [, , ref, key] = receipt.matchPath!.replace(/^\/ar/, '').split('/') as [string, string, string, string]
    expect(((await briefByRef(ref)).budgets as unknown[]).length).toBe(1) // no budget sent: the suggestion

    // The creator's older app accepts with no amount: that is the client's price.
    const answered = await ok(await call(answerRoute, `me/creator/briefs/${ref}/answer`, sara, { method: 'POST', params: { ref }, body: { persona: String(world.personas.photographer), decision: 'accept' } }), creatorBriefsV1)
    expect(answered.accepted.find((i) => i.ref === ref)?.offerFils).toBeGreaterThan(0)

    // Step 2 as the old app reads it: creators and one price per section, no offers needed.
    const match = await ok(await call(matchRoute, `match/${ref}/${key}`, null, { params: { ref, key } }), matchV1)
    expect(match.sections[0]!.creators.map((c) => c.code)).toEqual([world.creators.sara!.code])
    expect(match.sections[0]!.priceFils).toBeGreaterThan(0)

    // Quotation without `expect`, then accept as a signed-in member: confirmed (the creator already agreed).
    const client = await createUser(['member'], { accountType: 'seeker' })
    const payload = await getTestPayload()
    const clientToken = (await payload.login({ collection: 'users', data: { email: client.email!, password: 'password-123' } })).token as string
    const details = { date: String((await briefByRef(ref)).date).slice(0, 10), startTime: '18:30', duration: '2h', venue: 'Dubai Marina, Marina Walk' }
    const issued = await ok(await call(issueRoute, `match/${ref}/${key}/quotation`, clientToken, { method: 'POST', params: { ref, key }, body: { picks: [{ persona: 'photographer', code: world.creators.sara!.code }], details } }), quotationIssuedV1)
    const booked = await ok(await call(acceptQuoteRoute, `quotations/${issued.reference}/${issued.key}/accept`, clientToken, { method: 'POST', params: { ref: issued.reference, key: issued.key } }), bookingViewV1)
    expect(booked.state).toBe('confirmed')
    expect(booked.totalFils).toBeGreaterThan(0)
  })
})

