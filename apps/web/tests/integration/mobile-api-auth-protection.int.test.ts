import { OTP_LIMITS } from '@shoot/domain/auth'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as logout } from '@/app/(payload)/api/mobile/v1/auth/logout/route'
import { POST as request } from '@/app/(payload)/api/mobile/v1/auth/otp/request/route'
import { POST as verifyRoute } from '@/app/(payload)/api/mobile/v1/auth/otp/verify/route'
import { POST as refresh } from '@/app/(payload)/api/mobile/v1/auth/refresh/route'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { seed } from '@/shared/payload/seed/seed'
import { bearer, call, freshPhone, installRecordingProvider, requestFor, verify, wrong } from './setup/otp'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

let provider: ReturnType<typeof installRecordingProvider>
type Db = { drizzle: { execute: (q: unknown) => Promise<{ rows: Record<string, unknown>[] }> } }
const rows = async (query: unknown) => ((await getTestPayload()).db as unknown as Db).drizzle.execute(query).then((r) => r.rows)
const requestAs = (phone: string, headers: Record<string, string>) => call(request, 'auth/otp/request', { body: { phone }, headers })

/** Every format a number could be written in, for the log scan. */
const formatsOf = (e164: string) => {
  const local = e164.slice(4)
  return [e164, e164.slice(1), `0${local}`, local, `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`]
}

