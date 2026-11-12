import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ENDPOINTS, problemV1, type Endpoint } from '@shoot/domain/api/v1'
import { beforeAll, describe, expect, it } from 'vitest'
import { GET as catchAll } from '@/app/(payload)/api/mobile/[...rest]/route'
import type { RouteHandler } from '@/shared/api/handler'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

/**
 * MR-US2-S7: every registered endpoint has its route file, exports its method and answers as its
 * access declares; every 008 endpoint is public, so a token changes nothing.
 */

const appDir = join(import.meta.dirname, '../../src/app/(payload)')

/** `/api/mobile/v1/creators/{code}` → `api/mobile/v1/creators/[code]`. */
const routeDir = (e: Endpoint) => e.path.replace(/^\//, '').replace(/\{([^}]+)\}/g, '[$1]')

/** Path params for endpoints that take them, valid against the seed (later stories add rows). */
const SAMPLE_PARAMS: Record<string, Record<string, string>> = {
  // US3: the seeded specialty; no creator or hire page is seeded.
  specialty: { specialty: 'portrait' },
  creatorProfile: { code: 'ZZZZZ' },
  hirePage: { slug: 'not-seeded' },
  // US4
  guide: { slug: 'not-seeded' },
  page: { slug: 'studios' },
  legal: { kind: 'terms' },
  legalVersions: { kind: 'terms' },
  legalVersion: { kind: 'terms', version: '1' },
  // 012: an unknown reference and key
  match: { ref: 'B-NONE', key: 'x' },
  quotationIssue: { ref: 'B-NONE', key: 'x' },
  quotationView: { ref: 'Q-NONE', key: 'x' },
  quotationAccept: { ref: 'Q-NONE', key: 'x' },
  quotationConfirmDelivery: { ref: 'Q-NONE', key: 'x' },
  quotationReport: { ref: 'Q-NONE', key: 'x' },
  quotationFresh: { ref: 'Q-NONE', key: 'x' },
  quotationPickAnother: { ref: 'Q-NONE', key: 'x' },
}
/** Endpoints whose sample params name nothing in the seed: a 404 problem is the declared answer. */
const NOT_IN_SEED = new Set<string>([
  // US3
  'creatorProfile',
  'hirePage',
  // US4: the seed has no guides (demo guides are opt-in).
  'guide',
])

async function handlerOf(e: Endpoint): Promise<RouteHandler | undefined> {
  const mod = (await import(/* @vite-ignore */ join(appDir, routeDir(e), 'route.ts'))) as Record<string, RouteHandler | undefined>
  return mod[e.method]
}

function request(e: Endpoint, headers: Record<string, string> = {}) {
  const params = SAMPLE_PARAMS[e.id] ?? {}
  const path = e.path.replace(/\{([^}]+)\}/g, (_, name: string) => encodeURIComponent(params[name] ?? 'x'))
  return [new Request(`http://test${path}`, { method: e.method, headers }), { params: Promise.resolve(params) }] as const
}

let seekerToken = ''

/**
 * Feature 012's private-link endpoints (contracts/booking-api.md): never cached, and an anonymous call with
 * an unknown reference is a 404 (a missing token on the issue endpoint a 401, a missing body a 422); their own
 * suite (`mobile-api-booking.int.test.ts`) covers the rest.
 */
const BOOKING: Record<string, number> = {
  match: 404,
  quotationIssue: 401,
  quotationView: 404,
  quotationAccept: 404,
  quotationConfirmDelivery: 404,
  quotationFresh: 404,
  quotationReport: 422,
  quotationPickAnother: 422,
}

/** Feature 009's endpoints: an anonymous call is refused as declared (401 signed in, 422 without a body); their own suites cover the rest. */
const SIGN_IN = new Set(['otpRequest', 'otpVerify', 'authRefresh', 'authLogout', 'me'])

