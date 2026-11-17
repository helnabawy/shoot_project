import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { problem } from '@/shared/api/problem'
import { env } from '@/shared/lib/env'
import { placeAt } from './place'
import { getMapsProvider } from './providers'

/**
 * Feature 022 (R15, T072): the place step's search and pin for the app, through the server so keys never reach
 * a device. Nothing is stored here; a brief stores its pin when it is sent. Never log a search or a pin (G1).
 */
/** `POST places/autocomplete`: up to five places in the UAE for the text typed. */
export const placeAutocompleteV1 = defineHandler({
  ...endpoints.placeAutocomplete,
  rateLimit: { action: 'place-search', limit: 300 },
  run: async (ctx, { body }) => ({ results: await getMapsProvider(env()).autocomplete(body.q, body.sessionToken, ctx.locale) }),
})

/** `GET places/{placeId}`: where a picked suggestion is, with its area and emirate. */
export const placeDetailsV1 = defineHandler({
  ...endpoints.placeDetails,
  rateLimit: { action: 'place-search', limit: 300 },
  run: async (ctx, { params, query }) => {
    const point = await getMapsProvider(env()).details(params.placeId, query.sessionToken, ctx.locale)
    if (!point) return problem(404, 'api.errors.notFound')
    return placeAt(ctx.payload, point.lat, point.lng, ctx.locale)
  },
})

/** `POST places/reverse`: the area and emirate under a dragged or located pin, or `inside: false`. */
export const placeReverseV1 = defineHandler({
  ...endpoints.placeReverse,
  rateLimit: { action: 'place-search', limit: 300 },
  run: async (ctx, { body }) => placeAt(ctx.payload, body.lat, body.lng, ctx.locale),
})
