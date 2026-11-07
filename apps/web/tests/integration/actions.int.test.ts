import { beforeEach, describe, expect, it, vi } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

/**
 * The real server actions against the test database. Only Next's request APIs are stubbed:
 * a cookie jar, request headers built from it, and redirect() throwing like Next does.
 */
const jar = new Map<string, string>()
class Redirect extends Error {
  constructor(public target: unknown) {
    super('NEXT_REDIRECT')
  }
}

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('@/i18n/navigation', () => ({
  redirect: (arg: unknown) => {
    throw new Redirect(arg)
  },
}))

const { login, logout, register } = await import('@/modules/auth/actions')
const { submitBrief } = await import('@/modules/brief/actions')
const { getCurrentUser, requireUser } = await import('@/modules/auth/session')
const { exportBriefsCsv } = await import('@/modules/brief/export')

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData()
  // Registration needs the acceptance checkbox (MP-US2-S2); pass acceptTerms: '' to leave it unticked.
  for (const [key, value] of Object.entries({ acceptTerms: 'on', ...entries })) {
    if (key === 'acceptTerms' && value === '') continue
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  }
  return data
}

async function expectRedirect(run: () => Promise<unknown>) {
  const error = await run().then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(Redirect)
  return (error as Redirect).target
}

const briefForm = (extra: Record<string, string | string[]> = {}) =>
  form({
    locale: 'en',
    js: '1',
    sourcePath: '/',
    persona: 'photographer',
    occasion: 'event',
    date: '',
    duration: '2h',
    location: 'dubai',
    shotBy: 'anyone',
    ...extra,
  })

