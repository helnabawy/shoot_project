import { meV1 } from '@shoot/domain/api/v1'
import { sql } from '@payloadcms/db-postgres'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { POST as request } from '@/app/(payload)/api/mobile/v1/auth/otp/request/route'
import { POST as verifyRoute } from '@/app/(payload)/api/mobile/v1/auth/otp/verify/route'
import { GET as me } from '@/app/(payload)/api/mobile/v1/me/route'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { createCodeAccount, isUniqueViolation } from '@/modules/auth/otp/signup'
import { seed } from '@/shared/payload/seed/seed'
import { bearer, call, freshPhone, installRecordingProvider, requestFor, verify, wrong } from './setup/otp'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

let provider: ReturnType<typeof installRecordingProvider>

const usersWith = async (phone: string) => {
  const payload = await getTestPayload()
  return (await payload.find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true, depth: 0 })).docs
}
const acceptancesOf = async (userId: number) => {
  const payload = await getTestPayload()
  return (await payload.find({ collection: 'legal-acceptances', where: { user: { equals: userId } }, overrideAccess: true, depth: 0 })).docs
}
const attemptsOf = async (challengeId: string) => {
  const payload = await getTestPayload()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { attempts: string }[] }> } }
  const { rows } = await db.drizzle.execute(sql`SELECT attempts FROM otp_challenges WHERE public_id = ${challengeId}`)
  return Number(rows[0]?.attempts)
}

