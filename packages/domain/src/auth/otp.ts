import { normaliseE164 } from '../contact/whatsapp'

/**
 * The one-time-code rules (feature 009, research R4). Framework-free and pure: codes are generated,
 * fingerprinted and compared in `apps/web/src/modules/auth/otp/`, never here.
 */

export const OTP_CODE_LENGTH = 6
export const OTP_TTL_MS = 5 * 60_000
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_MS = 60_000
export const OTP_CHANNELS = ['sms', 'whatsapp'] as const
export type OtpChannel = (typeof OTP_CHANNELS)[number]

/** Hourly allowances (FR-030). 5 requests × 5 attempts bounds guesses per number to 25 an hour (SC-005). */
export const OTP_LIMITS = { requestsPerPhone: 5, requestsPerIp: 20, requestsPerInstall: 10, verifiesPerIp: 30 } as const

const UAE_MOBILE = /^\+9715\d{8}$/

/**
 * A UAE mobile number in E.164 (`+9715XXXXXXXX`), or `null`. Accepts `05XXXXXXXX`, `5XXXXXXXX`,
 * `9715XXXXXXXX`, `009715XXXXXXXX` and `+9715XXXXXXXX`, with spaces, dashes, dots and brackets.
 * Every UAE mobile range starts with 5, so no operator prefix is listed (FR-001).
 */
export function normaliseUaeMobile(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().]/g, '')
  let candidate: string
  if (/^05\d{8}$/.test(compact)) candidate = `+971${compact.slice(1)}`
  else if (/^5\d{8}$/.test(compact)) candidate = `+971${compact}`
  else if (/^9715\d{8}$/.test(compact)) candidate = `+${compact}`
  else candidate = compact
  const e164 = normaliseE164(candidate)
  return e164 !== null && UAE_MOBILE.test(e164) ? e164 : null
}

/** Zero-pads a number to the six digits of a code. */
export function formatCode(n: number): string {
  return String(n).padStart(OTP_CODE_LENGTH, '0')
}

export function isCodeShape(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value)
}

export type ChallengeState = 'live' | 'expired' | 'used' | 'locked'

export interface ChallengeFacts {
  expiresAt: Date | string
  usedAt?: Date | string | null
  supersededAt?: Date | string | null
  attempts: number
}

const time = (value: Date | string): number => (value instanceof Date ? value.getTime() : Date.parse(value))

/** Used, then expired (superseded counts as expired), then locked, else live (data-model.md). */
export function challengeState(challenge: ChallengeFacts, now: Date): ChallengeState {
  if (challenge.usedAt) return 'used'
  if (challenge.supersededAt || now.getTime() >= time(challenge.expiresAt)) return 'expired'
  if (challenge.attempts >= OTP_MAX_ATTEMPTS) return 'locked'
  return 'live'
}

export type VerifyOutcome = 'ok' | 'invalid' | 'expired' | 'locked'

/** A used or expired challenge answers expired and a locked one locked, even with the right code (OT-US1-S5). */
export function verifyOutcome({ state, codeMatches }: { state: ChallengeState; codeMatches: boolean }): VerifyOutcome {
  if (state === 'used' || state === 'expired') return 'expired'
  if (state === 'locked') return 'locked'
  return codeMatches ? 'ok' : 'invalid'
}

/** When the next code may be sent. */
export function resendAt(lastSentAt: Date): Date {
  return new Date(lastSentAt.getTime() + OTP_RESEND_COOLDOWN_MS)
}

export function canResend(lastSentAt: Date, now: Date): boolean {
  return now.getTime() >= resendAt(lastSentAt).getTime()
}

/** `+971501234567` → `+971 50 123 4567`, for showing a person their own number; never logged. */
export function maskPhone(e164: string): string {
  const m = /^\+971(\d{2})(\d{3})(\d{4})$/.exec(e164)
  return m ? `+971 ${m[1]} ${m[2]} ${m[3]}` : e164
}