describe('server actions', () => {
  beforeEach(async () => {
    jar.clear()
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  describe('US4 auth actions', () => {
    it('US4-S1 register signs the new member in and redirects to the safe next path', async () => {
      const target = await expectRedirect(() =>
        register(undefined, form({ locale: 'ar', name: 'Mona', email: 'Mona@Example.test', password: 'password-123', accountType: 'seeker', next: '/account' })),
      )
      expect(target).toEqual({ href: '/account', locale: 'ar' })
      expect(jar.get('payload-token')).toBeTruthy()
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'users', where: { email: { equals: 'mona@example.test' } } })
      expect(docs[0]?.roles).toEqual(['member'])
    })

    it('US4-S7 a roles value posted with the form is ignored', async () => {
      await expectRedirect(() =>
        register(undefined, form({ name: 'Eve', email: 'eve@example.test', password: 'password-123', accountType: 'seeker', roles: 'admin' })),
      )
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'users', where: { email: { equals: 'eve@example.test' } } })
      expect(docs[0]?.roles).toEqual(['member'])
    })

    it('FR-019 field errors come back with the values the visitor typed', async () => {
      const state = await register(undefined, form({ name: 'A', email: 'nope', password: 'short', accountType: 'seeker' }))
      expect(state?.errors).toMatchObject({ name: expect.any(String), email: expect.any(String), password: expect.any(String) })
      expect(state?.values?.email).toBe('nope')
      expect(jar.size).toBe(0)
    })

    it('US4-S3 a taken email gets its own message', async () => {
      const existing = await createUser()
      const state = await register(undefined, form({ name: 'Sam', email: existing.email, password: 'password-123', accountType: 'seeker' }))
      expect(state?.errors).toEqual({ email: 'auth.errors.emailTaken' })
    })

    it('FR-021 a provider must pick an active persona', async () => {
      const state = await register(
        undefined,
        form({ name: 'Pat', email: 'pat@example.test', password: 'password-123', accountType: 'provider', persona: 'teacher' }),
      )
      expect(state?.errors).toEqual({ persona: 'auth.errors.personaInactive' })
    })

    it('FR-020 a provider with an active persona is stored with it, and starts on their profile', async () => {
      const target = await expectRedirect(() =>
        register(undefined, form({ name: 'Lu', email: 'lu@example.test', password: 'password-123', accountType: 'provider', persona: 'videographer' })),
      )
      expect(target).toEqual({ href: '/account/profile', locale: 'en' })
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'users', where: { email: { equals: 'lu@example.test' } }, depth: 1 })
      expect((docs[0]?.persona as { slug?: string } | null)?.slug).toBe('videographer')
    })

    it('US4-S2 login sets the session cookie and refuses an off-site next', async () => {
      const user = await createUser()
      const target = await expectRedirect(() => login(undefined, form({ email: user.email, password: 'password-123', next: 'https://evil.test' })))
      expect(target).toEqual({ href: '/account', locale: 'en' })
      expect(jar.get('payload-token')).toBeTruthy()
    })

    it('FR-022 wrong credentials get a safe message; invalid input gets field errors', async () => {
      const user = await createUser()
      expect(await login(undefined, form({ email: user.email, password: 'wrong-password' }))).toMatchObject({ formError: 'auth.errors.invalid' })
      expect(await login(undefined, form({ email: 'x', password: '' }))).toMatchObject({ errors: { email: expect.any(String) } })
    })

    it('FR-023 a locked account is told so', async () => {
      const user = await createUser()
      for (let i = 0; i < 5; i++) await login(undefined, form({ email: user.email, password: 'wrong-password' }))
      expect(await login(undefined, form({ email: user.email, password: 'password-123' }))).toMatchObject({ formError: 'auth.errors.locked' })
    })

    it('logout clears the session and returns home', async () => {
      jar.set('payload-token', 'abc')
      const target = await expectRedirect(() => logout(form({ locale: 'ar' })))
      expect(target).toEqual({ href: '/', locale: 'ar' })
      expect(jar.has('payload-token')).toBe(false)
    })
  })

  describe('US8 submitBrief', () => {
    it('US8-S3 records the brief and returns the WhatsApp hand-off with the sentence', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm())
      expect(state.status).toBe('ok')
      if (state.status !== 'ok') return
      expect(state.reference).toMatch(/^B-[A-Z0-9]{5}$/)
      expect(state.whatsappUrl).toMatch(/^https:\/\/wa\.me\/971500000000\?text=/)
      expect(decodeURIComponent(state.whatsappUrl)).toContain(state.sentence)
      // FR-055 the brief ID travels with the message so the team can find the brief from the chat.
      expect(decodeURIComponent(state.whatsappUrl)).toContain(`Brief ID: ${state.reference}`)
      expect(jar.get('sp_vid')).toBeTruthy()
    })

    it('FR-050 the same brief within a minute is not stored twice', async () => {
      const first = await submitBrief({ status: 'idle' }, briefForm())
      const second = await submitBrief({ status: 'idle' }, briefForm())
      expect(first.status === 'ok' && second.status === 'ok' && first.reference === second.reference).toBe(true)
      const payload = await getTestPayload()
      expect((await payload.count({ collection: 'briefs' })).totalDocs).toBe(1)
    })

    it('FR-055 without JavaScript the visitor is sent straight to WhatsApp (Quick Match off)', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: false } } as never, context: { disableRevalidate: true } })
      const target = await expectRedirect(() => submitBrief({ status: 'idle' }, briefForm({ js: '0' })))
      expect(String(target)).toMatch(/^https:\/\/wa\.me\//)
      await payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: true } } as never, context: { disableRevalidate: true } })
    })

    it('QM-FR-001 without JavaScript, with Quick Match on, the visitor goes to step 2', async () => {
      const target = await expectRedirect(() => submitBrief({ status: 'idle' }, briefForm({ js: '0', occasion: 'portrait' })))
      expect(String(target)).toMatch(/^\/match\/B-[0-9A-Z]{5}\/[A-Za-z0-9_-]{43}$/)
    })

    it('FR-048 an option outside the set is a field error', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ location: 'mars' }))
      expect(state).toMatchObject({ status: 'error', errors: { location: expect.any(String) } })
    })

    it('FR-049 a signed-in member is linked to the brief', async () => {
      const user = await createUser()
      await expectRedirect(() => login(undefined, form({ email: user.email, password: 'password-123' })))
      const state = await submitBrief({ status: 'idle' }, briefForm())
      expect(state.status).toBe('ok')
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'briefs', depth: 0 })
      expect(docs[0]?.member).toBe(user.id)
    })

    it('FR-063 a brief for a photographer and a videographer stores both and names both', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ persona: ['photographer', 'videographer'] }))
      expect(state.status).toBe('ok')
      if (state.status !== 'ok') return
      expect(state.sentence).toContain('I need a photographer and videographer for')
      expect(decodeURIComponent(state.whatsappUrl)).toContain('photographer and videographer')
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'briefs', depth: 1 })
      expect((docs[0]?.persona as { slug: string }[]).map((p) => p.slug)).toEqual(['photographer', 'videographer'])
    })

    it('FR-063 an inactive professional type among several is a field error', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ persona: ['photographer', 'teacher'] }))
      expect(state).toMatchObject({ status: 'error', errors: { persona: 'brief.errors.notAnOption' } })
    })

    it('FR-051 the honeypot rejects bots with a generic message', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ website: 'http://spam.test' }))
      expect(state).toMatchObject({ status: 'error', formError: 'brief.errors.generic' })
    })
  })

  describe('FR-025 session guard', () => {
    it('sends a visitor to log in with the page to return to', async () => {
      expect(await getCurrentUser()).toBeNull()
      const target = await expectRedirect(() => requireUser('ar', '/account'))
      expect(target).toEqual({ href: { pathname: '/login', query: { next: '/account' } }, locale: 'ar' })
    })

    it('returns the signed-in member', async () => {
      const user = await createUser()
      await expectRedirect(() => login(undefined, form({ email: user.email, password: 'password-123' })))
      expect((await requireUser('en', '/account')).id).toBe(user.id)
    })
  })

  describe('FR-052 brief CSV export', () => {
    const call = async (user: unknown) => {
      const payload = await getTestPayload()
      return exportBriefsCsv.handler({ payload, user } as never)
    }

    it('refuses anyone who is not an admin', async () => {
      expect((await call(null)).status).toBe(403)
      expect((await call(await createUser(['editor']))).status).toBe(403)
    })

    it('gives admins every brief as CSV', async () => {
      await submitBrief({ status: 'idle' }, briefForm())
      const response = await call(await createUser(['admin']))
      expect(response.headers.get('content-type')).toContain('text/csv')
      const [header, row] = (await response.text()).replace(/^\uFEFF/, '').split('\n')
      expect(header).toBe('reference,createdAt,status,locale,sentence,date,member,sourcePath')
      expect(row).toMatch(/^"B-[A-Z0-9]{5}",/)
    })
  })
})
