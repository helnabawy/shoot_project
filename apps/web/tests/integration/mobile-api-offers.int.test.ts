import { briefPricesV1, creatorBriefsV1, matchV1, problemV1, stampV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { POST as pricesRoute } from '@/app/(payload)/api/mobile/v1/brief-builder/prices/route'
import { GET as builderRoute } from '@/app/(payload)/api/mobile/v1/brief-builder/route'
import { POST as answerRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/[ref]/answer/route'
import { GET as briefsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/route'
import { GET as briefsStampRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/stamp/route'
import { POST as declineRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/offers/decline/route'
import { GET as matchRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/route'
import { GET as matchStampRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/stamp/route'
import type { RouteHandler } from '@/shared/api/handler'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { briefByRef, offersWorld } from './setup/offers'
import { getTestPayload } from './setup/payload'

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
})
