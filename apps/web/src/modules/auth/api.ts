import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { requestCode } from './commands/request-code'
import { endSession } from './commands/end-session'
import { refreshSession } from './commands/refresh-session'
import { verifyCode } from './commands/verify-code'
import { toWireMe } from './wire'

/**
 * The sign-in endpoints of `/api/mobile/v1` (feature 009, contracts/auth-api.md): thin adapters over
 * the commands, which the website's server actions share. Their bodies, headers and tokens are never
 * logged (defineHandler logs route and request id only).
 */

/** `POST auth/otp/request` → 202 `otpChallengeV1`. */
export const requestCodeV1 = defineHandler({ ...endpoints.otpRequest, run: (ctx, { body }) => requestCode(ctx, body) })

/** `POST auth/otp/verify` → `authTokenV1`. Ignores any token and never links accounts. */
export const verifyCodeV1 = defineHandler({ ...endpoints.otpVerify, run: (ctx, { body }) => verifyCode(ctx, body) })

/** `POST auth/refresh` → `authRefreshV1` for the same session. */
export const refreshSessionV1 = defineHandler({ ...endpoints.authRefresh, run: (ctx) => refreshSession(ctx.payload, ctx.user!) })

/** `POST auth/logout` → 204; the token stops working. */
export const endSessionV1 = defineHandler({
  ...endpoints.authLogout,
  run: async (ctx) => {
    await endSession(ctx.payload, ctx.user!)
    return null
  },
})

/** `GET me` → the member's own account. */
export const getMeV1 = defineHandler({ ...endpoints.me, run: async (ctx) => toWireMe(ctx.user!, ctx.locale) })
