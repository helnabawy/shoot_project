import { decodeKeptBrief, encodeKeptBrief, KEPT_BRIEF_COOKIE } from '@shoot/domain/brief/kept'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingWorld, type BookingWorld } from './setup/booking'
import { freshPhone, installRecordingProvider } from './setup/otp'
import { createUser, getTestPayload, quiet } from './setup/payload'

/**
 * Feature 021 on the website: the real brief action, the `GET /brief/send` route and the sign-in actions
 * against the test database. Only Next's request APIs are stubbed: a cookie jar that keeps options, and
 * redirect() throwing like Next does.
 */
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
  headers: async () =>
    new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v.value}`).join('; '), 'x-forwarded-for': `10.21.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }),
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
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))

const { submitBrief } = await import('@/modules/brief/actions')
const { sendKeptBrief } = await import('@/modules/brief/send-route')
const { requestCodeAction, verifyCodeAction } = await import('@/modules/auth/actions')
const { setOtpProvider } = await import('@/modules/auth/otp/providers')

let world: BookingWorld
let provider: ReturnType<typeof installRecordingProvider>

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  return data
}
const briefForm = (extra: Record<string, string | string[]> = {}) =>
  form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: '', duration: '2h', location: 'dubai', shotBy: 'anyone', ...extra })

async function redirected(run: () => Promise<unknown>) {
  const error = await run().then(
    () => null,
    (e: unknown) => e,
  )
  if (!(error instanceof Redirect)) throw new Error(`expected a redirect, got ${JSON.stringify(error)}`)
  return error.target
}
/** `GET /brief/send`: a 303 whose cookie changes are applied to the jar, as a browser would. */
async function send(locale = 'en') {
  const res = (await sendKeptBrief(new Request('http://localhost/brief/send'), { params: Promise.resolve({ locale }) })) as import('next/server').NextResponse
  expect(res.status).toBe(303)
  expect(res.headers.get('cache-control')).toBe('no-store')
  for (const c of res.cookies.getAll()) {
    if (!c.value) jar.delete(c.name)
    else jar.set(c.name, { value: c.value, options: { ...c } })
  }
  return res.headers.get('location')
}
const kept = () => decodeKeptBrief(jar.get(KEPT_BRIEF_COOKIE)?.value)
const briefs = async () => (await world.payload.find({ collection: 'briefs', depth: 0, overrideAccess: true, sort: '-createdAt' })).docs
const setSwitch = (on: boolean) => world.payload.updateGlobal({ slug: 'site-settings', data: { briefNeedsSignIn: on } as never, context: quiet })

async function signInMember() {
  const user = await createUser()
  const { token } = await (await getTestPayload()).login({ collection: 'users', data: { email: user.email!, password: 'password-123' } })
  jar.set('payload-token', { value: token! })
  return user
}

/** A number that already has a client account. */
async function returningNumber() {
  const phone = freshPhone()
  await world.payload.create({
    collection: 'users',
    data: { username: phone, name: 'Layla', password: `pw-${crypto.randomUUID()}`, accountType: 'seeker', roles: ['member'] } as never,
    overrideAccess: true,
    context: quiet,
  })
  return phone
}

/** The number step (from a brief or not) and the code step, through the real actions. */
async function signInByCode(phone: string, intent?: 'brief') {
  const next = intent ? '/brief/send' : '/account'
  expect(await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone, channel: 'sms', next, ...(intent ? { intent } : {}) })))).toEqual({ href: '/login/code', locale: 'en' })
  return redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code, ...(intent ? {} : { askRole: '1' }) })))
}

