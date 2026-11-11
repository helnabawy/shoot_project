import { z } from 'zod'
import { normaliseUaeMobile, OTP_CHANNELS } from '../../auth/otp'
import { ACCOUNT_TYPES, MAX_PROVIDER_PERSONAS } from '../../auth/schemas'
import { localeV1 } from './common'

/**
 * The sign-in shapes (feature 009, contracts/auth-api.md). Field failures carry message keys, so the
 * handler's `api.errors.invalidInput` lists them per field.
 */

const UAE_MOBILE_E164 = /^\+9715\d{8}$/
const isoDate = z.iso.datetime()

/** A number as typed; normalised to E.164, else `auth.errors.phoneInvalid`. */
const typedPhone = z.string().transform((value, ctx) => {
  const e164 = normaliseUaeMobile(value)
  if (!e164) {
    ctx.addIssue({ code: 'custom', message: 'auth.errors.phoneInvalid' })
    return z.NEVER
  }
  return e164
})

export const otpChannelV1 = z.enum(OTP_CHANNELS)

export const otpRequestV1 = z.object({
  phone: typedPhone,
  channel: otpChannelV1.default('sms'),
})
export type OtpRequestV1 = z.infer<typeof otpRequestV1>

export const otpChallengeV1 = z.object({
  challengeId: z.uuid(),
  channel: otpChannelV1,
  /** The normalised number, echoed to the person who typed it. */
  phone: z.string().regex(UAE_MOBILE_E164),
  expiresAt: isoDate,
  resendAt: isoDate,
})
export type OtpChallengeV1 = z.infer<typeof otpChallengeV1>

/** Used only when the number has no account yet (research R12). */
export const signupV1 = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES).default('seeker'),
    personas: z.array(z.string().min(1)).max(MAX_PROVIDER_PERSONAS, 'auth.errors.personaRequired').default([]),
    name: z.string().trim().min(2, 'auth.errors.nameLength').max(80, 'auth.errors.nameLength').optional(),
    acceptTerms: z.literal(true, { message: 'auth.errors.acceptTerms' }).optional(),
  })
  .superRefine((s, ctx) => {
    if (s.accountType !== 'provider') return
    if (s.personas.length === 0) ctx.addIssue({ code: 'custom', path: ['personas'], message: 'auth.errors.personaRequired' })
    if (s.acceptTerms !== true) ctx.addIssue({ code: 'custom', path: ['acceptTerms'], message: 'auth.errors.acceptTerms' })
  })
export type SignupV1 = z.infer<typeof signupV1>

export const otpVerifyV1 = z.object({
  challengeId: z.uuid(),
  phone: z.string().regex(UAE_MOBILE_E164, 'auth.errors.phoneInvalid'),
  code: z.string().regex(/^\d{6}$/, 'auth.errors.codeInvalid'),
  signup: signupV1.optional(),
})
export type OtpVerifyV1 = z.infer<typeof otpVerifyV1>

/** The signed-in member's own account. `phone` is the verified sign-in number. */
export const meV1 = z.object({
  id: z.string(),
  name: z.string().nullable(),
  phone: z.string().regex(UAE_MOBILE_E164).nullable(),
  email: z.string().nullable(),
  accountType: z.enum(ACCOUNT_TYPES),
  /** Persona slugs; labels come from `GET personas`. */
  personas: z.array(z.string()),
  locale: localeV1,
})
export type MeV1 = z.infer<typeof meV1>

export const authTokenV1 = z.object({
  token: z.string().min(1),
  /** Seconds since the epoch. */
  exp: z.int().positive(),
  isNew: z.boolean(),
  user: meV1,
})
export type AuthTokenV1 = z.infer<typeof authTokenV1>

export const authRefreshV1 = z.object({ token: z.string().min(1), exp: z.int().positive() })
export type AuthRefreshV1 = z.infer<typeof authRefreshV1>
