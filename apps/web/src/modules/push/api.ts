import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { problem } from '@/shared/api/problem'

/** App push registration and the member's switch on `/api/mobile/v1/me/push…` (feature 019, FR-016, FR-017). */

const signedOut = () => problem(401, 'api.errors.unauthorized')

/** Registers this installation for the caller; a token another member registered moves to the caller (shared phone). */
export const registerPushDeviceV1 = defineHandler({
  ...endpoints.registerPushDevice,
  run: async (ctx, { body }) => {
    if (!ctx.user) return signedOut()
    const { payload } = ctx
    const data = { user: ctx.user.id, token: body.token, platform: body.platform, locale: body.locale, lastSeenAt: ctx.now().toISOString() }
    const existing = (await payload.find({ collection: 'push-devices', where: { token: { equals: body.token } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
    if (existing) await payload.update({ collection: 'push-devices', id: existing.id, data, overrideAccess: true })
    else {
      try {
        await payload.create({ collection: 'push-devices', data, overrideAccess: true })
      } catch (error) {
        // Registered twice at once: the unique token row exists now.
        if ((error as Error).name !== 'ValidationError') throw error
        await payload.update({ collection: 'push-devices', where: { token: { equals: body.token } }, data, overrideAccess: true })
      }
    }
    return null
  },
})

/** Sign-out removes the device; unknown tokens are fine (sign-out must not fail). Only the caller's own device. */
export const removePushDeviceV1 = defineHandler({
  ...endpoints.removePushDevice,
  run: async (ctx, { params }) => {
    if (!ctx.user) return signedOut()
    await ctx.payload.delete({ collection: 'push-devices', where: { and: [{ token: { equals: params.token } }, { user: { equals: ctx.user.id } }] }, overrideAccess: true })
    return null
  },
})

export const getPushPreferenceV1 = defineHandler({
  ...endpoints.pushPreference,
  run: async (ctx) => (ctx.user ? { enabled: ctx.user.pushEnabled !== false } : signedOut()),
})

export const setPushPreferenceV1 = defineHandler({
  ...endpoints.setPushPreference,
  run: async (ctx, { body }) => {
    if (!ctx.user) return signedOut()
    await ctx.payload.update({ collection: 'users', id: ctx.user.id, data: { pushEnabled: body.enabled }, overrideAccess: true, context: { pushPreference: true } })
    return { enabled: body.enabled }
  },
})
