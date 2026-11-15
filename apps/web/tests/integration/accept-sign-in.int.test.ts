import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, type BookingWorld } from './setup/booking'
import { freshPhone, installRecordingProvider } from './setup/otp'
import { createUser, getTestPayload, quiet } from './setup/payload'

/**
 * Feature 021, amendment 2026-11-15 (the owner: "list the available creators and ask the user to login
 * before accepting the quotation"): a guest briefs, sees step 2 and gets a quotation with no account;
 * accepting needs a member and claims a guest's booking. The real actions, the sign-in actions and the
 * mobile API handler against the test database; only Next's request APIs are stubbed.
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
    new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v.value}`).join('; '), 'x-forwarded-for': `10.22.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))
vi.mock('@/i18n/navigation', () => ({
  redirect: (arg: unknown) => {
    throw new Redirect(arg)
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined, unstable_cache: (fn: unknown) => fn }))
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))

const { submitBrief } = await import('@/modules/brief/actions')
const { briefNeedsSignIn } = await import('@/modules/brief/sign-in-rule')
const { requestQuotation, acceptQuotation } = await import('@/modules/booking/actions')
const { acceptQuotationV1 } = await import('@/modules/booking/api')
const { requestCodeAction, verifyCodeAction } = await import('@/modules/auth/actions')
const { setOtpProvider } = await import('@/modules/auth/otp/providers')

let world: BookingWorld
let provider: ReturnType<typeof installRecordingProvider>
let day = 0

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  return data
}

async function redirected(run: () => Promise<unknown>) {
  const error = await run().then(
    () => null,
    (e: unknown) => e,
  )
  if (!(error instanceof Redirect)) throw new Error(`expected a redirect, got ${JSON.stringify(error)}`)
  return error.target
}

/** A guest brief (each with its own day, so no two are duplicates) → step 2's ref and key. */
async function guestBrief() {
  const date = new Date(Date.now() + (12 + day++) * 86_400_000).toISOString().slice(0, 10)
  const state = await submitBrief(
    { status: 'idle' },
    form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date, duration: '2h', location: 'dubai', shotBy: 'anyone' }),
  )
  expect(state.status).toBe('ok')
  const url = (state as { matchUrl?: string }).matchUrl
  expect(url).toMatch(/^\/match\//)
  const [, , ref, key] = url!.split('/')
  return { ref: ref!, key: key! }
}

/** Step 3 as a guest → the quotation's ref and key. */
async function guestQuote() {
  const brief = await guestBrief()
  const url = String(
    await redirected(() =>
      requestQuotation({ status: 'idle' }, form({ locale: 'en', ref: brief.ref, key: brief.key, pick: `photographer:${world.creators.sara!.code}`, name: 'Layla Hassan', whatsapp: '+971501234567' })),
    ),
  )
  const [, , ref, key] = url.split('?')[0]!.split('/')
  return { brief, ref: ref!, key: key!, url }
}

const accept = (q: { ref: string; key: string }, locale = 'en') => redirected(() => acceptQuotation(form({ locale, ref: q.ref, key: q.key })))
const briefByRef = async (ref: string) => (await world.payload.find({ collection: 'briefs', where: { reference: { equals: ref } }, depth: 0, overrideAccess: true })).docs[0]!

async function signInMember() {
  const user = await createUser()
  const { token } = await (await getTestPayload()).login({ collection: 'users', data: { email: user.email!, password: 'password-123' } })
  jar.set('payload-token', { value: token! })
  return { user, token: token! }
}

