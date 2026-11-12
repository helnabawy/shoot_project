import { z } from 'zod'
import { localeV1, richTextV1, sitePathV1 } from './common'
import { creatorCardV1 } from './creators'
import { sectionV1 } from './landing'
import { briefBuilderConfigV1 } from './site'

/**
 * A "hire" intent page (data-model.md "Creators", `hirePageV1`). It lives apart from `creators.ts`
 * because its sections hold creator cards: `landing.ts` imports the card, and this imports both.
 */

/** `GET hire/{slug}`: the page's slug in either language, or an earlier one. */
export const hirePageRequestV1 = z.object({ params: z.object({ slug: z.string().min(1).max(200) }) })

/** At most this many fitting creators are sent; `creatorTotal` counts them all. */
export const HIRE_CREATOR_LIMIT = 6

export const hirePageV1 = z.object({
  locale: localeV1,
  /** The page's current address. When it differs from the request, the app replaces its location. */
  path: sitePathV1,
  title: z.string(),
  intro: z.string().nullable(),
  sections: z.array(sectionV1),
  /** The brief builder, `null` when it is off. */
  builder: briefBuilderConfigV1.nullable(),
  /** The page's preset choices: slot token to option value. */
  preset: z.record(z.string(), z.string()),
  creators: z.array(creatorCardV1).max(HIRE_CREATOR_LIMIT),
  creatorTotal: z.int().nonnegative(),
  faq: z.array(z.object({ question: z.string(), answer: richTextV1 })),
})
export type HirePageV1 = z.infer<typeof hirePageV1>
