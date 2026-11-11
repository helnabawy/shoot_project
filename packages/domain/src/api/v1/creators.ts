import { z } from 'zod'
import { imageV1 } from './common'

/**
 * Creators (data-model.md "Creators"). US1 needs the card for the landing's network section; the
 * directory, profile, specialty and hire shapes join in US3.
 */
export const creatorCardV1 = z.object({
  /** The stored code, opaque: what `creators/{code}` takes. */
  code: z.string(),
  /** With the brand prefix: "SH-0087". */
  displayCode: z.string(),
  name: z.string(),
  initials: z.string(),
  photo: imageV1.nullable(),
  /** "Photographer and videographer", in CMS words. */
  types: z.string(),
  places: z.array(z.string()),
  specialties: z.array(z.string()),
  /** Language names in the answer's language. */
  languages: z.array(z.string()),
  yearsExperience: z.int().nonnegative().nullable(),
  sampleCount: z.int().nonnegative(),
  featured: z.boolean(),
})
export type CreatorCardV1 = z.infer<typeof creatorCardV1>
