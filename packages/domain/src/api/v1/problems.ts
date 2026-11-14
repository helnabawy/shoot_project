import { z } from 'zod'

/**
 * `application/problem+json` (research R6). Codes are message keys: the client owns the words, in
 * the person's language, so a problem never carries a title or detail.
 */

/** A message key: `api.errors.notFound`, `contact.errors.whatsappFormat`. */
export const MESSAGE_KEY = /^[a-z][a-zA-Z]*(\.[a-zA-Z-]+)+$/

/** Every problem code v1 can answer. Adding one is additive; removing one is breaking (R11). */
export const PROBLEM_CODES = [
  'api.errors.invalidInput',
  'api.errors.invalidField',
  'api.errors.localeUnsupported',
  'api.errors.notFound',
  'api.errors.unauthorized',
  'api.errors.tokenInvalid',
  'api.errors.rateLimited',
  'api.errors.unexpected',
  // 009: sign-in by one-time code (contracts/auth-api.md).
  'auth.errors.phoneInvalid',
  'auth.errors.tooManyRequests',
  'auth.errors.resendTooSoon',
  'auth.errors.sendFailed',
  'auth.errors.codeInvalid',
  'auth.errors.codeExpired',
  'auth.errors.codeLocked',
  'auth.errors.useEmailSignIn',
  'auth.errors.numberTaken',
  'auth.errors.personaRequired',
  'auth.errors.personaInactive',
  'auth.errors.acceptTerms',
  // 013: the client account.
  'account.errors.emailInvalid',
  'account.errors.emailInUse',
  'account.errors.nameLength',
  // 014: the creator's own account (contracts/mobile-api.md).
  'creators.errors.notProvider',
  'creators.errors.noProfile',
  'creators.errors.generic',
  'creators.errors.required',
  'creators.submit.incomplete',
  'creators.identity.kind',
  'creators.identity.file',
  'creators.identity.type',
  'creators.identity.size',
  'creators.samples.limit',
  'creators.samples.image',
  'creators.samples.poster',
  'creators.samples.category',
  'media.upload.type',
  'media.upload.size',
  'availability.errors.notYours',
  'availability.errors.generic',
  'booking.errors.notYours',
  'booking.errors.not-allowed',
  'booking.errors.not-found',
  'booking.errors.dateTaken',
  // 012: Quick Match and booking (contracts/booking-api.md).
  'booking.errors.unavailable',
  'booking.errors.creatorUnavailable',
  'booking.errors.terminal',
  'booking.errors.expired-quotation',
  // 010: recording a brief.
  'brief.errors.required',
  'brief.errors.optionGone',
  'brief.errors.pastDate',
  'brief.errors.tooMany',
  'brief.errors.generic',
  // 019: the creator brief inbox and push.
  'inbox.errors.briefClosed',
  'inbox.errors.notMatching',
  'inbox.errors.reasonUnknown',
  'inbox.errors.alreadyPicked',
  'push.errors.tokenInvalid',
] as const
export type ProblemCode = (typeof PROBLEM_CODES)[number]

/** The statuses a problem can carry: 008's, plus 403, 409 and 503 from 009 (additive). */
export const PROBLEM_STATUSES = [401, 403, 404, 409, 422, 429, 500, 503] as const
export const problemStatusV1 = z.literal(PROBLEM_STATUSES)
export type ProblemStatus = z.infer<typeof problemStatusV1>

/** One field that failed: `query.page` and the message key that explains it. */
export const problemFieldV1 = z.object({ path: z.string(), code: z.string().regex(MESSAGE_KEY) })
export type ProblemField = z.infer<typeof problemFieldV1>

export const problemV1 = z
  .object({
    type: z.literal('about:blank'),
    status: problemStatusV1,
    code: z.enum(PROBLEM_CODES),
    /** Present on 422 only. */
    fields: z.array(problemFieldV1).optional(),
    /** Seconds to wait; present on 429 only. */
    retryAfter: z.int().nonnegative().optional(),
  })
  .refine((p) => p.fields === undefined || p.status === 422, { message: 'fields belong to a 422', path: ['fields'] })
  .refine((p) => p.retryAfter === undefined || p.status === 429, { message: 'retryAfter belongs to a 429', path: ['retryAfter'] })
export type ProblemV1 = z.infer<typeof problemV1>