describe('021 sign in to send a brief (website)', () => {
  beforeAll(async () => {
    world = await bookingWorld()
    provider = installRecordingProvider()
  })
  afterAll(() => setOtpProvider(undefined))
  beforeEach(async () => {
    jar.clear()
    jar.set('sp_vid', { value: crypto.randomUUID() })
    await setSwitch(true)
    await world.payload.delete({ collection: 'briefs', where: { id: { exists: true } }, overrideAccess: true, context: quiet })
  })

  describe('US1 a guest signs in to send the brief they built', () => {
    it('BS-US1-S1 a guest’s complete brief is kept, nothing is recorded, and sign-in is next', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ js: '1', website: '', phone: '+971501234567' }))
      expect(state).toEqual({ status: 'signIn', loginUrl: '/login?next=%2Fbrief%2Fsend&for=brief' })
      expect(await briefs()).toHaveLength(0)
      const cookie = jar.get(KEPT_BRIEF_COOKIE)!
      expect(cookie.options).toMatchObject({ httpOnly: false, sameSite: 'lax', path: '/', maxAge: 3600, secure: false })
      expect(kept()).toMatchObject({ v: 1, path: '/', locale: 'en', sentence: expect.stringContaining('photographer') })
      // FR-017: answers only, never a number.
      expect(kept()!.entries).toEqual(expect.arrayContaining([['persona', 'photographer'], ['location', 'dubai']]))
      expect(JSON.stringify(kept())).not.toContain('+971')
      expect(kept()!.entries.map(([n]) => n)).not.toContain('website')
    })

    it('BS-US1-S1 in Arabic the sign-in screen is the Arabic one', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ locale: 'ar', sourcePath: '/ar' }))
      expect(state).toEqual({ status: 'signIn', loginUrl: '/ar/login?next=%2Fbrief%2Fsend&for=brief' })
      expect(kept()).toMatchObject({ path: '/ar', locale: 'ar' })
    })

    it('BS-US1-S2 BS-US3-S4 a returning number signs in, the brief is recorded once for them, step 2 is next, and the brief is no longer kept', async () => {
      const phone = await returningNumber()
      await submitBrief({ status: 'idle' }, briefForm())
      // The code step sends the kept brief itself and goes straight to step 2.
      const target = await signInByCode(phone, 'brief')
      expect(String(target)).toMatch(/^\/match\/B-[0-9A-Z]{5}\/[A-Za-z0-9_-]{43}$/)
      const [brief, ...rest] = await briefs()
      expect(rest).toHaveLength(0)
      const member = (await world.payload.find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true })).docs[0]!
      expect(brief!.member).toBe(member.id)
      expect(String(target)).toContain(brief!.reference)
      // BS-US3-S4: the sent brief is no longer kept.
      expect(jar.has(KEPT_BRIEF_COOKIE)).toBe(false)
    })

    it('BS-US1-S2 with Quick Match off the member is handed to WhatsApp with the reference', async () => {
      await world.payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: false } } as never, context: quiet })
      try {
        await submitBrief({ status: 'idle' }, briefForm())
        await signInMember()
        const target = String(await send())
        expect(target).toMatch(/^https:\/\/wa\.me\//)
        expect(decodeURIComponent(target)).toContain(`Brief ID: ${(await briefs())[0]!.reference}`)
      } finally {
        await world.payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: true } } as never, context: quiet })
      }
    })

    it('BS-US1-S3 a brief for a creator keeps the creator, the pick and the page through sign-in', async () => {
      const sara = world.creators.sara!
      const path = `/book/${sara.code.toLowerCase()}`
      await submitBrief({ status: 'idle' }, briefForm({ creator: sara.code, pick: `photographer:${sara.code}`, sourcePath: path }))
      expect(kept()).toMatchObject({ path })
      await signInMember()
      const target = String(await send())
      // One type and a chosen creator: straight to the details step (003 US1-S7).
      expect(target).toMatch(/^\/match\/B-[0-9A-Z]{5}\/[A-Za-z0-9_-]{43}\/details\?pick=/)
      const brief = (await briefs())[0]!
      expect(brief.creator).toBe(sara.id)
      expect(brief.sourcePath).toBe(path)
    })

    it('BS-US1-S4 an incomplete or invalid brief shows today’s messages and does not lead to sign-in', async () => {
      const state = await submitBrief({ status: 'idle' }, briefForm({ location: 'mars' }))
      expect(state).toMatchObject({ status: 'error', errors: { location: expect.any(String) } })
      expect(jar.has(KEPT_BRIEF_COOKIE)).toBe(false)
      expect(await briefs()).toHaveLength(0)
    })

    it('BS-US1-S5 without JavaScript the guest is redirected to sign in, and the round trip ends on step 2', async () => {
      expect(await redirected(() => submitBrief({ status: 'idle' }, briefForm({ js: '' })))).toBe('/login?next=%2Fbrief%2Fsend&for=brief')
      await signInMember()
      expect(String(await send())).toMatch(/^\/match\//)
    })
  })

  describe('US2 a new number registers on the way', () => {
    it('BS-US2-S1 from a brief a new number becomes a client without the role question and owns the brief', async () => {
      await submitBrief({ status: 'idle' }, briefForm())
      const phone = freshPhone()
      const pending = () => JSON.parse(jar.get('shoot-otp')!.value) as { intent: string; next: string }
      expect(await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone, channel: 'sms', next: '/brief/send', intent: 'brief' })))).toEqual({ href: '/login/code', locale: 'en' })
      expect(pending()).toMatchObject({ intent: 'brief', next: '/brief/send' })
      expect(String(await redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code }))))).toMatch(/^\/match\//)
      const user = (await world.payload.find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true })).docs[0]!
      expect(user.accountType).toBe('seeker')
      expect(jar.has(KEPT_BRIEF_COOKIE)).toBe(false)
      expect((await briefs())[0]!.member).toBe(user.id)
    })

    it('BS-US2-S2 sign-in that does not come from a brief still asks the role, and sends no kept brief (FR-010)', async () => {
      await submitBrief({ status: 'idle' }, briefForm())
      const fresh = freshPhone()
      expect(await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone: fresh, channel: 'sms', next: '/account' })))).toEqual({ href: '/login/code', locale: 'en' })
      expect(JSON.parse(jar.get('shoot-otp')!.value).intent).toBe('none')
      const state = await verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code, askRole: '1' }))
      expect(state).toMatchObject({ needsRole: true })

      // A returning number signing in from the header lands on its account; the kept brief stays kept.
      const phone = await returningNumber()
      expect(await signInByCode(phone)).toEqual({ href: '/account', locale: 'en' })
      expect(await briefs()).toHaveLength(0)
      expect(kept()).not.toBeNull()
    })
  })

  describe('US3 the brief is never lost', () => {
    it('BS-US3-S2 a kept brief that is no longer valid goes back to its page with the message, nothing recorded', async () => {
      await submitBrief({ status: 'idle' }, briefForm({ sourcePath: '/hire/weddings' }))
      // The location the guest chose was removed while they signed in.
      const tampered = { ...kept()!, entries: kept()!.entries.map(([n, v]) => [n, n === 'location' ? 'mars' : v] as [string, string]) }
      jar.set(KEPT_BRIEF_COOKIE, { value: encodeKeptBrief(tampered)! })
      await signInMember()
      expect(await send()).toBe('/hire/weddings')
      expect(await briefs()).toHaveLength(0)
      expect(kept()).toMatchObject({ path: '/hire/weddings', error: { errors: { location: expect.any(String) } } })
    })

    it('BS-US3-S3 with nothing kept, or a brief older than an hour, sign-in is an ordinary one', async () => {
      await submitBrief({ status: 'idle' }, briefForm())
      await signInMember()
      jar.delete(KEPT_BRIEF_COOKIE)
      expect(await send('ar')).toBe('/ar/account')
      jar.delete('payload-token')
      await submitBrief({ status: 'idle' }, briefForm())
      await signInMember()
      jar.set(KEPT_BRIEF_COOKIE, { value: encodeKeptBrief({ ...kept()!, at: new Date(Date.now() - 61 * 60_000).toISOString() })! })
      expect(await send()).toBe('/account')
      expect(jar.has(KEPT_BRIEF_COOKIE)).toBe(false)
      expect(await briefs()).toHaveLength(0)
    })

    it('a signed-out visit to /brief/send goes to sign in for the brief', async () => {
      expect(await send('ar')).toBe('/ar/login?next=%2Fbrief%2Fsend&for=brief')
    })
  })

  describe('US5 members and the switch', () => {
    it('BS-US5-S1 a signed-in member sends at once, as today', async () => {
      const user = await signInMember()
      const state = await submitBrief({ status: 'idle' }, briefForm())
      expect(state).toMatchObject({ status: 'ok', matchUrl: expect.stringMatching(/^\/match\//) })
      expect((await briefs())[0]!.member).toBe(user.id)
      expect(jar.has(KEPT_BRIEF_COOKIE)).toBe(false)
    })

    it('BS-US5-S3 with the switch off a guest sends as before this feature', async () => {
      await setSwitch(false)
      const state = await submitBrief({ status: 'idle' }, briefForm())
      expect(state).toMatchObject({ status: 'ok' })
      expect((await briefs())[0]!.member ?? null).toBeNull()
    })

    it('BS-US5-S4 with the switch on a guest never records a brief, however often they press', async () => {
      for (let i = 0; i < 3; i += 1) expect((await submitBrief({ status: 'idle' }, briefForm())).status).toBe('signIn')
      expect(await briefs()).toHaveLength(0)
    })
  })
})
