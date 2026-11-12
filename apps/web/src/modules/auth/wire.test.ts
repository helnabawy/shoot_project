import { meV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import type { User } from '@/payload-types'
import { toWireMe } from './wire'

const base = {
  id: 42,
  name: null,
  username: '+971501234567',
  phone: '+971501234567',
  email: null,
  roles: ['member'],
  accountType: 'provider',
  persona: [{ id: 1, slug: 'photographer' }, 2],
  sessions: [{ id: 's', expiresAt: '2026-12-20T00:00:00.000Z' }],
  hash: 'h',
  salt: 's',
  loginAttempts: 3,
  lockUntil: '2026-12-20T00:00:00.000Z',
  updatedAt: '',
  createdAt: '',
} as unknown as User

describe('toWireMe (meV1)', () => {
  it('sends only the public fields, persona slugs and the verified number', () => {
    const me = toWireMe(base, 'en')
    expect(meV1.parse(me)).toEqual({ id: '42', name: null, phone: '+971501234567', email: null, accountType: 'provider', personas: ['photographer'], locale: 'en' })
    for (const key of ['sessions', 'hash', 'salt', 'loginAttempts', 'lockUntil', 'roles', 'username']) expect(me).not.toHaveProperty(key)
  })

  it('sends phone: null for an email account and seeker for an unknown type', () => {
    const me = toWireMe({ ...base, username: null, email: 'a@b.c', name: 'Sara', accountType: 'x' as never, persona: null } as unknown as User, 'ar')
    expect(me).toMatchObject({ phone: null, email: 'a@b.c', name: 'Sara', accountType: 'seeker', personas: [], locale: 'ar' })
  })
})
