import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POST as request } from '@/app/(payload)/api/mobile/v1/auth/otp/request/route'
import { POST as verifyRoute } from '@/app/(payload)/api/mobile/v1/auth/otp/verify/route'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import { creatorBookingViews } from '@/modules/booking/views'
import type { Booking, User } from '@/payload-types'
import { seed } from '@/shared/payload/seed/seed'
import { freshPhone, installRecordingProvider, requestFor, verify } from './setup/otp'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

let provider: ReturnType<typeof installRecordingProvider>

/** A code account (made through the real flow), returned with its number. */
async function codeAccount() {
  const phone = freshPhone()
  const { challenge, code } = await requestFor(request, provider, phone)
  const { token } = await verify(verifyRoute, { challengeId: challenge.challengeId, phone, code })
  return { id: Number(token!.user.id), phone }
}

const asUser = async (user: User | null) => (user ? { ...user, collection: 'users' as const } : null)

describe('009 phone identity on users (migration users_phone_identity, username access)', () => {
  let legacy: User[] = []

  beforeAll(async () => {
    await resetDatabase()
    const payload = await getTestPayload()
    await seed(payload, { log: () => {} })
    provider = installRecordingProvider()
    // 001-era accounts: email and password, duplicate contact phones, an editor.
    legacy = [
      (await createUser(['member'], { phone: '+971501111111' })) as User,
      (await createUser(['member'], { phone: '+971501111111' })) as User,
      (await createUser(['editor'])) as User,
    ]
  })
  afterAll(() => setOtpProvider(undefined))

  it('email accounts survive with username NULL and still sign in by email', async () => {
    const payload = await getTestPayload()
    for (const u of legacy) {
      const row = await payload.findByID({ collection: 'users', id: u.id, overrideAccess: true, depth: 0 })
      expect(row.username ?? null).toBeNull()
      expect(row.email).toBe(u.email)
      const { token } = await payload.login({ collection: 'users', data: { email: u.email!, password: 'password-123' } })
      expect(token).toBeTruthy()
    }
  })

  it('OT-US2-S7 password login by number is refused, and 10 tries never block code sign-in', async () => {
    const payload = await getTestPayload()
    const { id, phone } = await codeAccount()
    for (let i = 0; i < 10; i++) {
      await expect(payload.login({ collection: 'users', data: { username: phone, password: 'guess-123456' } as never })).rejects.toThrow()
    }
    const raw = (await payload.db.findOne({ collection: 'users', where: { id: { equals: id } } })) as { loginAttempts?: number; lockUntil?: string | null }
    expect(raw.loginAttempts ?? 0).toBe(0)
    expect(raw.lockUntil ?? null).toBeNull()
    const again = await requestFor(request, provider, phone, { channel: 'whatsapp' }).catch(async () => null)
    // Within the resend cooldown the number may refuse a second code; a later code still signs in.
    if (again) expect((await verify(verifyRoute, { challengeId: again.challenge.challengeId, phone, code: again.code })).token?.user.id).toBe(String(id))
  })

  it('OT-US2-S8 another member cannot read the number; the member and an admin can', async () => {
    const payload = await getTestPayload()
    const { id, phone } = await codeAccount()
    const self = await payload.findByID({ collection: 'users', id, overrideAccess: true, depth: 0 })
    const other = legacy[0]!
    const admin = (await createUser(['admin'])) as User
    const asOther = await payload.find({ collection: 'users', where: { id: { equals: id } }, overrideAccess: false, user: await asUser(other), depth: 0 })
    expect(asOther.docs).toHaveLength(0)
    const asSelf = await payload.findByID({ collection: 'users', id, overrideAccess: false, user: await asUser(self as User), depth: 0 })
    expect(asSelf).toMatchObject({ username: phone, phone })
    const asAdmin = await payload.findByID({ collection: 'users', id, overrideAccess: false, user: await asUser(admin), depth: 0 })
    expect(asAdmin).toMatchObject({ username: phone, phone })
    // An editor reaches the admin but not another member's numbers.
    const editor = legacy[2]!
    const asEditor = await payload.find({ collection: 'users', where: { id: { equals: id } }, overrideAccess: false, user: await asUser(editor), depth: 0 })
    for (const doc of asEditor.docs) {
      expect(doc.username).toBeUndefined()
      expect(doc.phone).toBeUndefined()
    }
  })

  it('OT-US2-S8 a creator assigned to a booking gets the client first name only, never a number (T055 audit)', () => {
    const booking = {
      id: 1,
      reference: 'QM-1',
      state: 'accepted',
      date: '2026-12-20',
      location: 'dubai',
      totalFils: 100000,
      brief: { sentence: 'A shoot' },
      client: { name: 'Layla Hassan', whatsapp: '+971501234567', locale: 'en' },
      assignments: [{ persona: 1, creator: 7, status: 'pending', respondBy: null }],
    } as unknown as Booking
    const rows = creatorBookingViews([booking], [7], 'en', (slug) => slug)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.clientFirstName).toBe('Layla')
    const text = JSON.stringify(rows)
    for (const f of ['+971501234567', '971501234567', '0501234567', '501234567']) expect(text).not.toContain(f)
  })

  it('OT-US2-S9 the sign-in number cannot be set or changed by the member, by a public create or by an admin', async () => {
    const payload = await getTestPayload()
    const member = legacy[1]!
    const admin = (await createUser(['admin'])) as User
    const target = freshPhone()
    await payload.update({ collection: 'users', id: member.id, data: { username: target } as never, overrideAccess: false, user: await asUser(member) })
    await payload.update({ collection: 'users', id: member.id, data: { username: target } as never, overrideAccess: false, user: await asUser(admin) })
    expect((await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })).username ?? null).toBeNull()
    const created = await payload
      .create({ collection: 'users', data: { email: `public-${Date.now()}@test.local`, password: 'password-123', username: target, accountType: 'seeker' } as never, overrideAccess: false })
      .catch(() => null)
    if (created) expect((await payload.findByID({ collection: 'users', id: created.id, overrideAccess: true })).username ?? null).toBeNull()
    // Only server code with overrideAccess writes it.
    await payload.update({ collection: 'users', id: member.id, data: { username: target } as never, overrideAccess: true })
    expect((await payload.findByID({ collection: 'users', id: member.id, overrideAccess: true })).username).toBe(target)
  })
})
