import { pushPreferenceV1 } from '@shoot/domain/api/v1'
import { beforeAll, describe, expect, it } from 'vitest'
import { GET as preferenceRoute, PUT as setPreferenceRoute } from '@/app/(payload)/api/mobile/v1/me/push/route'
import { DELETE as removeRoute } from '@/app/(payload)/api/mobile/v1/me/push/devices/[token]/route'
import { POST as registerRoute } from '@/app/(payload)/api/mobile/v1/me/push/devices/route'
import type { RouteHandler } from '@/shared/api/handler'
import { createUser, getTestPayload } from './setup/payload'

/** BI-US6: devices register for app push, sign-out removes them, and each member has an on/off switch. */

type U = Awaited<ReturnType<typeof createUser>>

async function tokenFor(user: U) {
  return (await (await getTestPayload()).login({ collection: 'users', data: { email: user.email!, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, opts: { method?: string; body?: unknown; params?: Record<string, string> } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

const devicesOf = async (user: U) =>
  (await (await getTestPayload()).find({ collection: 'push-devices', where: { user: { equals: user.id } }, depth: 0, overrideAccess: true })).docs

describe('BI-US6 push devices and the switch', () => {
  let a: U
  let b: U
  let tokenA: string
  let tokenB: string

  beforeAll(async () => {
    a = await createUser(['member'])
    b = await createUser(['member'])
    tokenA = await tokenFor(a)
    tokenB = await tokenFor(b)
  })

  it('BI-US6-S2 allowing push registers the device once; re-registering updates its language', async () => {
    const body = { token: 'fcm-token-a-1', platform: 'ios', locale: 'en' }
    expect((await call(registerRoute, 'me/push/devices', tokenA, { method: 'POST', body })).status).toBe(204)
    expect((await call(registerRoute, 'me/push/devices', tokenA, { method: 'POST', body: { ...body, locale: 'ar' } })).status).toBe(204)
    const devices = await devicesOf(a)
    expect(devices).toHaveLength(1)
    expect(devices[0]).toMatchObject({ platform: 'ios', locale: 'ar' })
  })

  it('a shared phone: the token moves to the member now signed in', async () => {
    expect((await call(registerRoute, 'me/push/devices', tokenB, { method: 'POST', body: { token: 'fcm-token-a-1', platform: 'ios', locale: 'en' } })).status).toBe(204)
    expect(await devicesOf(a)).toHaveLength(0)
    expect(await devicesOf(b)).toHaveLength(1)
  })

  it('BI-US6-S2 sign-out removes the device; an unknown or someone else’s token changes nothing', async () => {
    expect((await call(removeRoute, 'me/push/devices/fcm-token-a-1', tokenA, { method: 'DELETE', params: { token: 'fcm-token-a-1' } })).status).toBe(204)
    expect(await devicesOf(b)).toHaveLength(1)
    expect((await call(removeRoute, 'me/push/devices/fcm-token-a-1', tokenB, { method: 'DELETE', params: { token: 'fcm-token-a-1' } })).status).toBe(204)
    expect(await devicesOf(b)).toHaveLength(0)
    expect((await call(removeRoute, 'me/push/devices/nope', tokenB, { method: 'DELETE', params: { token: 'nope' } })).status).toBe(204)
  })

  it('BI-US6-S3 the switch reads and writes the member’s own preference', async () => {
    expect(pushPreferenceV1.parse(await (await call(preferenceRoute, 'me/push', tokenA)).json())).toEqual({ enabled: true })
    const off = await call(setPreferenceRoute, 'me/push', tokenA, { method: 'PUT', body: { enabled: false } })
    expect(pushPreferenceV1.parse(await off.json())).toEqual({ enabled: false })
    const user = await (await getTestPayload()).findByID({ collection: 'users', id: a.id, depth: 0, overrideAccess: true })
    expect(user.pushEnabled).toBe(false)
    expect(pushPreferenceV1.parse(await (await call(preferenceRoute, 'me/push', tokenB)).json())).toEqual({ enabled: true })
  })

  it('signed out: 401; an invalid body: 422', async () => {
    expect((await call(preferenceRoute, 'me/push', null)).status).toBe(401)
    expect((await call(registerRoute, 'me/push/devices', tokenA, { method: 'POST', body: { token: '', platform: 'web', locale: 'fr' } })).status).toBe(422)
  })
})
