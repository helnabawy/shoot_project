import { authRefreshV1, meV1, problemV1 } from '@shoot/domain/api/v1'
import { createLocalReq, logoutOperation } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as logout } from '@/app/(payload)/api/mobile/v1/auth/logout/route'
import { POST as refresh } from '@/app/(payload)/api/mobile/v1/auth/refresh/route'
import { GET as me } from '@/app/(payload)/api/mobile/v1/me/route'
import { mintSession } from '@/modules/auth/otp/mint'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { createCodeAccount } from '@/modules/auth/otp/signup'
import { seed } from '@/shared/payload/seed/seed'
import { bearer, call, freshPhone } from './setup/otp'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

/** The parts of a JWT, without verifying it (no new package for a test). */
const part = (token: string, i: 0 | 1) => JSON.parse(Buffer.from(token.split('.')[i]!, 'base64url').toString('utf8')) as Record<string, unknown>
const decodeProtectedHeader = (token: string) => part(token, 0)
const decodeJwt = (token: string) => part(token, 1)

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

async function codeAccount() {
  const payload = await getTestPayload()
  return createCodeAccount(payload, { phone: freshPhone(), signup: undefined, personaIds: [], locale: 'en', now: new Date() })
}
async function sessionsOf(id: number) {
  const payload = await getTestPayload()
  const user = (await payload.db.findOne({ collection: 'users', where: { id: { equals: id } } })) as { sessions?: { id: string; expiresAt: string | Date }[] }
  return user.sessions ?? []
}

describe('009 US3 sessions: minting, refresh, logout, me', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })
  afterEach(() => vi.useRealTimers())
  afterAll(() => setOtpProvider(undefined))

  describe('OT-US3-S8 the minting tripwire (research R2: mirrors payload/dist/auth/sessions.js)', () => {
    it('mintSession returns { token, exp }; payload.auth accepts the Bearer token with its session id', async () => {
      const payload = await getTestPayload()
      const user = await codeAccount()
      const before = Date.now()
      const { token, exp, sid } = await mintSession(payload, user.id)
      expect(exp * 1000 - before).toBeGreaterThan(SEVEN_DAYS - 5_000)
      const { user: authed } = await payload.auth({ headers: new Headers(bearer(token)) })
      expect(authed?.id).toBe(user.id)
      expect((authed as { _sid?: string })._sid).toBe(sid)
      const [session] = (await sessionsOf(user.id)).filter((s) => s.id === sid)
      expect(new Date(session!.expiresAt).getTime() - before).toBeGreaterThan(SEVEN_DAYS - 5_000)
    })

    it('the minted token has the same protected header and claim keys as a password-login token', async () => {
      const payload = await getTestPayload()
      const emailUser = await createUser(['member'])
      const login = await payload.login({ collection: 'users', data: { email: emailUser.email!, password: 'password-123' } })
      const minted = await mintSession(payload, emailUser.id)
      expect(decodeProtectedHeader(minted.token)).toEqual(decodeProtectedHeader(login.token!))
      expect(Object.keys(decodeJwt(minted.token)).sort()).toEqual(Object.keys(decodeJwt(login.token!)).sort())
      const code = await mintSession(payload, (await codeAccount()).id)
      expect(decodeJwt(code.token).email).toBeUndefined()
      expect(JSON.stringify(decodeJwt(code.token))).not.toContain('+971')
    })

    it('logoutOperation removes the session; the same token then gives user: null', async () => {
      const payload = await getTestPayload()
      const user = await codeAccount()
      const { token } = await mintSession(payload, user.id)
      const { user: authed } = await payload.auth({ headers: new Headers(bearer(token)) })
      await logoutOperation({ collection: payload.collections.users, req: await createLocalReq({ user: authed! }, payload) })
      expect((await payload.auth({ headers: new Headers(bearer(token)) })).user).toBeNull()
    })

    it('an expired session (clock moved 7 days) gives user: null', async () => {
      const payload = await getTestPayload()
      const { token } = await mintSession(payload, (await codeAccount()).id)
      vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + SEVEN_DAYS + 60_000 })
      expect((await payload.auth({ headers: new Headers(bearer(token)) })).user).toBeNull()
    })
  })

  it('OT-US3-S2 refresh keeps the session id and moves its expiry to now + 7 days; a removed session or no token is 401', async () => {
    const payload = await getTestPayload()
    const user = await codeAccount()
    const { token, sid } = await mintSession(payload, user.id)
    const later = Date.now() + 3 * 24 * 60 * 60 * 1000
    vi.useFakeTimers({ toFake: ['Date'], now: later })
    const res = await call(refresh, 'auth/refresh', { headers: bearer(token) })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    const body = authRefreshV1.parse(await res.json())
    expect(decodeJwt(body.token).sid).toBe(sid)
    const [session] = (await sessionsOf(user.id)).filter((s) => s.id === sid)
    expect(new Date(session!.expiresAt).getTime() - later).toBeGreaterThan(SEVEN_DAYS - 5_000)
    vi.useRealTimers()

    expect(problemV1.parse(await (await call(refresh, 'auth/refresh')).json()).code).toBe('api.errors.unauthorized')
    const gone = await mintSession(payload, user.id)
    await call(logout, 'auth/logout', { headers: bearer(gone.token) })
    const afterLogout = await call(refresh, 'auth/refresh', { headers: bearer(gone.token) })
    expect(afterLogout.status).toBe(401)
    expect(problemV1.parse(await afterLogout.json()).code).toBe('api.errors.tokenInvalid')
  })

  it('OT-US3-S3 logout answers 204 with no body; the token then gets 401 tokenInvalid on me and on logout', async () => {
    const payload = await getTestPayload()
    const { token } = await mintSession(payload, (await codeAccount()).id)
    const res = await call(logout, 'auth/logout', { headers: bearer(token) })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    const mine = await call(me, 'me', { method: 'GET', headers: bearer(token) })
    expect(mine.status).toBe(401)
    expect(problemV1.parse(await mine.json()).code).toBe('api.errors.tokenInvalid')
    expect((await call(logout, 'auth/logout', { headers: bearer(token) })).status).toBe(401)
  })

  it('GET me answers the member their own number with private, no-store; an email account has phone null', async () => {
    const payload = await getTestPayload()
    const user = await codeAccount()
    const { token } = await mintSession(payload, user.id)
    const res = await call(me, 'me', { method: 'GET', headers: { ...bearer(token), 'accept-language': 'ar' } })
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(meV1.parse(await res.json())).toEqual({ id: String(user.id), name: null, phone: user.username, email: null, accountType: 'seeker', personas: [], locale: 'ar' })
    const emailUser = await createUser(['member'])
    const login = await payload.login({ collection: 'users', data: { email: emailUser.email!, password: 'password-123' } })
    const email = meV1.parse(await (await call(me, 'me', { method: 'GET', headers: bearer(login.token!) })).json())
    expect(email).toMatchObject({ phone: null, email: emailUser.email })
  })
})
