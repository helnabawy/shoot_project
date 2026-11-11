import 'server-only'
import { OTP_LIMITS } from '@shoot/domain/auth'
import type { AuthTokenV1, OtpVerifyV1 } from '@shoot/domain/api/v1'
import type { User } from '@/payload-types'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { isEditorUser } from '@/shared/payload/access'
import { consumeAll } from '../otp/allowance'
import { attempt, markUsed, stateOf } from '../otp/challenges'
import { codesMatch, digestsEqual, phoneHash } from '../otp/codes'
import { mintSession } from '../otp/mint'
import { createCodeAccount, isUniqueViolation, resolvePersonas } from '../otp/signup'
import { toWireMe } from '../wire'

const CODE_INVALID = problem(422, 'auth.errors.codeInvalid', { fields: [{ path: 'body.code', code: 'auth.errors.codeInvalid' }] })

/**
 * Steps 2–6 of verify (contracts/auth-api.md): the address allowance, the provider signup's personas
 * (before any attempt is spent), the atomic attempt, the constant-time comparison and single use.
 * Shared by `verify-code` and the website's `link-number`. Before it succeeds no answer depends on
 * whether an account exists (FR-031).
 */
export async function proveCode(ctx: ActorContext, input: OtpVerifyV1): Promise<{ personaIds: number[] } | Problem> {
  const { payload } = ctx
  const now = ctx.now()
  if (ctx.clientAddress) {
    const refused = await consumeAll(payload, [{ key: `otp-verify:ip:${ctx.clientAddress}`, limit: OTP_LIMITS.verifiesPerIp }], now)
    if (refused) return refused
  }

  let personaIds: number[] = []
  if (input.signup?.accountType === 'provider') {
    const ids = await resolvePersonas(input.signup.personas, ctx.locale)
    if (!ids) return problem(422, 'auth.errors.personaInactive', { fields: [{ path: 'body.signup.personas', code: 'auth.errors.personaInactive' }] })
    personaIds = ids
  }

  const row = await attempt(payload, input.challengeId, now)
  if (!row) {
    const state = await stateOf(payload, input.challengeId, now)
    return problem(422, state === 'locked' ? 'auth.errors.codeLocked' : 'auth.errors.codeExpired')
  }
  // Both comparisons always run, so a wrong number and a wrong code take the same path.
  const codeOk = codesMatch(row.codeHash, input.challengeId, input.code)
  const phoneOk = digestsEqual(row.phoneHash, phoneHash(input.phone))
  if (!(codeOk && phoneOk)) return CODE_INVALID
  if (!(await markUsed(payload, input.challengeId, now))) return problem(422, 'auth.errors.codeExpired')
  return { personaIds }
}

async function findByUsername(ctx: ActorContext, phone: string): Promise<User | null> {
  const { docs } = await ctx.payload.find({ collection: 'users', where: { username: { equals: phone } }, depth: 1, limit: 1, overrideAccess: true })
  return (docs[0] as User | undefined) ?? null
}

/**
 * `POST auth/otp/verify` and the website's code step: proves the code, then finds the account by its
 * verified number or creates one from `signup` (research R12), refuses admins and editors (R13), and
 * mints a Payload session (R2).
 */
export async function verifyCode(ctx: ActorContext, input: OtpVerifyV1): Promise<AuthTokenV1 | Problem> {
  const proven = await proveCode(ctx, input)
  if ('status' in proven) return proven

  let user = await findByUsername(ctx, input.phone)
  let isNew = false
  if (!user) {
    try {
      const created = await createCodeAccount(ctx.payload, { phone: input.phone, signup: input.signup, personaIds: proven.personaIds, locale: ctx.locale, now: ctx.now() })
      isNew = true
      user = await findByUsername(ctx, input.phone)
      user ??= created
    } catch (error) {
      // Two first verifies of one new number: the second finds the account the first created.
      if (!isUniqueViolation(error)) throw error
      user = await findByUsername(ctx, input.phone)
      if (!user) throw error
    }
  }
  if (isEditorUser(user)) return problem(403, 'auth.errors.useEmailSignIn')

  const { token, exp } = await mintSession(ctx.payload, user.id, ctx.now())
  return { token, exp, isNew, user: toWireMe(user, ctx.locale) }
}
