import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POST as request } from '@/app/(payload)/api/mobile/v1/auth/otp/request/route'
import { POST as verifyRoute } from '@/app/(payload)/api/mobile/v1/auth/otp/verify/route'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { freshPhone, installRecordingProvider, requestFor, verify } from './setup/otp'
import { createLegal, pagesWorld, version, type PagesWorld } from './setup/pages'
import { getTestPayload } from './setup/payload'

/**
 * Registration is by code since feature 009 (FR-061): a new number signs up through `otp/verify`,
 * a seeker accepting by continuing (board 20's line), a creator with the explicit acceptance.
 * `name` stands for the person and maps to a number; `entries` keep the old form's vocabulary.
 */
let provider: ReturnType<typeof installRecordingProvider>
const numbers = new Map<string, string>()
const signUp = async (entries: Record<string, string>) => {
  const phone = freshPhone()
  numbers.set(entries.name!, phone)
  const { challenge, code } = await requestFor(request, provider, phone, { headers: { 'accept-language': entries.locale ?? 'en' } })
  const isProvider = entries.accountType === 'provider'
  const signup = isProvider
    ? { accountType: 'provider', personas: [entries.persona], ...(entries.acceptTerms === 'on' ? { acceptTerms: true } : {}) }
    : { accountType: 'seeker' }
  const result = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code, signup, version: entries.version }, { 'accept-language': entries.locale ?? 'en' })
  return result.res.status === 200 ? ('redirected' as const) : { errors: Object.fromEntries((result.problem?.fields ?? []).map((f) => [f.path.split('.').at(-1), f.code])) }
}
const acceptancesOf = async (name: string) => {
  const payload = await getTestPayload()
  const user = (await payload.find({ collection: 'users', where: { username: { equals: numbers.get(name) } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!user) return null
  const rows = await payload.find({ collection: 'legal-acceptances', where: { user: { equals: user.id } }, depth: 0, limit: 10 })
  return rows.docs.map((r) => ({ kind: r.kind, version: r.version, locale: r.locale })).sort((a, b) => a.kind.localeCompare(b.kind))
}

describe('MP-US2-S2 registration records the legal versions accepted', () => {
  let world: PagesWorld
  afterAll(() => setOtpProvider(undefined))
  beforeAll(async () => {
    world = await pagesWorld()
    provider = installRecordingProvider()
    await createLegal(world, 'terms', [version('Terms v1'), version('Terms v2', { effectiveFrom: '2026-06-01T00:00:00.000Z' })])
    await createLegal(world, 'privacy', [version('Privacy v1')])
    await createLegal(world, 'professional-terms', [version('Pro v1', { effectiveFrom: '2099-01-01T00:00:00.000Z' })])
  })

  it('MP-US2-S2 a seeker accepts the Terms and the Privacy Policy in force', async () => {
    expect(await signUp({ name: 'Mona', acceptTerms: 'on', locale: 'ar' })).toBe('redirected')
    expect(await acceptancesOf('Mona')).toEqual([
      { kind: 'privacy', version: 1, locale: 'ar' },
      { kind: 'terms', version: 2, locale: 'ar' },
    ])
  })

  it('MP-US2-S2 without the acceptance no creator account is created', async () => {
    const state = await signUp({ name: 'Nadia', accountType: 'provider', persona: 'photographer' })
    expect(state).toMatchObject({ errors: { acceptTerms: 'auth.errors.acceptTerms' } })
    expect(await acceptancesOf('Nadia')).toBeNull()
  })

  it('MP-US2-S2 a version sent in the form is ignored: the server reads what is in force', async () => {
    await signUp({ name: 'Omar', acceptTerms: 'on', version: '1' })
    expect((await acceptancesOf('Omar'))?.find((r) => r.kind === 'terms')?.version).toBe(2)
  })

  it('MP-US2-S2 a kind with nothing in force yet is skipped, and the account is still created', async () => {
    const payload = await getTestPayload()
    const persona = (await payload.find({ collection: 'personas', limit: 1, depth: 0 })).docs[0]
    // Professional Terms begin in 2099, so a provider records Terms and Privacy only.
    const personas = await payload.create({ collection: 'personas', data: { slug: 'photographer', singular: 'Photographer', plural: 'Photographers', active: true } as never, context: { disableRevalidate: true } })
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [personas.id] } as never, context: { disableRevalidate: true } })
    expect(persona).toBeUndefined()
    await signUp({ name: 'Lu', acceptTerms: 'on', accountType: 'provider', persona: 'photographer' })
    expect((await acceptancesOf('Lu'))?.map((r) => r.kind)).toEqual(['privacy', 'terms'])
  })

  it('MP-US2-S2 a provider also accepts the Professional Terms once they are in force', async () => {
    const payload = await getTestPayload()
    const doc = (await payload.find({ collection: 'legal-documents', where: { kind: { equals: 'professional-terms' } }, limit: 1, depth: 0, user: world.admin, overrideAccess: false })).docs[0]!
    await payload.update({
      collection: 'legal-documents',
      id: doc.id,
      data: { versions: [{ ...doc.versions![0], effectiveFrom: '2026-01-01T00:00:00.000Z' }] } as never,
      user: world.admin,
      overrideAccess: false,
      context: { disableRevalidate: true },
    })
    await signUp({ name: 'Pia', acceptTerms: 'on', accountType: 'provider', persona: 'photographer' })
    expect((await acceptancesOf('Pia'))?.map((r) => r.kind)).toEqual(['privacy', 'professional-terms', 'terms'])
  })
})
