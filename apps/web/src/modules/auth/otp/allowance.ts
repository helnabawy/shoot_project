import type { ProblemCode } from '@shoot/domain/api/v1'
import { APIError, createLocalReq, type Payload } from 'payload'
import { problem, type Problem } from '@/shared/api/problem'
import { consumeAllowance } from '@/shared/payload/rate-limit'

/**
 * Counts one action against each key's hourly allowance (research R7), in order; the first refusal
 * answers 429 with `retryAfter`. Keys carry a fingerprint or an address, never a number.
 */
export async function consumeAll(payload: Payload, checks: { key: string; limit: number }[], now: Date, code: ProblemCode = 'auth.errors.tooManyRequests'): Promise<Problem | null> {
  const req = await createLocalReq({}, payload)
  for (const { key, limit } of checks) {
    try {
      await consumeAllowance(req, key, limit, code, now.getTime())
    } catch (error) {
      if (error instanceof APIError && error.status === 429) {
        const retryAfter = (error.data as { retryAfter?: number } | undefined)?.retryAfter
        return problem(429, code, retryAfter === undefined ? {} : { retryAfter })
      }
      throw error
    }
  }
  return null
}