/** The app's call: `POST quotations/{ref}/{key}/accept`, with or without a Bearer token. */
async function apiAccept(q: { ref: string; key: string }, token?: string) {
  const res = await acceptQuotationV1(
    new Request(`http://localhost/api/mobile/v1/quotations/${q.ref}/${q.key}/accept`, {
      method: 'POST',
      headers: { 'x-shoot-install': crypto.randomUUID(), 'accept-language': 'en', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    }),
    { params: Promise.resolve(q) },
  )
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

describe('021 amendment: sign in to accept the quotation', () => {
  beforeAll(async () => {
    world = await bookingWorld()
    provider = installRecordingProvider()
    // The defaults, not the booking world's explicit switch-off.
    await world.payload.updateGlobal({ slug: 'site-settings', data: { briefNeedsSignIn: null } as never, context: quiet })
  })
  afterAll(() => setOtpProvider(undefined))
  beforeEach(() => {
    jar.clear()
    jar.set('sp_vid', { value: crypto.randomUUID() })
  })

  describe('US6 a guest sees the matching creators without an account', () => {
    it('BS-US6-S4 fresh settings: "Briefs need sign-in" is off, and a missing value counts as off', async () => {
      const global = world.payload.config.globals.find((g) => g.slug === 'site-settings')!
      const fields = JSON.stringify(global.fields, (_k, v) => (typeof v === 'function' ? undefined : v))
      expect(fields).toMatch(/"name":"briefNeedsSignIn","type":"checkbox","defaultValue":false/)
      expect(briefNeedsSignIn({ briefNeedsSignIn: null })).toBe(false)
      expect(briefNeedsSignIn({ briefNeedsSignIn: undefined })).toBe(false)
      expect(briefNeedsSignIn({ briefNeedsSignIn: true })).toBe(true)
    })

    it('BS-US6-S1 a guest’s brief is recorded at once, with no member, and goes to step 2', async () => {
      const { ref } = await guestBrief()
      const brief = await briefByRef(ref)
      expect(brief.member ?? null).toBeNull()
    })

    it('BS-US6-S3 step 3 issues a guest’s quotation with no sign-in; the booking has no member yet', async () => {
      const q = await guestQuote()
      expect(q.url).toMatch(/^\/q\//)
      const booking = await bookingByRef(world.payload, q.ref)
      expect(booking.state).toBe('quoted')
      expect(booking.member ?? null).toBeNull()
      expect(booking.client).toMatchObject({ name: 'Layla Hassan', whatsapp: '+971501234567' })
    })
  })

  describe('US7 a guest signs in to accept the quotation (website)', () => {
    it('BS-US7-S2 a guest who taps Accept goes to sign-in for this quotation; nothing changes', async () => {
      const q = await guestQuote()
      expect(await accept(q)).toBe(`/login?next=${encodeURIComponent(`/q/${q.ref}/${q.key}`)}&for=accept`)
      expect(await accept(q, 'ar')).toBe(`/ar/login?next=${encodeURIComponent(`/q/${q.ref}/${q.key}`)}&for=accept`)
      const booking = await bookingByRef(world.payload, q.ref)
      expect(booking.state).toBe('quoted')
      expect(booking.member ?? null).toBeNull()
    })

    it('BS-US7-S3 the code with the accept intent: a new number becomes a client with no role question, back on the quotation', async () => {
      const q = await guestQuote()
      const next = `/q/${q.ref}/${q.key}`
      const phone = freshPhone()
      expect(await redirected(() => requestCodeAction(undefined, form({ locale: 'en', phone, channel: 'sms', next, intent: 'accept' })))).toEqual({ href: '/login/code', locale: 'en' })
      expect(JSON.parse(jar.get('shoot-otp')!.value)).toMatchObject({ intent: 'accept', next })
      // No askRole: the code step for the accept intent never asks client or creator.
      expect(await redirected(() => verifyCodeAction(undefined, form({ locale: 'en', code: provider.sent.at(-1)!.code })))).toEqual({ href: next, locale: 'en' })
      const user = (await world.payload.find({ collection: 'users', where: { username: { equals: phone } }, overrideAccess: true })).docs[0]!
      expect(user.accountType).toBe('seeker')
      expect(jar.get('payload-token')?.value).toBeTruthy()
      // Signing in accepted nothing: the person taps Accept on the quotation.
      expect((await bookingByRef(world.payload, q.ref)).state).toBe('quoted')
    })

    it('BS-US7-S4 one tap accepts; the booking and its brief now belong to the member', async () => {
      const q = await guestQuote()
      const { user } = await signInMember()
      expect(await accept(q)).toBe(`/q/${q.ref}/${q.key}`)
      const booking = await bookingByRef(world.payload, q.ref)
      expect(booking.state).toBe('accepted')
      expect(Number(typeof booking.member === 'object' ? booking.member?.id : booking.member)).toBe(user.id)
      expect((await briefByRef(q.brief.ref)).member).toBe(user.id)
      expect(booking.client).toMatchObject({ name: 'Layla Hassan', whatsapp: '+971501234567' })
    })

    it('BS-US7-S5 a quotation that belongs to another member is not accepted', async () => {
      const fresh = await guestQuote()
      const owner = await signInMember()
      await world.payload.update({ collection: 'bookings', id: (await bookingByRef(world.payload, fresh.ref)).id, data: { member: owner.user.id } as never, overrideAccess: true, context: { bookingTransition: true, disableRevalidate: true } })
      await signInMember()
      expect(await accept(fresh)).toBe(`/q/${fresh.ref}/${fresh.key}?error=booking.errors.otherAccount`)
      expect((await bookingByRef(world.payload, fresh.ref)).state).toBe('quoted')
    })

    it('BS-US7-S6 a member accepts their own quotation at once', async () => {
      const { user } = await signInMember()
      const q = await guestQuote()
      expect((await bookingByRef(world.payload, q.ref)).member).toBeTruthy()
      expect(await accept(q)).toBe(`/q/${q.ref}/${q.key}`)
      const booking = await bookingByRef(world.payload, q.ref)
      expect(booking.state).toBe('accepted')
      expect(Number(typeof booking.member === 'object' ? booking.member?.id : booking.member)).toBe(user.id)
    })
  })

  describe('US8 accepting asks for sign-in on every channel', () => {
    it('BS-US8-S1 the app’s accept without a member: 401 booking.errors.signInRequired, nothing changes', async () => {
      const q = await guestQuote()
      jar.clear()
      const res = await apiAccept(q)
      expect(res.status).toBe(401)
      expect(res.body.code).toBe('booking.errors.signInRequired')
      expect((await bookingByRef(world.payload, q.ref)).state).toBe('quoted')
      // A wrong key is still a 404, checked first.
      expect((await apiAccept({ ref: q.ref, key: 'nope' })).status).toBe(404)
    })

    it('BS-US8-S4 the app’s accept for another member’s booking: 409 booking.errors.otherAccount; its own: accepted and claimed', async () => {
      const q = await guestQuote()
      const owner = await signInMember()
      await world.payload.update({ collection: 'bookings', id: (await bookingByRef(world.payload, q.ref)).id, data: { member: owner.user.id } as never, overrideAccess: true, context: { bookingTransition: true, disableRevalidate: true } })
      const other = await signInMember()
      jar.clear()
      const refused = await apiAccept(q, other.token)
      expect(refused.status).toBe(409)
      expect(refused.body.code).toBe('booking.errors.otherAccount')

      const guest = await guestQuote()
      jar.clear()
      const ok = await apiAccept(guest, other.token)
      expect(ok.status).toBe(200)
      expect(ok.body.state).toBe('accepted')
      const booking = await bookingByRef(world.payload, guest.ref)
      expect(Number(typeof booking.member === 'object' ? booking.member?.id : booking.member)).toBe(other.user.id)
    })
  })
})
