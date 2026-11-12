import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from '@payloadcms/db-postgres'
import { POST as request } from '@/app/(payload)/api/mobile/v1/auth/otp/request/route'
import { POST as verifyRoute } from '@/app/(payload)/api/mobile/v1/auth/otp/verify/route'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { seed } from '@/shared/payload/seed/seed'
import { freshPhone, installRecordingProvider, requestFor, verify } from './setup/otp'
import { getTestPayload, quiet, resetDatabase } from './setup/payload'

let provider: ReturnType<typeof installRecordingProvider>
const provider2 = (personas: string[], extra: Record<string, unknown> = {}) => ({ accountType: 'provider', personas, acceptTerms: true, ...extra })

async function attemptsOf(challengeId: string) {
  const payload = await getTestPayload()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { attempts: string }[] }> } }
  return Number((await db.drizzle.execute(sql`SELECT attempts FROM otp_challenges WHERE public_id = ${challengeId}`)).rows[0]?.attempts)
}
async function accountOf(phone: string) {
  const payload = await getTestPayload()
  const [user] = (await payload.find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true, depth: 1 })).docs
  const acceptances = user ? (await payload.find({ collection: 'legal-acceptances', where: { user: { equals: user.id } }, overrideAccess: true, depth: 0 })).docs : []
  return { user, kinds: acceptances.map((a) => a.kind).sort() }
}

describe('009 US4 join as a creator (provider signup on verify)', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
    provider = installRecordingProvider()
  })
  afterAll(() => setOtpProvider(undefined))

  it('OT-US4-S1 a provider signup with two personas creates a creator with both, in order, and three acceptances', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const res = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code, signup: provider2(['videographer', 'photographer']) })
    expect(res.token?.isNew).toBe(true)
    expect(res.token?.user).toMatchObject({ accountType: 'provider', personas: ['videographer', 'photographer'] })
    const { user, kinds } = await accountOf(phone)
    expect(user?.accountType).toBe('provider')
    expect((user?.persona ?? []).map((p) => (typeof p === 'object' ? p.slug : p))).toEqual(['videographer', 'photographer'])
    expect(kinds).toEqual(['privacy', 'professional-terms', 'terms'])
  })

  it('OT-US4-S4 a provider signup without acceptTerms is refused and no attempt is spent', async () => {
    const phone = freshPhone()
    const { challenge, code } = await requestFor(request, provider, phone)
    const res = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code, signup: { accountType: 'provider', personas: ['photographer'] } })
    expect(res.res.status).toBe(422)
    expect(res.problem).toMatchObject({ code: 'api.errors.invalidInput', fields: [{ path: 'body.signup.acceptTerms', code: 'auth.errors.acceptTerms' }] })
    expect(await attemptsOf(challenge.challengeId)).toBe(0)
  })

  it('OT-US4-S5 a known seeker number joining is signed in unchanged, with no new acceptances', async () => {
    const phone = freshPhone()
    const first = await requestFor(request, provider, phone)
    await verify(verifyRoute, { challengeId: first.challenge.challengeId, phone, code: first.code })
    const before = await accountOf(phone)
    const payload = await getTestPayload()
    // Past the resend cooldown for a second code.
    const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }
    await db.drizzle.execute(sql`UPDATE otp_challenges SET resend_at = now() - interval '1 second' WHERE public_id = ${first.challenge.challengeId}`)
    const again = await requestFor(request, provider, phone)
    const res = await verify(verifyRoute, { challengeId: again.challenge.challengeId, phone, code: again.code, signup: provider2(['photographer']) })
    expect(res.token?.isNew).toBe(false)
    expect(res.token?.user.accountType).toBe('seeker')
    const after = await accountOf(phone)
    expect(after.kinds).toEqual(before.kinds)
    expect(after.user?.accountType).toBe('seeker')
  })

  it('OT-US4-S6 a persona switched off before verify refuses without spending the code; an active one then works', async () => {
    const payload = await getTestPayload()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    const active = (settings.activePersonas ?? []).map((p) => (typeof p === 'object' ? p.id : p))
    const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: 'videographer' } }, depth: 0, overrideAccess: true })
    const videographer = docs[0]!.id
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: active.filter((id) => id !== videographer) }, context: quiet })
    try {
      const phone = freshPhone()
      const { challenge, code } = await requestFor(request, provider, phone)
      const refused = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code, signup: provider2(['videographer']) })
      expect(refused.res.status).toBe(422)
      expect(refused.problem).toMatchObject({ code: 'auth.errors.personaInactive', fields: [{ path: 'body.signup.personas', code: 'auth.errors.personaInactive' }] })
      expect(await attemptsOf(challenge.challengeId)).toBe(0)
      const ok = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code, signup: provider2(['photographer']) })
      expect(ok.res.status).toBe(200)
      expect(ok.token?.user.personas).toEqual(['photographer'])
    } finally {
      await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: active }, context: quiet })
    }
  })
})
