import { describe, expect, it } from 'vitest'
import {
  OTP_LIMITS,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  canResend,
  challengeState,
  formatCode,
  isCodeShape,
  maskPhone,
  normaliseUaeMobile,
  resendAt,
  verifyOutcome,
} from './otp'

const now = new Date('2026-12-14T06:00:00.000Z')
const later = (ms: number) => new Date(now.getTime() + ms)

describe('OT-US1-S9 normaliseUaeMobile', () => {
  it.each(['0501234567', '501234567', '+971 50 123 4567', '00971501234567', '971-50-123-4567', '(050) 123.4567', '+971501234567'])(
    'accepts %s',
    (input) => {
      expect(normaliseUaeMobile(input)).toBe('+971501234567')
    },
  )

  it.each(['+97141234567', '041234567', '+966501234567', '05012345', '050123456789', 'abc', '', '+9715012345a7', '+971 60 123 4567'])(
    'refuses %s',
    (input) => {
      expect(normaliseUaeMobile(input)).toBeNull()
    },
  )
})

describe('challengeState and verifyOutcome', () => {
  const live = { expiresAt: later(OTP_TTL_MS), attempts: 0 }

  it('is live before expiry with attempts left', () => {
    expect(challengeState(live, now)).toBe('live')
    expect(challengeState({ ...live, expiresAt: later(OTP_TTL_MS).toISOString(), usedAt: null, supersededAt: null }, now)).toBe('live')
  })

  it('used beats expired and locked', () => {
    expect(challengeState({ ...live, usedAt: now, supersededAt: now, attempts: 9 }, later(OTP_TTL_MS))).toBe('used')
  })

  it('superseded reads as expired, before locked', () => {
    expect(challengeState({ ...live, supersededAt: now.toISOString(), attempts: OTP_MAX_ATTEMPTS }, now)).toBe('expired')
  })

  it('OT-US1-S6 now ≥ expiresAt is expired', () => {
    expect(challengeState(live, later(OTP_TTL_MS))).toBe('expired')
    expect(challengeState(live, later(OTP_TTL_MS - 1))).toBe('live')
  })

  it('OT-US1-S5 five attempts lock the challenge, and the right code is still locked', () => {
    const state = challengeState({ ...live, attempts: OTP_MAX_ATTEMPTS }, now)
    expect(state).toBe('locked')
    expect(verifyOutcome({ state, codeMatches: true })).toBe('locked')
  })

  it('maps the states to outcomes', () => {
    expect(verifyOutcome({ state: 'live', codeMatches: true })).toBe('ok')
    expect(verifyOutcome({ state: 'live', codeMatches: false })).toBe('invalid')
    expect(verifyOutcome({ state: 'used', codeMatches: true })).toBe('expired')
    expect(verifyOutcome({ state: 'expired', codeMatches: true })).toBe('expired')
  })
})

describe('resend, codes and display', () => {
  it('OT-US1-S7 a new code is allowed 60 s after the last one, not at 59 s', () => {
    expect(canResend(now, later(59_000))).toBe(false)
    expect(canResend(now, later(60_000))).toBe(true)
    expect(resendAt(now).toISOString()).toBe('2026-12-14T06:01:00.000Z')
  })

  it('formatCode pads to six digits; isCodeShape accepts six digits only', () => {
    expect(formatCode(42)).toBe('000042')
    expect(formatCode(482713)).toBe('482713')
    expect(isCodeShape('482713')).toBe(true)
    expect(isCodeShape('48271')).toBe(false)
    expect(isCodeShape('48271a')).toBe(false)
    expect(isCodeShape(482713)).toBe(false)
  })

  it('maskPhone groups a UAE number and leaves anything else', () => {
    expect(maskPhone('+971501234567')).toBe('+971 50 123 4567')
    expect(maskPhone('+15551234567')).toBe('+15551234567')
  })

  it('SC-005 bounds guesses per number to 25 an hour', () => {
    expect(OTP_LIMITS.requestsPerPhone * OTP_MAX_ATTEMPTS).toBe(25)
  })
})