describe('009 US1 sign in with a number and a code (auth/otp/request, auth/otp/verify)', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
    provider = installRecordingProvider()
  })
  afterEach(() => vi.useRealTimers())
  afterAll(() => setOtpProvider(undefined))

  it('OT-US1-S1 a valid number by SMS: 202, normalised, resendAt = now + 60 s, one SMS with the domain-bound line, no-store', async () => {
    const before = Date.now()
    const { challenge, message, res } = await requestFor(request, provider, '050 123 4567')
    expect(res.status).toBe(202)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(challenge.phone).toBe('+971501234567')
    expect(challenge.channel).toBe('sms')
    const resendIn = Date.parse(challenge.resendAt) - before
    expect(resendIn).toBeGreaterThanOrEqual(60_000)
    expect(resendIn).toBeLessThan(90_000) // the machine may be slow; the exact rule is in otp.test.ts
    expect(Date.parse(challenge.expiresAt) - Date.parse(challenge.resendAt)).toBe(4 * 60_000)
    expect(message).toMatchObject({ channel: 'sms', to: '+971501234567', locale: 'en', challengeId: challenge.challengeId })
    expect(message.text).toBe(`Your Shoot code is ${message.code}. It expires in 5 minutes. Don't share it.\n\n@localhost:3000 #${message.code}`)
  })

  it('OT-US1-S1 with Accept-Language: ar the SMS is Arabic and keeps the domain-bound line (FR-042)', async () => {
    const { message, res } = await requestFor(request, provider, freshPhone(), { headers: { 'accept-language': 'ar' } })
    expect(res.headers.get('content-language')).toBe('ar')
    expect(message.locale).toBe('ar')
    expect(message.text).not.toContain('Your Shoot code')
    expect(message.text.split('\n').at(-1)).toBe(`@localhost:3000 #${message.code}`)
  })

  it('OT-US1-S9 a landline or foreign number is a field error and nothing is sent', async () => {
    const sent = provider.sent.length
    for (const phone of ['04 123 4567', '+966501234567']) {
      const res = await call(request, 'auth/otp/request', { body: { phone } })
      expect(res.status).toBe(422)
      expect(await res.json()).toMatchObject({ code: 'api.errors.invalidInput', fields: [{ path: 'body.phone', code: 'auth.errors.phoneInvalid' }] })
    }
    expect(provider.sent.length).toBe(sent)
  })

  it('OT-US1-S2 the right code for a new number creates a client account with two acceptances and signs in (name optional, FR-014)', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const { res, token } = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(token?.isNew).toBe(true)
    expect(token?.user).toMatchObject({ phone, email: null, name: null, accountType: 'seeker', personas: [] })
    const [user] = await usersWith(phone)
    expect(user).toMatchObject({ username: phone, phone, roles: ['member'], accountType: 'seeker' })
    expect(user?.email ?? null).toBeNull()
    expect((await acceptancesOf(user!.id)).map((a) => a.kind).sort()).toEqual(['privacy', 'terms'])
    const mine = await call(me, 'me', { method: 'GET', headers: bearer(token!.token) })
    expect(mine.status).toBe(200)
    expect(mine.headers.get('cache-control')).toBe('private, no-store')
    expect(meV1.parse(await mine.json())).toMatchObject({ id: String(user!.id), phone })

    const named = freshPhone()
    const second = await requestFor(request, provider, named)
    const withName = await verify(verifyRoute, { challengeId: second.challenge.challengeId, phone: named, code: second.code, signup: { name: 'Sara' } })
    expect(withName.token?.user.name).toBe('Sara')
  })

  it('FR-013 an unverified contact phone equal to the number is not an account: the code creates a separate one', async () => {
    const phone = freshPhone()
    const typist = await createUser(['member'], { phone })
    const { challenge, code } = await requestFor(request, provider, phone)
    const { token } = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })
    expect(token?.isNew).toBe(true)
    expect(token?.user.id).not.toBe(String(typist.id))
  })

  it('OT-US1-S3 a known number signs in to the same account; a provider signup is ignored', async () => {
    const phone = freshPhone()
    const first = await requestFor(request, provider, phone)
    const a = await verify(verifyRoute, { challengeId: first.challenge.challengeId, phone, code: first.code })
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse(first.challenge.resendAt) + 1 })
    const again = await requestFor(request, provider, phone, { channel: 'whatsapp' })
    expect(again.message.channel).toBe('whatsapp')
    const b = await verify(verifyRoute, {
      challengeId: again.challenge.challengeId,
      phone,
      code: again.code,
      signup: { accountType: 'provider', personas: ['photographer'], acceptTerms: true },
    })
    expect(b.token?.isNew).toBe(false)
    expect(b.token?.user.id).toBe(a.token?.user.id)
    expect(b.token?.user.accountType).toBe('seeker')
    expect(await usersWith(phone)).toHaveLength(1)
  })

  it('OT-US1-S4 a wrong code is codeInvalid and counts an attempt; a number not matching the challenge answers the same', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const bad = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code: wrong(code) })
    expect(bad.res.status).toBe(422)
    expect(bad.problem).toMatchObject({ code: 'auth.errors.codeInvalid', fields: [{ path: 'body.code', code: 'auth.errors.codeInvalid' }] })
    expect(await attemptsOf(challenge.challengeId)).toBe(1)
    const otherNumber = await verify(verifyRoute, { challengeId: challenge.challengeId, phone: freshPhone(), code })
    expect(otherNumber.problem).toEqual(bad.problem)
  })

  it('OT-US1-S5 after five wrong codes even the right one is codeLocked', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    for (let i = 0; i < 5; i++) expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code: wrong(code) })).problem?.code).toBe('auth.errors.codeInvalid')
    expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })).problem?.code).toBe('auth.errors.codeLocked')
  })

  it('OT-US1-S6 five minutes later the code is codeExpired', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse(challenge.expiresAt) + 1 })
    expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })).problem?.code).toBe('auth.errors.codeExpired')
  })

  it('OT-US1-S7 no resend within 60 s (429 with retryAfter); after it a new code is sent and the first answers codeExpired', async () => {
    const phone = freshPhone()
    const first = await requestFor(request, provider, phone)
    const res = await call(request, 'auth/otp/request', { body: { phone }, headers: { 'x-forwarded-for': '10.200.0.1' } })
    expect(res.status).toBe(429)
    const body = (await res.json()) as { code: string; retryAfter: number }
    expect(body.code).toBe('auth.errors.resendTooSoon')
    expect(body.retryAfter).toBeGreaterThan(0)
    expect(body.retryAfter).toBeLessThanOrEqual(60)
    expect(res.headers.get('retry-after')).toBe(String(body.retryAfter))
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse(first.challenge.resendAt) + 1 })
    const second = await requestFor(request, provider, phone)
    expect(second.code).toMatch(/^\d{6}$/)
    expect((await verify(verifyRoute, { challengeId: first.challenge.challengeId, phone, code: first.code })).problem?.code).toBe('auth.errors.codeExpired')
    expect((await verify(verifyRoute, { challengeId: second.challenge.challengeId, phone, code: second.code })).res.status).toBe(200)
  })

  it('a used code cannot be used again', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })).res.status).toBe(200)
    expect((await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })).problem?.code).toBe('auth.errors.codeExpired')
  })

  it('a failed send answers 503 sendFailed and the challenge can never be used; the cooldown does not apply after it', async () => {
    const phone = freshPhone()
    provider.fail = { ok: false, reason: 'unreachable' }
    const res = await call(request, 'auth/otp/request', { body: { phone, channel: 'whatsapp' }, headers: { 'x-forwarded-for': '10.201.0.1' } })
    provider.fail = null
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ code: 'auth.errors.sendFailed' })
    const failed = provider.sent.at(-1)!
    expect((await verify(verifyRoute, { challengeId: failed.challengeId, phone, code: failed.code })).problem?.code).toBe('auth.errors.codeExpired')
    expect((await requestFor(request, provider, phone)).res.status).toBe(202)
  })

  it('concurrency: two parallel verifies of one right code give exactly one 200; two first verifies of a new number give one user', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const results = await Promise.all([1, 2].map(() => verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })))
    expect(results.map((r) => r.res.status).sort()).toEqual([200, 422])

    // A newer challenge supersedes an older one, so two devices can only race the account creation
    // itself: the unique username index refuses the second, which verify-code then re-reads.
    const racer = freshPhone()
    const payload = await getTestPayload()
    const make = () => createCodeAccount(payload, { phone: racer, signup: undefined, personaIds: [], locale: 'en', now: new Date() })
    const outcomes = await Promise.allSettled([make(), make()])
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1)
    const refused = outcomes.find((o) => o.status === 'rejected') as PromiseRejectedResult
    expect(isUniqueViolation(refused.reason)).toBe(true)
    expect(await usersWith(racer)).toHaveLength(1)
  })
})
