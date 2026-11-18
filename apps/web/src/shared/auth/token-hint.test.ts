import { describe, expect, it } from 'vitest'
import { accountTypeHint, PAYLOAD_TOKEN_COOKIE } from './token-hint'

const b64url = (value: unknown) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
const jwt = (payload: unknown) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.signature`

describe('CH-US2-S1 the account type hint in the session token', () => {
  it('reads a provider from the token payload', () => {
    expect(accountTypeHint(jwt({ id: 7, collection: 'users', accountType: 'provider', roles: ['member'] }))).toBe('provider')
  })

  it('reads nothing for a seeker, an editor or a token without an account type', () => {
    expect(accountTypeHint(jwt({ accountType: 'seeker' }))).toBeNull()
    expect(accountTypeHint(jwt({ roles: ['editor'] }))).toBeNull()
    expect(accountTypeHint(jwt({ accountType: 'admin' }))).toBeNull()
  })

  it('reads nothing when there is no cookie', () => {
    expect(accountTypeHint(undefined)).toBeNull()
    expect(accountTypeHint('')).toBeNull()
  })

  it('never throws on a malformed token', () => {
    for (const bad of ['not-a-token', 'a.b', 'a.b.c', `a.${b64url('not json')}.c`, `a.${b64url('"provider"')}.c`, `a.${b64url('null')}.c`, 'a.%%%.c', `a.${'x'.repeat(10_000)}.c`]) {
      expect(accountTypeHint(bad), bad.slice(0, 20)).toBeNull()
    }
  })

  it('ignores an oversized cookie without decoding it', () => {
    expect(accountTypeHint(jwt({ accountType: 'provider', pad: 'x'.repeat(8_000) }))).toBeNull()
  })

  it('names the cookie Payload uses', () => {
    expect(PAYLOAD_TOKEN_COOKIE).toBe('payload-token')
  })
})
