import { noContentV1, problemV1 } from '@shoot/domain/api/v1'
import { jwtSign } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { GET as catchAll, POST as catchAllPost } from '@/app/(payload)/api/mobile/[...rest]/route'
import { defineHandler, problem, type RouteHandler } from '@/shared/api/handler'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

/** Test-only handlers: 008 has no signed-in endpoint, so the wrapper's options are proven here. */
const whoAmI = z.object({ user: z.string().nullable(), locale: z.string(), visitor: z.string() })
const echo = (auth: 'none' | 'optional' | 'required') =>
  defineHandler({
    auth,
    cache: 'public',
    input: z.object({ query: z.object({ page: z.string().regex(/^\d+$/).optional() }) }),
    output: whoAmI,
    run: async (ctx) => ({ user: ctx.user ? String(ctx.user.id) : null, locale: ctx.locale, visitor: ctx.visitorKey }),
  })

const none = echo('none')
const optional = echo('optional')
const required = echo('required')
const limited = (action: string) =>
  defineHandler({
    auth: 'none',
    cache: 'no-store',
    rateLimit: { action, limit: 2 },
    input: z.object({}),
    output: z.object({ ok: z.literal(true) }),
    run: async () => ({ ok: true as const }),
  })
const settingsLimited = defineHandler({
  auth: 'none',
  cache: 'no-store',
  rateLimit: { action: 'settings', limit: (settings) => (settings.briefLimitPerHour ?? 5) - 4 },
  input: z.object({}),
  output: z.object({ ok: z.literal(true) }),
  run: async () => ({ ok: true as const }),
})
const throwing = defineHandler({
  auth: 'optional',
  cache: 'public',
  input: z.object({}),
  output: z.object({}),
  run: async () => {
    throw new Error('database password is hunter2')
  },
})
const wrongShape = defineHandler({
  auth: 'none',
  cache: 'public',
  input: z.object({}),
  output: z.object({ name: z.string() }),
  run: async () => ({ name: 42 }) as unknown as { name: string },
})
const notFound = defineHandler({ auth: 'none', cache: 'public', input: z.object({}), output: z.object({}), run: async () => problem(404, 'api.errors.notFound') })
const deprecated = defineHandler({ auth: 'none', cache: 'public', deprecated: true, input: z.object({}), output: z.object({}), run: async () => ({}) })
const accepted = defineHandler({
  auth: 'none',
  cache: 'no-store',
  status: 202,
  input: z.object({ body: z.object({ phone: z.string() }) }),
  output: z.object({ sent: z.boolean() }),
  run: async () => ({ sent: true }),
})
const noContent = defineHandler({ auth: 'none', cache: 'no-store', status: 204, input: z.object({}), output: noContentV1, run: async () => null })

