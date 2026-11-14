import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { authRefreshV1, authTokenV1, meV1, otpChallengeV1, otpRequestV1, otpVerifyV1 } from './auth'

const example = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8')) as Record<string, unknown>

/** `{ path, code }` of every issue, as the handler reports them. */
const codes = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value)
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), code: i.message }))
}

describe('the 009 examples parse with their schemas', () => {
  it.each([
    [otpRequestV1, 'auth-request'],
    [otpChallengeV1, 'auth-challenge'],
    [otpVerifyV1, 'auth-verify-seeker'],
    [otpVerifyV1, 'auth-verify-provider'],
    [otpVerifyV1, 'auth-verify-sign-in'],
    [authTokenV1, 'auth-token'],
    [authRefreshV1, 'auth-refresh'],
    [meV1, 'me-seeker'],
    [meV1, 'me-provider'],
  ] as const)('%#: %s', (schema, name) => {
    expect(schema.safeParse(example(name)).success).toBe(true)
  })

  it('normalises the typed number and defaults the channel to SMS', () => {
    expect(otpRequestV1.parse({ phone: '050 123 4567' })).toEqual({ phone: '+971501234567', channel: 'sms' })
  })
})

describe('invalid bodies fail with the contract codes', () => {
  it('a landline or foreign number is auth.errors.phoneInvalid', () => {
    expect(codes(otpRequestV1, { phone: '+97141234567' })).toEqual([{ path: 'phone', code: 'auth.errors.phoneInvalid' }])
    expect(codes(otpRequestV1, { phone: '+966501234567', channel: 'sms' })).toEqual([{ path: 'phone', code: 'auth.errors.phoneInvalid' }])
  })

  it('an unknown channel is a generic field issue (not a message key)', () => {
    const [issue] = codes(otpRequestV1, { phone: '0501234567', channel: 'pigeon' })
    expect(issue?.path).toBe('channel')
    expect(issue?.code.startsWith('auth.')).toBe(false)
  })

  it('a 5-digit code is auth.errors.codeInvalid', () => {
    expect(codes(otpVerifyV1, { ...example('auth-verify-seeker'), code: '48271' })).toEqual([{ path: 'code', code: 'auth.errors.codeInvalid' }])
  })

  it('a provider signup needs personas and acceptTerms', () => {
    const base = example('auth-verify-seeker')
    expect(codes(otpVerifyV1, { ...base, signup: { accountType: 'provider', acceptTerms: true } })).toEqual([
      { path: 'signup.personas', code: 'auth.errors.personaRequired' },
    ])
    expect(codes(otpVerifyV1, { ...base, signup: { accountType: 'provider', personas: ['photographer'] } })).toEqual([
      { path: 'signup.acceptTerms', code: 'auth.errors.acceptTerms' },
    ])
    expect(codes(otpVerifyV1, { ...base, signup: { accountType: 'provider', personas: ['a', 'b', 'c', 'd', 'e'], acceptTerms: true } })).toEqual([
      { path: 'signup.personas', code: 'auth.errors.personaRequired' },
    ])
  })

  it('a seeker signup needs nothing, and acceptTerms may only be true', () => {
    const base = example('auth-verify-seeker')
    expect(otpVerifyV1.parse({ ...base, signup: {} }).signup).toEqual({ accountType: 'seeker', personas: [] })
    expect(codes(otpVerifyV1, { ...base, signup: { acceptTerms: false } })).toEqual([{ path: 'signup.acceptTerms', code: 'auth.errors.acceptTerms' }])
  })

  it.each(['S', 'x'.repeat(81)])('a name of %s.length characters is auth.errors.nameLength', (name) => {
    expect(codes(otpVerifyV1, { ...example('auth-verify-seeker'), signup: { name } })).toEqual([{ path: 'signup.name', code: 'auth.errors.nameLength' }])
  })

  it('a phone that is not normalised is refused on verify', () => {
    expect(codes(otpVerifyV1, { ...example('auth-verify-seeker'), phone: '0501234567' })).toEqual([{ path: 'phone', code: 'auth.errors.phoneInvalid' }])
  })

  it('an unknown account type is refused by meV1', () => {
    expect(meV1.safeParse({ ...example('me-seeker'), accountType: 'admin' }).success).toBe(false)
  })
})
