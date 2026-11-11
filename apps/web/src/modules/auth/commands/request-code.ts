import 'server-only'
import { OTP_LIMITS } from '@shoot/domain/auth'
import type { OtpChallengeV1, OtpRequestV1 } from '@shoot/domain/api/v1'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { env } from '@/shared/lib/env'
import { consumeAll } from '../otp/allowance'
import { afterSend, createChallenge, latestFor } from '../otp/challenges'
import { codeHash, generateCode, phoneHash } from '../otp/codes'
import { logOtp } from '../otp/log'
import { renderSms } from '../otp/message'
import { getOtpProvider } from '../otp/providers'

const SEND_TIMEOUT_MS = 5_000

/**
 * `POST auth/otp/request` and the website's number step (contracts/auth-api.md, order of work). The
 * user table is never read: the answer is the same for every valid number (FR-031, OT-US2-S1).
 */
export async function requestCode(ctx: ActorContext, input: OtpRequestV1): Promise<OtpChallengeV1 | Problem> {
  const { payload } = ctx
  const now = ctx.now()
  const hash = phoneHash(input.phone)

  // Allowances: address, then install, then number.
  const checks: { key: string; limit: number }[] = []
  if (ctx.clientAddress) checks.push({ key: `otp:ip:${ctx.clientAddress}`, limit: OTP_LIMITS.requestsPerIp })
  if (ctx.installId) checks.push({ key: `otp:install:${ctx.installId}`, limit: OTP_LIMITS.requestsPerInstall })
  checks.push({ key: `otp:phone:${hash}`, limit: OTP_LIMITS.requestsPerPhone })
  const refused = await consumeAll(payload, checks, now)
  if (refused) return refused

  // The 60 s cooldown, exact and per number (a failed send leaves none).
  const latest = await latestFor(payload, hash)
  if (latest && !latest.supersededAt && latest.resendAt > now) {
    return problem(429, 'auth.errors.resendTooSoon', { retryAfter: Math.max(1, Math.ceil((latest.resendAt.getTime() - now.getTime()) / 1000)) })
  }

  const code = generateCode()
  const challenge = await createChallenge(payload, {
    phoneHash: hash,
    channel: input.channel,
    locale: ctx.locale,
    now,
    codeHashFor: (publicId) => codeHash(publicId, code),
  })
  const provider = getOtpProvider(env())
  const result = await provider.send(
    {
      challengeId: challenge.publicId,
      channel: input.channel,
      to: input.phone,
      code,
      locale: ctx.locale,
      text: renderSms(ctx.locale, code, env().NEXT_PUBLIC_SITE_URL),
    },
    { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) },
  )
  if (!result.ok) {
    await afterSend(payload, challenge.publicId, { failedAt: now })
    logOtp(payload, 'warn', { challengeId: challenge.publicId, provider: provider.name, reason: result.reason, requestId: ctx.requestId }, 'otp: send failed')
    return problem(503, 'auth.errors.sendFailed')
  }
  if (result.ref) await afterSend(payload, challenge.publicId, { ref: result.ref })

  return {
    challengeId: challenge.publicId,
    channel: input.channel,
    phone: input.phone,
    expiresAt: challenge.expiresAt.toISOString(),
    resendAt: challenge.resendAt.toISOString(),
  }
}