describe('MR-US2-S7 every registered endpoint', () => {
  beforeAll(async () => {
    await resetDatabase()
    const payload = await getTestPayload()
    await seed(payload, { log: () => {} })
    const seeker = await createUser(['member'], { accountType: 'seeker' })
    const { token } = await payload.login({ collection: 'users', data: { email: seeker.email!, password: 'password-123' } })
    seekerToken = token as string
  })

  it('registers at least the US1 endpoints, all public in 008', () => {
    expect(ENDPOINTS.map((e) => e.id)).toEqual(expect.arrayContaining(['site', 'navigation', 'personas', 'briefBuilder', 'landing']))
    // 009's sign-in endpoints are the only ones that are not public reads: no-store, POST or signed in.
    for (const e of ENDPOINTS.filter((x) => !SIGN_IN.has(x.id) && !(x.id in BOOKING))) expect([e.id, e.auth, e.cache]).toEqual([e.id, 'none', 'public'])
    for (const e of ENDPOINTS.filter((x) => SIGN_IN.has(x.id) || x.id in BOOKING)) expect([e.id, e.cache]).toEqual([e.id, 'no-store'])
  })

  for (const e of ENDPOINTS) {
    it(`${e.id}: the route file exists and exports ${e.method}`, async () => {
      expect(existsSync(join(appDir, routeDir(e), 'route.ts')), routeDir(e)).toBe(true)
      expect(typeof (await handlerOf(e))).toBe('function')
    })

    it(`SC-001 ${e.id}: an anonymous call answers in English and Arabic as declared`, async () => {
      const handler = (await handlerOf(e)) as RouteHandler
      for (const locale of ['en', 'ar']) {
        const res = await handler(...request(e, { 'accept-language': locale }))
        expect(res.headers.get('content-language')).toBe(locale)
        if (SIGN_IN.has(e.id)) {
          expect(res.status, e.id).toBe(e.auth === 'required' ? 401 : 422)
          expect(res.headers.get('cache-control')).toBe('no-store')
          expect(problemV1.parse(await res.json()).code).toBe(e.auth === 'required' ? 'api.errors.unauthorized' : 'api.errors.invalidInput')
          continue
        }
        if (e.id in BOOKING) {
          expect(res.status, `${e.id} ${locale}`).toBe(BOOKING[e.id])
          expect(res.headers.get('cache-control')).toBe('no-store')
          problemV1.parse(await res.json())
          continue
        }
        if (NOT_IN_SEED.has(e.id)) {
          expect(res.status).toBe(404)
          expect(problemV1.parse(await res.json()).code).toBe('api.errors.notFound')
          continue
        }
        expect(res.status, `${e.id} ${locale}`).toBe(e.status)
        expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
        const body = e.output.parse(await res.json()) as { locale?: string }
        if (body.locale !== undefined) expect(body.locale).toBe(locale)
      }
    })

    it(`${e.id}: a seeker token changes nothing and the answer stays public`, async () => {
      if (e.id in BOOKING) return // a token is part of their own suite
      if (SIGN_IN.has(e.id)) return // a token is the point of these (and logout would end the shared session)
      const handler = (await handlerOf(e)) as RouteHandler
      const anonymous = await handler(...request(e))
      const signedIn = await handler(...request(e, { authorization: `Bearer ${seekerToken}` }))
      expect(signedIn.status).toBe(anonymous.status)
      expect(signedIn.headers.get('cache-control')).toBe(anonymous.headers.get('cache-control'))
      expect(await signedIn.json()).toEqual(await anonymous.json())
    })
  }

  it('unknown addresses and other versions answer a 404 problem', async () => {
    for (const path of ['/api/mobile/v1/nope', '/api/mobile/v2/site']) {
      const res = await catchAll(new Request(`http://test${path}`), { params: Promise.resolve({ rest: path.split('/').slice(3) }) })
      expect(res.status).toBe(404)
      expect(res.headers.get('content-type')).toBe('application/problem+json')
      expect(problemV1.parse(await res.json()).code).toBe('api.errors.notFound')
    }
  })

  it('a method a route does not export is left to Next (405, the documented exception)', async () => {
    for (const e of ENDPOINTS.filter((x) => x.method === 'GET')) {
      const mod = (await import(/* @vite-ignore */ join(appDir, routeDir(e), 'route.ts'))) as Record<string, unknown>
      expect(mod.POST, e.id).toBeUndefined()
    }
  })
})
