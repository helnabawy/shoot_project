import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { readMyCreatorProfile } from '@/modules/creators'
import { defineHandler } from '@/shared/api/handler'
import { isProblem } from '@/shared/api/problem'
import { answerRequest, creatorAccount, creatorAvailability, creatorBookings, markDelivered, markUpdateRead, setAvailability } from './commands/creator'

/** The creator's account, bookings and availability on `/api/mobile/v1/me/creator/…` (feature 014). */

export const getCreatorAccountV1 = defineHandler({
  ...endpoints.creatorAccount,
  run: async (ctx) => {
    const profile = await readMyCreatorProfile(ctx)
    return isProblem(profile) ? profile : creatorAccount(ctx, profile)
  },
})
export const getCreatorBookingsV1 = defineHandler({ ...endpoints.creatorBookings, run: (ctx) => creatorBookings(ctx) })
export const answerCreatorBookingV1 = defineHandler({ ...endpoints.creatorBookingAnswer, run: (ctx, { params, body }) => answerRequest(ctx, params.ref, body) })
export const deliverCreatorBookingV1 = defineHandler({ ...endpoints.creatorBookingDeliver, run: (ctx, { params }) => markDelivered(ctx, params.ref) })
export const readCreatorUpdateV1 = defineHandler({ ...endpoints.creatorUpdateRead, run: (ctx, { params }) => markUpdateRead(ctx, params.id) })
export const getCreatorAvailabilityV1 = defineHandler({ ...endpoints.creatorAvailability, run: (ctx) => creatorAvailability(ctx) })
export const setCreatorAvailabilityV1 = defineHandler({ ...endpoints.creatorAvailabilitySet, run: (ctx, { params, body }) => setAvailability(ctx, params.date, body.blocked) })
