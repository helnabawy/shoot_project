import { z } from 'zod'

/**
 * Feature 022 (research R15): the place step's search and pin. The server talks to the maps provider, so
 * keys never reach the app. Answers carry the area and emirate only; nothing is stored until a brief is sent.
 */
export const placeEmirateV1 = z.object({ slug: z.string(), name: z.string() })

export const placeAutocompleteRequestV1 = z.object({
  q: z.string().trim().min(2).max(120),
  /** One per search session, so the provider bills a search and its pick as one. */
  sessionToken: z.string().min(8).max(64),
})

export const placeAutocompleteV1 = z.object({
  results: z.array(z.object({ placeId: z.string(), main: z.string(), secondary: z.string() })).max(5),
})

export const placeParamsV1 = z.object({ placeId: z.string().min(1).max(300) })
export const placeDetailsQueryV1 = z.object({ sessionToken: z.string().min(8).max(64) })

export const placeReverseRequestV1 = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })

/** Where a pin is: the area and emirate when it is inside an emirate served, else `inside: false`. */
export const placeV1 = z.object({
  lat: z.number(),
  lng: z.number(),
  inside: z.boolean(),
  area: z.string().nullable(),
  emirate: placeEmirateV1.nullable(),
})
export type PlaceV1 = z.infer<typeof placeV1>
