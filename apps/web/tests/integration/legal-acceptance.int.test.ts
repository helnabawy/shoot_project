import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createLegal, pagesWorld, version, type PagesWorld } from './setup/pages'
import { getTestPayload } from './setup/payload'

/** The real register action; only Next's request APIs are stubbed (as in actions.int.test.ts). */
const jar = new Map<string, string>()
class Redirect extends Error {}
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers(),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({ redirect: () => { throw new Redirect() } }))
vi.mock('@/i18n/navigation', () => ({ redirect: () => { throw new Redirect() } }))

const { register } = await import('@/modules/auth/actions')

const form = (entries: Record<string, string>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) data.append(key, value)
  return data
}
const signUp = async (entries: Record<string, string>) => {
  const state = await register(undefined, form({ locale: 'en', password: 'password-123', accountType: 'seeker', ...entries })).catch((e) => {
    if (e instanceof Redirect) return 'redirected' as const
    throw e
  })
  return state
}
const acceptancesOf = async (email: string) => {
  const payload = await getTestPayload()
  const user = (await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, depth: 0 })).docs[0]
  if (!user) return null
  const rows = await payload.find({ collection: 'legal-acceptances', where: { user: { equals: user.id } }, depth: 0, limit: 10 })
  return rows.docs.map((r) => ({ kind: r.kind, version: r.version, locale: r.locale })).sort((a, b) => a.kind.localeCompare(b.kind))
}

describe('MP-US2-S2 registration records the legal versions accepted', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
    await createLegal(world, 'terms', [version('Terms v1'), version('Terms v2', { effectiveFrom: '2026-06-01T00:00:00.000Z' })])
    await createLegal(world, 'privacy', [version('Privacy v1')])
    await createLegal(world, 'professional-terms', [version('Pro v1', { effectiveFrom: '2099-01-01T00:00:00.000Z' })])
  })

  it('MP-US2-S2 a seeker accepts the Terms and the Privacy Policy in force', async () => {
    expect(await signUp({ name: 'Mona', email: 'mona@example.test', acceptTerms: 'on', locale: 'ar' })).toBe('redirected')
    expect(await acceptancesOf('mona@example.test')).toEqual([
      { kind: 'privacy', version: 1, locale: 'ar' },
      { kind: 'terms', version: 2, locale: 'ar' },
    ])
  })

  it('MP-US2-S2 without the checkbox no account is created', async () => {
    const state = await signUp({ name: 'Nadia', email: 'nadia@example.test' })
    expect(state).toMatchObject({ errors: { acceptTerms: 'auth.errors.acceptTerms' } })
    expect(await acceptancesOf('nadia@example.test')).toBeNull()
    expect(await signUp({ name: 'Nadia', email: 'nadia@example.test', acceptTerms: 'yes' })).toMatchObject({ errors: { acceptTerms: 'auth.errors.acceptTerms' } })
  })

  it('MP-US2-S2 a version sent in the form is ignored: the server reads what is in force', async () => {
    await signUp({ name: 'Omar', email: 'omar@example.test', acceptTerms: 'on', version: '1', termsVersion: '1' })
    expect((await acceptancesOf('omar@example.test'))?.find((r) => r.kind === 'terms')?.version).toBe(2)
  })

  it('MP-US2-S2 a kind with nothing in force yet is skipped, and the account is still created', async () => {
    const payload = await getTestPayload()
    const persona = (await payload.find({ collection: 'personas', limit: 1, depth: 0 })).docs[0]
    // Professional Terms begin in 2099, so a provider records Terms and Privacy only.
    const personas = await payload.create({ collection: 'personas', data: { slug: 'photographer', singular: 'Photographer', plural: 'Photographers', active: true } as never, context: { disableRevalidate: true } })
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [personas.id] } as never, context: { disableRevalidate: true } })
    expect(persona).toBeUndefined()
    await signUp({ name: 'Lu', email: 'lu@example.test', acceptTerms: 'on', accountType: 'provider', persona: 'photographer' })
    expect((await acceptancesOf('lu@example.test'))?.map((r) => r.kind)).toEqual(['privacy', 'terms'])
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
    await signUp({ name: 'Pia', email: 'pia@example.test', acceptTerms: 'on', accountType: 'provider', persona: 'photographer' })
    expect((await acceptancesOf('pia@example.test'))?.map((r) => r.kind)).toEqual(['privacy', 'professional-terms', 'terms'])
  })
})