function call(handler: RouteHandler, { path = '/api/mobile/v1/test', headers = {}, method = 'GET', body }: { path?: string; headers?: Record<string, string>; method?: string; body?: string } = {}) {
  return handler(new Request(`http://test${path}`, { method, headers, body }), { params: Promise.resolve({}) })
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` })
const installA = 'a'.repeat(32)
const installB = 'b'.repeat(32)

let memberToken = ''
let memberId = ''
let memberEmail = ''

describe('MR-US2 defineHandler', () => {
  beforeAll(async () => {
    await resetDatabase()
    const payload = await getTestPayload()
    await seed(payload, { log: () => {} })
    const member = await createUser(['member'])
    memberId = String(member.id)
    memberEmail = member.email
    const { token } = await payload.login({ collection: 'users', data: { email: member.email, password: 'password-123' } })
    memberToken = token as string
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('MR-US2-S7 declared access', () => {
    it('required with no token is 401 unauthorized', async () => {
      const res = await call(required)
      expect(res.status).toBe(401)
      expect(problemV1.parse(await res.json()).code).toBe('api.errors.unauthorized')
      expect(res.headers.get('cache-control')).toBe('no-store')
    })

    it('a garbage, tampered or expired token is 401 tokenInvalid on optional and required', async () => {
      const payload = await getTestPayload()
      const { token: expired } = await jwtSign({
        fieldsToSign: { id: Number(memberId), collection: 'users', email: memberEmail },
        secret: payload.secret,
        tokenExpiration: -60,
      })
      const tampered = `${memberToken.slice(0, -4)}AAAA`
      for (const handler of [optional, required]) {
        for (const token of ['garbage', tampered, expired]) {
          const res = await call(handler, { headers: bearer(token) })
          expect(res.status, token.slice(0, 12)).toBe(401)
          expect(problemV1.parse(await res.json()).code).toBe('api.errors.tokenInvalid')
        }
      }
    })

    it('a valid token is 200 and private', async () => {
      for (const handler of [optional, required]) {
        const res = await call(handler, { headers: bearer(memberToken) })
        expect(res.status).toBe(200)
        expect(res.headers.get('cache-control')).toBe('private, no-store')
        expect(res.headers.get('vary')).toBe('Accept-Language, Authorization')
        expect(whoAmI.parse(await res.json()).user).toBe(memberId)
      }
    })

    it('none ignores any token and stays public', async () => {
      for (const token of [memberToken, 'garbage']) {
        const res = await call(none, { headers: bearer(token) })
        expect(res.status).toBe(200)
        expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
        expect(res.headers.get('vary')).toBe('Accept-Language')
        expect(whoAmI.parse(await res.json()).user).toBeNull()
      }
    })

    it('the website cookie alone is a visitor on optional', async () => {
      const res = await call(optional, { headers: { cookie: `payload-token=${memberToken}` } })
      expect(res.status).toBe(200)
      expect(whoAmI.parse(await res.json()).user).toBeNull()
      expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
    })

    it('the catch-all answers a 404 problem for any method', async () => {
      for (const res of [await call(catchAll, { path: '/api/mobile/v2/site' }), await call(catchAllPost, { path: '/api/mobile/nope', method: 'POST', body: '{}' })]) {
        expect(res.status).toBe(404)
        expect(res.headers.get('content-type')).toBe('application/problem+json')
        expect(problemV1.parse(await res.json()).code).toBe('api.errors.notFound')
      }
    })
  })

  describe('MR-US2-S6 failures are problems with codes', () => {
    it('a thrown error is a 500 with no message or stack, logged without headers, query or user', async () => {
      const payload = await getTestPayload()
      const log = vi.spyOn(payload.logger, 'error').mockImplementation(() => undefined)
      const res = await call(throwing, {
        path: '/api/mobile/v1/test?secret=query-value',
        headers: { ...bearer(memberToken), 'x-shoot-install': installA, 'x-forwarded-for': '203.0.113.9', 'x-request-id': 'req-abcdef12' },
      })
      expect(res.status).toBe(500)
      const text = await res.text()
      expect(problemV1.parse(JSON.parse(text))).toEqual({ type: 'about:blank', status: 500, code: 'api.errors.unexpected' })
      expect(text).not.toContain('hunter2')
      expect(text).not.toContain('stack')
      expect(res.headers.get('x-request-id')).toBe('req-abcdef12')
      expect(log).toHaveBeenCalledOnce()
      const logged = JSON.stringify(log.mock.calls)
      expect(logged).toContain('req-abcdef12')
      for (const secret of ['query-value', memberToken, installA, '203.0.113.9', memberEmail]) expect(logged).not.toContain(secret)
    })

    it('an answer that does not match its schema is a 500 outside production', async () => {
      const payload = await getTestPayload()
      vi.spyOn(payload.logger, 'error').mockImplementation(() => undefined)
      const res = await call(wrongShape)
      expect(res.status).toBe(500)
      expect(problemV1.parse(await res.json()).code).toBe('api.errors.unexpected')
    })

    it('a returned problem is sent as it is', async () => {
      const res = await call(notFound, { headers: { 'accept-language': 'ar' } })
      expect(res.status).toBe(404)
      expect(res.headers.get('content-language')).toBe('ar')
      expect(res.headers.get('cache-control')).toBe('no-store')
    })

    it('invalid input is a 422 with field codes', async () => {
      const res = await call(none, { path: '/api/mobile/v1/test?page=x&locale=fr' })
      expect(res.status).toBe(422)
      expect(problemV1.parse(await res.json())).toEqual({
        type: 'about:blank',
        status: 422,
        code: 'api.errors.invalidInput',
        fields: [
          { path: 'query.locale', code: 'api.errors.localeUnsupported' },
          { path: 'query.page', code: 'api.errors.invalidField' },
        ],
      })
      const bad = await call(accepted, { method: 'POST', body: '{not json' })
      expect(problemV1.parse(await bad.json()).fields).toEqual([{ path: 'body', code: 'api.errors.invalidField' }])
    })
  })

  describe('MR-US2-S8 limits count per install id, else per address', () => {
    it('two installs behind one address each get their allowance', async () => {
      const handler = limited('install')
      const from = (install: string) => call(handler, { headers: { 'x-shoot-install': install, 'x-forwarded-for': '198.51.100.7' } })
      expect((await from(installA)).status).toBe(200)
      expect((await from(installA)).status).toBe(200)
      expect((await from(installB)).status).toBe(200)
      expect((await from(installB)).status).toBe(200)
      const third = await from(installA)
      expect(third.status).toBe(429)
      const body = problemV1.parse(await third.json())
      expect(body.code).toBe('api.errors.rateLimited')
      expect(body.retryAfter).toBeGreaterThan(0)
      expect(third.headers.get('retry-after')).toBe(String(body.retryAfter))
    })

    it('without an install id the address is counted, and a malformed id is ignored', async () => {
      const handler = limited('address')
      const from = (install?: string) => call(handler, { headers: { 'x-forwarded-for': '198.51.100.8', ...(install ? { 'x-shoot-install': install } : {}) } })
      expect((await from()).status).toBe(200)
      expect((await from('NOT-HEX')).status).toBe(200)
      expect((await from()).status).toBe(429)
    })

    it('a limit can come from the site settings', async () => {
      const from = () => call(settingsLimited, { headers: { 'x-forwarded-for': '198.51.100.9' } })
      expect((await from()).status).toBe(200)
      expect((await from()).status).toBe(429)
    })
  })

  describe('headers and statuses', () => {
    it('sets Content-Language, Vary, the request id and the JSON content type', async () => {
      const res = await call(none, { headers: { 'accept-language': 'ar-AE' } })
      expect(res.headers.get('content-language')).toBe('ar')
      expect(res.headers.get('vary')).toBe('Accept-Language')
      expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8')
      expect(res.headers.get('x-request-id')).toMatch(/^[\w-]{8,64}$/)
      expect(whoAmI.parse(await res.json()).locale).toBe('ar')
      expect((await call(none, { path: '/api/mobile/v1/test?locale=ar', headers: { 'accept-language': 'en' } })).headers.get('content-language')).toBe('ar')
    })

    it('FR-033 a deprecated endpoint answers Deprecation: true, the others do not', async () => {
      expect((await call(deprecated)).headers.get('deprecation')).toBe('true')
      expect((await call(none)).headers.get('deprecation')).toBeNull()
    })

    it('answers the declared 202 with a body and 204 without one', async () => {
      const res = await call(accepted, { method: 'POST', body: JSON.stringify({ phone: '+971500000000' }) })
      expect(res.status).toBe(202)
      expect(await res.json()).toEqual({ sent: true })
      expect(res.headers.get('cache-control')).toBe('no-store')
      const empty = await call(noContent, { method: 'DELETE' })
      expect(empty.status).toBe(204)
      expect(await empty.text()).toBe('')
      expect(empty.headers.get('content-type')).toBeNull()
    })
  })
})
