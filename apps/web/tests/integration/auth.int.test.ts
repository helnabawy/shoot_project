import { beforeAll, describe, expect, it } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, resetDatabase } from './setup/payload'

describe('US4 accounts', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('T083 (009) no public endpoint creates users; an admin does, and the password never comes back', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.create({ collection: 'users', data: { name: 'Public', email: 'public@test.local', password: 'password-123', accountType: 'seeker' }, overrideAccess: false }),
    ).rejects.toThrow()
    const admin = await createUser(['admin'])
    const user = await payload.create({
      collection: 'users',
      data: { name: 'Mariam', email: 'mariam@test.local', password: 'password-123', accountType: 'seeker' },
      overrideAccess: false,
      user: { ...admin, collection: 'users' },
    })
    expect(user).not.toHaveProperty('password')
    expect(JSON.stringify(user)).not.toMatch(/hash|salt/)
  })

  it('US4-S7 a member cannot grant themselves a role', async () => {
    const payload = await getTestPayload()
    const member = await createUser(['member'])
    const updated = await payload.update({ collection: 'users', id: member.id, data: { roles: ['admin'] }, overrideAccess: false, user: { ...member, collection: 'users' } })
    expect(updated.roles).toEqual(['member'])
  })

  it('US4-S3 refuses a second account with the same email', async () => {
    const payload = await getTestPayload()
    await expect(payload.create({ collection: 'users', data: { name: 'Again', email: 'mariam@test.local', password: 'password-123', accountType: 'seeker' } })).rejects.toThrow()
  })

  it('US4-S2 a provider needs a profession', async () => {
    const payload = await getTestPayload()
    await expect(payload.create({ collection: 'users', data: { name: 'Pro', email: 'pro@test.local', password: 'password-123', accountType: 'provider' } })).rejects.toThrow()
  })

  it('FR-022 logs in with the right password and reads the session', async () => {
    const payload = await getTestPayload()
    const result = await payload.login({ collection: 'users', data: { email: 'mariam@test.local', password: 'password-123' } })
    expect(result.token).toBeTruthy()
    const me = await payload.auth({ headers: new Headers({ Authorization: `JWT ${result.token}` }) })
    expect(me.user?.email).toBe('mariam@test.local')
    const anonymous = await payload.auth({ headers: new Headers() })
    expect(anonymous.user).toBeNull()
  })

  it('US4-S5 locks the account after 5 wrong passwords, even for the right one', async () => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'users', data: { name: 'Locked', email: 'locked@test.local', password: 'password-123', accountType: 'seeker' } })
    for (let i = 0; i < 5; i += 1) {
      await expect(payload.login({ collection: 'users', data: { email: 'locked@test.local', password: 'wrong-password' } })).rejects.toThrow()
    }
    await expect(payload.login({ collection: 'users', data: { email: 'locked@test.local', password: 'password-123' } })).rejects.toThrow(/locked/i)
  })

  it('FR-024 a member cannot read another member; an admin can', async () => {
    const payload = await getTestPayload()
    const a = await createUser(['member'])
    const b = await createUser(['member'])
    const admin = await createUser(['admin'])
    const asA = await payload.find({ collection: 'users', overrideAccess: false, user: a })
    expect(asA.docs.map((u) => u.id)).toEqual([a.id])
    await expect(payload.findByID({ collection: 'users', id: b.id, overrideAccess: false, user: a })).rejects.toThrow()
    await expect(payload.findByID({ collection: 'users', id: b.id, overrideAccess: false, user: admin })).resolves.toMatchObject({ id: b.id })
  })

  it('FR-016 only admins and editors may open the admin panel', async () => {
    const payload = await getTestPayload()
    const access = payload.collections.users.config.access.admin as (args: { req: { user: unknown } }) => boolean
    expect(access({ req: { user: await createUser(['member']) } })).toBe(false)
    expect(access({ req: { user: await createUser(['editor']) } })).toBe(true)
    expect(access({ req: { user: await createUser(['admin']) } })).toBe(true)
    expect(access({ req: { user: null } })).toBe(false)
  })
})
