import { z } from 'zod'
import { imageV1, localeV1, richTextV1, sitePathV1 } from './common'
import { creatorCardV1 } from './creators'
import { categoryV1, personaV1 } from './site'

/**
 * A resolved call to action: a site `path` (no language prefix) or an absolute `url` (the WhatsApp
 * link, `tel:`, a web address), exactly one of them. `kind` lets the app pick the icon.
 */
export const ctaV1 = z
  .object({
    label: z.string(),
    kind: z.enum(['whatsapp', 'link', 'call']),
    path: sitePathV1.nullable(),
    url: z.string().regex(/^(https?:\/\/|tel:|mailto:)\S+$/).nullable(),
  })
  .refine((c) => (c.path === null) !== (c.url === null), { message: 'a call to action has a path or a url' })
export type CtaV1 = z.infer<typeof ctaV1>

export const heroV1 = z.object({
  eyebrow: z.string().nullable(),
  headline: z.string(),
  subheadline: z.string().nullable(),
  trustChips: z.array(z.string()),
  layout: z.enum(['briefBuilder', 'ctas']),
  primaryCta: ctaV1.nullable(),
  secondaryCta: ctaV1.nullable(),
  image: imageV1.nullable(),
  imageMobile: imageV1.nullable(),
  overlay: imageV1.nullable(),
  /** 0–100, or `null` when unset. */
  overlayOpacity: z.number().min(0).max(100).nullable(),
})
export type HeroV1 = z.infer<typeof heroV1>

const anchor = z.string().nullable()
const faqItemV1 = z.object({ question: z.string(), answer: richTextV1 })

/**
 * One landing (or editor page) section, resolved as the website renders it: tiles carry their
 * counts, the network its creators. A new `type` is an additive value; the app shows nothing for an
 * unknown one.
 */
export const sectionV1 = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('howItWorks'),
    anchor,
    heading: z.string(),
    subheading: z.string().nullable(),
    steps: z.array(z.object({ title: z.string(), body: z.string().nullable(), visual: z.enum(['none', 'brief', 'match', 'work']) })),
    cta: ctaV1.nullable(),
  }),
  z.object({
    type: z.literal('features'),
    anchor,
    heading: z.string(),
    subheading: z.string().nullable(),
    items: z.array(
      z.object({
        title: z.string(),
        body: z.string().nullable(),
        glyph: z.string().nullable(),
        pointsAt: z.enum(['none', 'sentence', 'language', 'send', 'whatsapp']),
      }),
    ),
  }),
  z.object({
    type: z.literal('categoriesGrid'),
    anchor,
    heading: z.string(),
    subheading: z.string().nullable(),
    tiles: z.array(
      z.object({
        category: categoryV1,
        counts: z.object({ samples: z.int().nonnegative(), professionals: z.int().nonnegative() }),
        /** False for a hand-picked specialty outside the audience: it has no `/work/{slug}` page. */
        hasPage: z.boolean(),
      }),
    ),
    cta: ctaV1.nullable(),
  }),
  z.object({
    type: z.literal('personaBand'),
    anchor,
    heading: z.string(),
    body: z.string().nullable(),
    layout: z.enum(['combined', 'perPersona']),
    personas: z.array(personaV1),
    cta: ctaV1.nullable(),
  }),
  z.object({ type: z.literal('faq'), anchor, heading: z.string(), items: z.array(faqItemV1) }),
  z.object({
    type: z.literal('logoCloud'),
    anchor,
    heading: z.string(),
    logos: z.array(z.object({ name: z.string(), image: imageV1, imageDark: imageV1.nullable() })),
  }),
  z.object({ type: z.literal('richText'), anchor, content: richTextV1 }),
  z.object({
    type: z.literal('callToAction'),
    anchor,
    heading: z.string(),
    body: z.string().nullable(),
    primary: ctaV1.nullable(),
    secondary: ctaV1.nullable(),
  }),
  z.object({
    type: z.literal('creatorNetwork'),
    anchor,
    heading: z.string(),
    subheading: z.string().nullable(),
    creators: z.array(creatorCardV1),
    cta: ctaV1.nullable(),
  }),
])
export type SectionV1 = z.infer<typeof sectionV1>
export const SECTION_TYPES = ['howItWorks', 'features', 'categoriesGrid', 'personaBand', 'faq', 'logoCloud', 'richText', 'callToAction', 'creatorNetwork'] as const

export const landingV1 = z.object({
  locale: localeV1,
  hero: heroV1,
  /** In-page anchors: `target` is a section's `anchor`. */
  navigation: z.array(z.object({ label: z.string(), target: z.string() })),
  sections: z.array(sectionV1),
})
export type LandingV1 = z.infer<typeof landingV1>
