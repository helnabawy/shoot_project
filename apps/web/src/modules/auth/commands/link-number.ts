import 'server-only'
import type { OtpVerifyV1 } from '@shoot/domain/api/v1'
import type { User } from '@/payload-types'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { isUniqueViolation } from '../otp/signup'
import { proveCode } from './verify-code'

/**
 * Website only (US5, contracts/auth-api.md "Linking"): a member signed in by email adds a sign-in
 * number by code. Steps 1–6 of verify, then the number is attached to the signed-in account, or
 * refused with `numberTaken` when another account signs in with it. The session stays as it is.
 * The API's `otp/verify` never links (it ignores tokens).
 */
export async function linkNumber(ctx: ActorContext & { user: User }, input: Pick<OtpVerifyV1, 'challengeId' | 'phone' | 'code'>): Promise<{ linked: true } | Problem> {
  const { payload, user } = ctx
  if (user.username) return problem(409, 'auth.errors.numberTaken')
  const proven = await proveCode(ctx, { ...input, signup: undefined })
  if ('status' in proven) return proven

  const taken = await payload.find({ collection: 'users', where: { username: { equals: input.phone } }, limit: 1, depth: 0, overrideAccess: true })
  if (taken.docs.length > 0) return problem(409, 'auth.errors.numberTaken')
  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { username: input.phone, ...(user.phone ? {} : { phone: input.phone }) } as never,
      overrideAccess: true,
    })
  } catch (error) {
    if (isUniqueViolation(error)) return problem(409, 'auth.errors.numberTaken')
    throw error
  }
  return { linked: true }
}
