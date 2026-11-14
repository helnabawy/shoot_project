import { createSign } from 'node:crypto'
import type { PushMessage, PushProvider, PushResult } from './types'

/**
 * Firebase Cloud Messaging HTTP v1 with platform primitives only (research R7): a service-account JWT signed
 * with RS256, exchanged for an OAuth access token cached until shortly before it expires, then
 * `messages:send`. Tokens, keys and message bodies are never logged.
 */

export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
  token_uri?: string
}

type Fetch = typeof fetch

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const TOKEN_URI = 'https://oauth2.googleapis.com/token'
const b64url = (value: string | Buffer) => Buffer.from(value).toString('base64url')

export function parseServiceAccount(base64: string): ServiceAccount {
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as ServiceAccount
}

/** The signed assertion for the token endpoint (RFC 7523). */
export function assertion(account: ServiceAccount, now: Date): string {
  const iat = Math.floor(now.getTime() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: account.token_uri ?? TOKEN_URI, iat, exp: iat + 3600 }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${b64url(signer.sign(account.private_key))}`
}

export function fcmProvider(account: ServiceAccount, options: { fetch?: Fetch; now?: () => Date; log?: (line: string) => void } = {}): PushProvider {
  const doFetch = options.fetch ?? fetch
  const now = options.now ?? (() => new Date())
  const log = options.log ?? ((line: string) => console.warn(line))
  let cached: { token: string; expires: number } | null = null

  async function accessToken(): Promise<string> {
    const at = now()
    if (cached && cached.expires - 60_000 > at.getTime()) return cached.token
    const res = await doFetch(account.token_uri ?? TOKEN_URI, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(account, at) }),
    })
    if (!res.ok) throw new Error(`token ${res.status}`)
    const json = (await res.json()) as { access_token: string; expires_in: number }
    cached = { token: json.access_token, expires: at.getTime() + json.expires_in * 1000 }
    return cached.token
  }

  return {
    name: 'fcm',
    async send(message: PushMessage): Promise<PushResult> {
      try {
        const res = await doFetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken()}` },
          body: JSON.stringify({
            message: {
              token: message.token,
              notification: { title: message.title, body: message.body },
              data: message.data,
              apns: { payload: { aps: { sound: 'default' } } },
              android: { priority: 'high' },
            },
          }),
        })
        if (res.ok) return 'sent'
        const text = await res.text()
        // The device uninstalled the app or the token rotated: forget it.
        if (res.status === 404 || /UNREGISTERED|NOT_FOUND/.test(text)) return 'gone'
        if (res.status === 400 && /registration token/i.test(text)) return 'gone'
        log(`[push] fcm send failed: ${res.status}`)
        return 'failed'
      } catch (error) {
        log(`[push] fcm send failed: ${(error as Error).message.slice(0, 80)}`)
        return 'failed'
      }
    },
  }
}
