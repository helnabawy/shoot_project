import crypto from 'node:crypto'
import { formatCode, isCodeShape } from '@shoot/domain/auth'
import { env } from '@/shared/lib/env'

/**
 * Codes and fingerprints (feature 009, research R5). A stored row can reveal neither a code nor a
 * number: both are HMAC-SHA256 digests keyed by `OTP_HMAC_SECRET`, which is not in the database.
 */

function secret(): string {
  const value = env().OTP_HMAC_SECRET
  if (!value) throw new Error('OTP_HMAC_SECRET is not set (openssl rand -hex 32); see apps/web/.env.example')
  return value
}

const hmac = (input: string) => crypto.createHmac('sha256', secret()).update(input).digest('hex')

/** Six uniform digits from the CSPRNG. */
export function generateCode(): string {
  // Local testing only: env() refuses OTP_FIXED_CODE in a production deployment.
  const fixed = env().OTP_FIXED_CODE
  if (fixed) return fixed
  return formatCode(crypto.randomInt(0, 1_000_000))
}

/** Bound to the challenge, so one challenge's digest says nothing about another's. */
export function codeHash(challengeId: string, code: string): string {
  return hmac(`code:${challengeId}:${code}`)
}

/** Keyed, so the 10^8 UAE mobile numbers cannot be enumerated against it. */
export function phoneHash(e164: string): string {
  return hmac(`phone:${e164}`)
}

const DUMMY = '0'.repeat(64)

/** Constant-time comparison; a malformed code is compared against a dummy digest so it takes as long. */
export function codesMatch(stored: string, challengeId: string, code: string): boolean {
  const shaped = isCodeShape(code)
  const candidate = Buffer.from(shaped ? codeHash(challengeId, code) : codeHash(challengeId, DUMMY), 'hex')
  const expected = Buffer.from(stored.length === 64 ? stored : DUMMY, 'hex')
  return crypto.timingSafeEqual(candidate, expected) && shaped && stored.length === 64
}

/** Constant-time equality of two hex digests (the phone check on verify). */
export function digestsEqual(a: string, b: string): boolean {
  if (a.length !== 64 || b.length !== 64) return false
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}
