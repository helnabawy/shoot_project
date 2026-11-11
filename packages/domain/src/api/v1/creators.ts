import { z } from 'zod'
import { externalLinkV1, imageV1, localeV1, paginationV1 } from './common'

/**
 * Creators (data-model.md "Creators"). US1 needs the card for the landing's network section; the
 * directory, profile and specialty shapes join in US3. The hire page is in `hire.ts`: its sections
 * hold cards, and `landing.ts` imports the card, so it cannot live here without a cycle.
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

/** A filter slug as the website's query string carries it. */
const slugQuery = z.string().min(1).max(100)

/** `GET creators`: the website's directory query; unknown keys are ignored, unknown slugs too. */
export const creatorsRequestV1 = z.object({
  query: z.object({
    type: slugQuery.optional(),
    specialty: slugQuery.optional(),
    place: slugQuery.optional(),
    /** An integer ≥ 1 as a string; past the last page answers the last page. */
    page: z
      .string()
      .regex(/^[1-9]\d{0,5}$/)
      .optional(),
  }),
})

/** `GET creators/{code}`: the code in any spelling ("sh-0087", "CR-0087", "0087"). */
export const creatorProfileRequestV1 = z.object({ params: z.object({ code: z.string().min(1).max(16) }) })

/** `GET work/{specialty}`: the specialty's slug. */
export const specialtyRequestV1 = z.object({ params: z.object({ specialty: z.string().min(1).max(100) }) })

export const filterKeyV1 = z.enum(['type', 'specialty', 'place'])

export const directoryFilterV1 = z.object({
  key: filterKeyV1,
  /** "Professional", "Specialty", "Emirate", in the answer's language. */
  label: z.string(),
  /** Options with creators (counted with the other filters applied), or the chosen one. */
  options: z.array(z.object({ slug: z.string(), name: z.string(), count: z.int().nonnegative(), selected: z.boolean() })),
})

/** The directory: the website's order (featured, then newest), filters with counts, page clamping. */
export const creatorListV1 = z.object({
  locale: localeV1,
  items: z.array(creatorCardV1),
  filters: z.array(directoryFilterV1),
  pagination: paginationV1,
})
export type CreatorListV1 = z.infer<typeof creatorListV1>

/** One piece of work on a profile. `videoUrl` and `provider` are set for videos only. */
export const sampleV1 = z.object({
  id: z.string(),
  kind: z.enum(['image', 'video']),
  /** The grid picture (sizes up to the card size). */
  thumb: imageV1,
  /** The viewer picture (every size). */
  large: imageV1,
  alt: z.string(),
  caption: z.string(),
  /** The specialty's name, or "". */
  specialty: z.string(),
  videoUrl: z
    .string()
    .regex(/^https:\/\/\S+$/)
    .nullable(),
  /** "YouTube", "Vimeo" or the host. */
  provider: z.string().nullable(),
})
export type SampleV1 = z.infer<typeof sampleV1>

/** A public creator's profile (`getCreatorProfile`). Gender is never sent (002 FR-011). */
export const creatorProfileV1 = z.object({
  locale: localeV1,
  code: z.string(),
  displayCode: z.string(),
  name: z.string(),
  initials: z.string(),
  bio: z.string(),
  photo: imageV1.nullable(),
  types: z.string(),
  places: z.array(z.string()),
  specialties: z.array(z.string()),
  languages: z.array(z.string()),
  /** The country name in the answer's language, or `null`. */
  nationality: z.string().nullable(),
  yearsExperience: z.int().nonnegative().nullable(),
  samples: z.array(sampleV1),
  /** `label` is the platform. */
  social: z.array(externalLinkV1),
  /** False when none of the creator's types is in the site's audience. */
  canBook: z.boolean(),
  /** The creator's professional types that the site offers (the booking's allowed types). */
  personaSlugs: z.array(z.string()),
})
export type CreatorProfileV1 = z.infer<typeof creatorProfileV1>

/** `/work/{specialty}`: the editor's text, the real counts, the creators and their samples. */
export const specialtyPageV1 = z.object({
  locale: localeV1,
  category: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
  /** The editor's text; "" when none was written (the app uses its own wording). */
  title: z.string(),
  description: z.string(),
  intro: z.string(),
  counts: z.object({ samples: z.int().nonnegative(), professionals: z.int().nonnegative() }),
  creators: z.array(creatorCardV1),
  samples: z.array(
    z.object({
      id: z.string(),
      /** The stored code: what `creators/{code}` takes. */
      creatorCode: z.string(),
      creatorName: z.string(),
      thumb: imageV1,
      alt: z.string(),
      caption: z.string(),
      kind: z.enum(['image', 'video']),
    }),
  ),
})
export type SpecialtyPageV1 = z.infer<typeof specialtyPageV1>