describe('009 US2 a code only the number owner can use', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
    provider = installRecordingProvider()
  })
  afterEach(() => vi.restoreAllMocks())
  afterAll(() => setOtpProvider(undefined))

  it('OT-US2-S1 numbers with and without an account get the same status, keys and shapes, and the user table is not read', async () => {
    const payload = await getTestPayload()
    const known = freshPhone()
    const first = await requestFor(request, provider, known)
    await verify(verifyRoute, { challengeId: first.challenge.challengeId, phone: known, code: first.code })
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse(first.challenge.resendAt) + 1 })
    const find = vi.spyOn(payload, 'find')
    const findByID = vi.spyOn(payload, 'findByID')
    const a = await call(request, 'auth/otp/request', { body: { phone: known }, headers: { 'x-forwarded-for': '10.50.0.1' } })
    const b = await call(request, 'auth/otp/request', { body: { phone: freshPhone() }, headers: { 'x-forwarded-for': '10.50.0.2' } })
    vi.useRealTimers()
    expect(a.status).toBe(202)
    expect(b.status).toBe(a.status)
    const [ja, jb] = [(await a.json()) as Record<string, string>, (await b.json()) as Record<string, string>]
    expect(Object.keys(ja)).toEqual(Object.keys(jb))
    const shape = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/[\da-f]/g, '0') : typeof v]))
    expect(shape(ja)).toEqual(shape(jb))
    const collections = [...find.mock.calls, ...findByID.mock.calls].map(([args]) => (args as { collection: string }).collection)
    expect(collections).not.toContain('users')
  })

  describe('OT-US2-S2 limits per number, address and install, with retryAfter', () => {
    it('the sixth request for one number in an hour is tooManyRequests, and the key holds only the fingerprint', async () => {
      const phone = freshPhone()
      let now = Date.now()
      for (let i = 0; i < OTP_LIMITS.requestsPerPhone; i++) {
        vi.useFakeTimers({ toFake: ['Date'], now })
        expect((await requestAs(phone, { 'x-forwarded-for': `10.60.0.${i}` })).status).toBe(202)
        now += 61_000
      }
      vi.useFakeTimers({ toFake: ['Date'], now })
      const res = await requestAs(phone, { 'x-forwarded-for': '10.60.0.99' })
      vi.useRealTimers()
      expect(res.status).toBe(429)
      const body = (await res.json()) as { code: string; retryAfter: number }
      expect(body.code).toBe('auth.errors.tooManyRequests')
      expect(body.retryAfter).toBeGreaterThan(0)
      expect(res.headers.get('retry-after')).toBe(String(body.retryAfter))
      const keys = (await rows(sql`SELECT key FROM rate_limits WHERE key LIKE 'otp%'`)).map((r) => String(r.key))
      for (const f of formatsOf(phone)) expect(keys.join('\n')).not.toContain(f)
      expect(keys.some((k) => /^otp:phone:[0-9a-f]{64}$/.test(k))).toBe(true)
    })

    it('the 21st request from one address and the 11th from one install id are refused', async () => {
      const address = { 'x-forwarded-for': '10.61.0.1' }
      for (let i = 0; i < OTP_LIMITS.requestsPerIp; i++) expect((await requestAs(freshPhone(), address)).status).toBe(202)
      expect((await (await requestAs(freshPhone(), address)).json()) as object).toMatchObject({ status: 429, code: 'auth.errors.tooManyRequests' })

      const install = { 'x-shoot-install': 'c'.repeat(32) }
      for (let i = 0; i < OTP_LIMITS.requestsPerInstall; i++) expect((await requestAs(freshPhone(), { ...install, 'x-forwarded-for': `10.62.0.${i}` })).status).toBe(202)
      expect((await requestAs(freshPhone(), { ...install, 'x-forwarded-for': '10.62.1.1' })).status).toBe(429)
    })

    it('the 31st verify from one address is refused', async () => {
      const phone = freshPhone()
      const { challenge, code } = await requestFor(request, provider, phone)
      const address = { 'x-forwarded-for': '10.63.0.1' }
      for (let i = 0; i < OTP_LIMITS.verifiesPerIp; i++) {
        await verify(verifyRoute, { challengeId: '00000000-0000-4000-8000-000000000000', phone, code: wrong(code) }, address)
      }
      const res = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code }, address)
      expect(res.res.status).toBe(429)
      expect(res.problem?.code).toBe('auth.errors.tooManyRequests')
    })
  })

  it('OT-US2-S3 the stored challenge holds neither the number nor the code in any column', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const [row] = await rows(sql`SELECT * FROM otp_challenges WHERE public_id = ${challenge.challengeId}`)
    const text = JSON.stringify(row)
    expect(text).not.toContain(code)
    for (const f of formatsOf(phone)) expect(text).not.toContain(f)
    expect(String(row?.code_hash)).toMatch(/^[0-9a-f]{64}$/)
    expect(String(row?.phone_hash)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('OT-US2-S4 no number or code reaches the logs across request, wrong and right verify, refresh, logout and a provider failure', async () => {
    const payload = await getTestPayload()
    const lines: string[] = []
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const) {
      vi.spyOn(payload.logger, level).mockImplementation(((...args: unknown[]) => void lines.push(JSON.stringify(args))) as never)
    }
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void lines.push(JSON.stringify(args)))
    }
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code: wrong(code) })
    const ok = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })
    const token = ok.token!.token
    const renewed = await call(refresh, 'auth/refresh', { headers: bearer(token) })
    await call(logout, 'auth/logout', { headers: bearer(((await renewed.json()) as { token: string }).token) })
    provider.fail = { ok: false, reason: 'unavailable' }
    const failedPhone = freshPhone()
    await call(request, 'auth/otp/request', { body: { phone: failedPhone }, headers: { 'x-forwarded-for': '10.64.0.1' } })
    provider.fail = null
    const failedCode = provider.sent.at(-1)!.code
    const said = lines.join('\n')
    expect(lines.some((l) => l.includes('send failed'))).toBe(true)
    for (const f of [...formatsOf(phone), ...formatsOf(failedPhone)]) expect(said).not.toContain(f)
    expect(said).not.toContain(code)
    expect(said).not.toContain(failedCode)
    expect(said).not.toContain(token)
  })

  it('OT-US2-S6 an editor or admin number is refused with useEmailSignIn after a correct code; no session, challenge used', async () => {
    const payload = await getTestPayload()
    for (const role of ['editor', 'admin'] as const) {
      const phone = freshPhone()
      const staff = await createUser([role])
      await payload.update({ collection: 'users', id: staff.id, data: { username: phone } as never, overrideAccess: true })
      const { challenge, code } = await requestFor(request, provider, phone)
      const res = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })
      expect(res.res.status).toBe(403)
      expect(res.problem?.code).toBe('auth.errors.useEmailSignIn')
      const raw = (await payload.db.findOne({ collection: 'users', where: { id: { equals: staff.id } } })) as { sessions?: unknown[] }
      expect(raw.sessions ?? []).toHaveLength(0)
      expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })).problem?.code).toBe('auth.errors.codeExpired')
    }
  })
})
