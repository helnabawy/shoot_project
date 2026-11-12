import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { freshPhone, installRecordingProvider } from './setup/otp'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

/** The real website actions; only Next's request APIs are stubbed: a cookie jar that keeps options, and redirect() throwing. */
const jar = new Map<string, { value: string; options?: Record<string, unknown> }>()
class Redirect extends Error {
  constructor(public target: unknown) {
    super('NEXT_REDIRECT')
  }
}
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => void jar.set(name, { value, options }),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v.value}`).join('; '), 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Redirect(url) } }))
vi.mock('@/i18n/navigation', () => ({ redirect: (arg: unknown) => { throw new Redirect(arg) } }))

const { login, logout, requestCodeAction, verifyCodeAction } = await import('@/modules/auth/actions')
const { setOtpProvider } = await import('@/modules/auth/otp/providers')

let provider: ReturnType<typeof installRecordingProvider>
const form = (entries: Record<string, string>) => {
  const data = new FormData()
  for (const [k, v] of Object.entries(entries)) data.append(k, v)
  return data
}
async function redirected(run: () => Promise<unknown>) {
  const error = await run().then(() => null, (e: unknown) => e)
  if (!(error instanceof Redirect)) throw new Error(`expected a redirect, got ${JSON.stringify(error)}`)
  return error.target
}
const authed = async () => (await getTestPayload()).auth({ headers: new Headers({ cookie: `payload-token=${jar.get('payload-token')?.value ?? ''}` }) })

/** The number step then the code step, through the real actions. */
async function signInByCode(phone: string, extra: { mode?: string; next?: string } = {}) {
  expect(await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone, channel: 'sms', next: extra.next ?? '/account', ...(extra.mode ? { mode: extra.mode } : {}) })))).toEqual({ href: '/login/code', locale: 'en' })
  return redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code })))
}

describe('009 US5 the website signs in the same way', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
    provider = installRecordingProvider()
  })
  beforeEach(() => jar.clear())
  afterAll(() => setOtpProvider(undefined))

  it('OT-US5-S1 number then code sets the HTTP-only payload-token cookie, and payload.auth reads it', async () => {
    const phone = freshPhone()
    const target = await signInByCode(phone.slice(4))
    expect(target).toEqual({ href: '/account', locale: 'en' })
    const cookie = jar.get('payload-token')!
    expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false })
    expect(cookie.options?.expires).toBeInstanceOf(Date)
    expect(((cookie.options!.expires as Date).getTime() - Date.now()) / 86_400_000).toBeGreaterThan(6.9)
    const { user } = await authed()
    expect((user as { username?: string } | null)?.username).toBe(phone)
    expect(jar.has('shoot-otp')).toBe(false)
  })

  it('a wrong code stays on the code step with the field error; no pending cookie means back to /login', async () => {
    await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone: freshPhone(), channel: 'sms' })))
    const code = provider.sent.at(-1)!.code
    const state = await verifyCodeAction(undefined, form({ locale: 'en', code: code === '000000' ? '111111' : '000000' }))
    expect(state).toMatchObject({ errors: { code: 'auth.errors.codeInvalid' } })
    jar.clear()
    expect(await redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code })))).toEqual({ href: '/login', locale: 'en' })
  })

  it('OT-US5-S2 the email sign-in still signs an editor in and locks after 5 wrong passwords', async () => {
    const editor = await createUser(['editor'])
    await redirected(() => login(undefined, form({ locale: 'en', email: editor.email!, password: 'password-123' })))
    expect(jar.get('payload-token')?.options).toMatchObject({ httpOnly: true })
    const other = await createUser(['editor'])
    for (let i = 0; i < 5; i++) await login(undefined, form({ email: other.email!, password: 'wrong-password' }))
    expect(await login(undefined, form({ email: other.email!, password: 'password-123' }))).toMatchObject({ formError: 'auth.errors.locked' })
  })

  it('OT-US5-S3 logout ends the session on the server; the old cookie value no longer signs anyone in', async () => {
    await signInByCode(freshPhone())
    const old = jar.get('payload-token')!.value
    expect((await authed()).user).not.toBeNull()
    expect(await redirected(() => logout(form({ locale: 'en' })))).toEqual({ href: '/', locale: 'en' })
    expect(jar.has('payload-token')).toBe(false)
    const { user } = await (await getTestPayload()).auth({ headers: new Headers({ cookie: `payload-token=${old}` }) })
    expect(user).toBeNull()
  })

  it('OT-US5-S5 an email member adds a number by code; a later code sign-in opens the same account', async () => {
    const member = await createUser(['member'])
    const payload = await getTestPayload()
    const { token } = await payload.login({ collection: 'users', data: { email: member.email!, password: 'password-123' } })
    jar.set('payload-token', { value: token! })
    const phone = freshPhone()
    expect(await signInByCode(phone, { mode: 'link' })).toEqual({ href: '/account', locale: 'en' })
    const after = await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })
    expect(after).toMatchObject({ username: phone, phone })
    jar.clear()
    // Past the resend cooldown for the next code to the same number.
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 61_000 })
    try {
      await signInByCode(phone)
    } finally {
      vi.useRealTimers()
    }
    expect((await authed()).user?.id).toBe(member.id)
  })

  it('OT-US5-S6 adding a number another account signs in with is refused and nothing changes', async () => {
    const taken = freshPhone()
    await signInByCode(taken)
    jar.clear()
    const member = await createUser(['member'])
    const payload = await getTestPayload()
    const { token } = await payload.login({ collection: 'users', data: { email: member.email!, password: 'password-123' } })
    jar.set('payload-token', { value: token! })
    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 61_000 })
    try {
      await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone: taken, channel: 'sms', mode: 'link' })))
      const state = await verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code }))
      expect(state).toMatchObject({ formError: 'auth.errors.numberTaken' })
    } finally {
      vi.useRealTimers()
    }
    expect((await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })).username ?? null).toBeNull()
  })

  it('Join as a creator: nothing is sent without a profession and the acceptance; with them a creator account is made', async () => {
    const sent = provider.sent.length
    expect(await requestCodeAction(undefined, form({ locale: 'en', phone: freshPhone(), channel: 'sms', mode: 'join' }))).toMatchObject({
      errors: { persona: 'auth.errors.personaRequired', acceptTerms: 'auth.errors.acceptTerms' },
    })
    expect(provider.sent.length).toBe(sent)
    const phone = freshPhone()
    await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone, channel: 'sms', mode: 'join', persona: 'photographer', acceptTerms: 'on' })))
    expect(await redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code })))).toEqual({ href: '/account/profile', locale: 'en' })
    const [user] = (await (await getTestPayload()).find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true })).docs
    expect(user?.accountType).toBe('provider')
  })
})
