import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { assertion, fcmProvider, type ServiceAccount } from './fcm'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
const account: ServiceAccount = { project_id: 'shoot-test', client_email: 'push@shoot-test.iam.gserviceaccount.com', private_key: privateKey }
const now = new Date('2026-11-13T10:00:00.000Z')
const message = { token: 'device-token-1234', title: 'A creator said yes', body: 'Sara said yes to your brief', data: { event: 'brief-accepted', path: '/match/B-1/key' } }

const reply = (status: number, body: unknown) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })

describe('BI-US5-S4 the FCM provider', () => {
  it('signs a service-account JWT with RS256 for the messaging scope', () => {
    const [header, claims, signature] = assertion(account, now).split('.')
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(JSON.parse(Buffer.from(claims!, 'base64url').toString())).toMatchObject({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', iat: now.getTime() / 1000, exp: now.getTime() / 1000 + 3600 })
    expect(signature!.length).toBeGreaterThan(100)
  })

  it('sends with one cached access token, the notification and the tap data', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => (String(url).includes('oauth2') ? reply(200, { access_token: 'at-1', expires_in: 3600 }) : reply(200, { name: 'm/1' })))
    const provider = fcmProvider(account, { fetch: fetch as never, now: () => now, log: () => {} })
    expect(await provider.send(message)).toBe('sent')
    expect(await provider.send(message)).toBe('sent')
    expect(fetch.mock.calls.filter(([u]) => String(u).includes('oauth2'))).toHaveLength(1)
    const [url, init] = fetch.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toBe('https://fcm.googleapis.com/v1/projects/shoot-test/messages:send')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer at-1')
    expect(JSON.parse(String(init.body)).message).toMatchObject({ token: 'device-token-1234', notification: { title: 'A creator said yes' }, data: { path: '/match/B-1/key' } })
  })

  it('an unregistered device is gone; other errors fail quietly without logging the token', async () => {
    const logs: string[] = []
    const gone = fcmProvider(account, { fetch: (async (u: string) => (u.includes('oauth2') ? reply(200, { access_token: 'a', expires_in: 3600 }) : reply(404, '{"error":{"status":"NOT_FOUND"}}'))) as never, now: () => now, log: (l) => logs.push(l) })
    expect(await gone.send(message)).toBe('gone')
    const unregistered = fcmProvider(account, { fetch: (async (u: string) => (u.includes('oauth2') ? reply(200, { access_token: 'a', expires_in: 3600 }) : reply(400, '{"error":{"details":[{"errorCode":"UNREGISTERED"}]}}'))) as never, now: () => now, log: (l) => logs.push(l) })
    expect(await unregistered.send(message)).toBe('gone')
    const down = fcmProvider(account, { fetch: (async () => { throw new Error('network down') }) as never, now: () => now, log: (l) => logs.push(l) })
    expect(await down.send(message)).toBe('failed')
    const refused = fcmProvider(account, { fetch: (async (u: string) => (u.includes('oauth2') ? reply(200, { access_token: 'a', expires_in: 3600 }) : reply(500, 'oops'))) as never, now: () => now, log: (l) => logs.push(l) })
    expect(await refused.send(message)).toBe('failed')
    expect(logs.join(' ')).not.toContain('device-token')
  })
})
