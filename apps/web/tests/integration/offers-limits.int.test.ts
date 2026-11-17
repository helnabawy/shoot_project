import { problemV1, stampV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as matchStampRoute } from '@/app/(payload)/api/mobile/v1/match/[ref]/[key]/stamp/route'
import type { RouteHandler } from '@/shared/api/handler'
import { resetThrottle } from '@/shared/api/throttle'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { offersWorld } from './setup/offers'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')

function call(handler: RouteHandler, path: string, install: string, params: Record<string, string>) {
  return handler(new Request(`http://test/api/mobile/v1/${path}`, { headers: { 'accept-language': 'en', 'x-shoot-install': install } }), { params: Promise.resolve(params) })
}

/** Feature 022 T082 (constitution VII): the polled stamps answer at most every few seconds per install. */
describe('OF limits on the offer endpoints', () => {
  let world: BookingWorld
  beforeAll(async () => {
    world = await offersWorld()
    asVisitor()
  })
  beforeEach(() => resetThrottle())

  it('OF-US4-S2 a second stamp read within 3 s is a 429 with Retry-After; another install is not affected', async () => {
    const b = await briefFor(submitBrief as never, world, { date: addDays(world.date, 3) })
    const params = { ref: b.ref, key: b.key }
    const path = `match/${b.ref}/${b.key}/stamp`
    const first = await call(matchStampRoute, path, '1'.repeat(32), params)
    expect(first.status).toBe(200)
    stampV1.parse(await first.json())
    const again = await call(matchStampRoute, path, '1'.repeat(32), params)
    expect(again.status).toBe(429)
    expect(Number(again.headers.get('retry-after'))).toBeGreaterThanOrEqual(1)
    expect(problemV1.parse(await again.json()).code).toBe('api.errors.rateLimited')
    const other = await call(matchStampRoute, path, '2'.repeat(32), params)
    expect(other.status).toBe(200)
  })

  it('an unknown brief starts no wait', async () => {
    const params = { ref: 'B-NONE1', key: 'x' }
    for (let i = 0; i < 2; i++) expect((await call(matchStampRoute, 'match/B-NONE1/x/stamp', '3'.repeat(32), params)).status).toBe(404)
  })
})
