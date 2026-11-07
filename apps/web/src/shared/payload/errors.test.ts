import { APIError, AuthenticationError, LockedAuth, ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'
import { errorStatus, isPayloadError } from './errors'

describe('payload error matching', () => {
  it('matches by the name Payload sets, so copies of a class in other chunks still match', () => {
    expect(isPayloadError(new LockedAuth(), 'LockedAuth')).toBe(true)
    expect(isPayloadError(new AuthenticationError(), 'AuthenticationError')).toBe(true)
    expect(isPayloadError(new ValidationError({ errors: [{ message: 'x', path: 'email' }] }), 'ValidationError')).toBe(true)
    // A look-alike from another bundle copy: same name, different class.
    const copy = Object.assign(new Error('locked'), { name: 'LockedAuth' })
    expect(isPayloadError(copy, 'LockedAuth')).toBe(true)
    expect(isPayloadError(new AuthenticationError(), 'LockedAuth')).toBe(false)
    expect(isPayloadError('LockedAuth', 'LockedAuth')).toBe(false)
  })

  it('reads the status of API errors', () => {
    expect(errorStatus(new APIError('slow down', 429))).toBe(429)
    expect(errorStatus(new Error('plain'))).toBeUndefined()
    expect(errorStatus(null)).toBeUndefined()
  })
})
