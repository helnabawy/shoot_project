import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type KeyPurpose = 'brief' | 'booking'

const secret = () => {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is required for private links.')
  return value
}

/** A random per-record salt; the only thing stored (hidden, unreadable through the API). */
export function newSalt(): string {
  return randomBytes(16).toString('base64url')
}

/**
 * The private link key (FR-011, research §2): HMAC of the record's salt with the server secret. The database
 * alone never reveals a working link, and the server can rebuild links for notifications.
 */
export function accessKey(salt: string, purpose: KeyPurpose): string {
  return createHmac('sha256', secret()).update(`${purpose}:${salt}`).digest('base64url')
}

export function keyMatches(key: string | null | undefined, salt: string | null | undefined, purpose: KeyPurpose): boolean {
  if (!key || !salt || !/^[A-Za-z0-9_-]{43}$/.test(key)) return false
  const expected = Buffer.from(accessKey(salt, purpose))
  const given = Buffer.from(key)
  return expected.length === given.length && timingSafeEqual(expected, given)
}
