import { describe, expect, it } from 'vitest'
import { otpLimitMultiplier } from './allowance'

describe('OTP_RATE_LIMIT_MULTIPLIER', () => {
  it('defaults to 1 when unset, empty or invalid', () => {
    expect(otpLimitMultiplier(undefined)).toBe(1)
    expect(otpLimitMultiplier('')).toBe(1)
    expect(otpLimitMultiplier('0')).toBe(1)
    expect(otpLimitMultiplier('abc')).toBe(1)
  })

  it('reads a whole number', () => {
    expect(otpLimitMultiplier('10')).toBe(10)
  })
})
