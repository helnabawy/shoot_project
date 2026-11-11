import { z } from 'zod'
import { externalLinkV1, imageV1, linkV1, localeV1 } from './common'

/** Site settings the app may know (data-model.md "Site"). Internal settings are never sent (SC-005). */
export const siteV1 = z.object({
  locale: localeV1,
  siteName: z.string(),
  logo: imageV1.nullable(),
  logoDark: imageV1.nullable(),
  whatsapp: z.object({
    /** E.164, or `null` when unset. */
    number: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
    defaultMessage: z.string().nullable(),
    expectedReplyTime: z.string().nullable(),
  }),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/).nullable(),
  contactEmail: z.string().nullable(),
  /** `label` is the platform: `instagram`, `linkedin`, `youtube`, `tiktok`, `x`. */
  social: z.array(externalLinkV1),
  /** The account-type labels with persona placeholders already filled in. */
  labels: z.object({ seeker: z.string().nullable(), provider: z.string().nullable() }),
  creatorCodePrefix: z.string(),
  quickMatchEnabled: z.boolean(),
})
export type SiteV1 = z.infer<typeof siteV1>

export const navigationV1 = z.object({
  locale: localeV1,
  header: z.array(linkV1),
  footerGroups: z.array(z.object({ key: z.string(), label: z.string(), links: z.array(linkV1) })),
  legal: z.array(linkV1),
})
export type NavigationV1 = z.infer<typeof navigationV1>

export const personaV1 = z.object({
  id: z.string(),
  slug: z.string(),
  singular: z.string(),
  plural: z.string(),
  /** A CMS icon choice; the app maps it to its icon set, with a default for an unknown value. */
  glyph: z.string().nullable(),
  description: z.string().nullable(),
})
export type PersonaV1 = z.infer<typeof personaV1>

export const categoryV1 = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  glyph: z.string().nullable(),
  description: z.string().nullable(),
  /** The drawing shown until the specialty has an image (a CMS choice). */
  scene: z.string().nullable(),
  image: imageV1.nullable(),
  personaIds: z.array(z.string()),
})
export type CategoryV1 = z.infer<typeof categoryV1>

/** The active audience in Site Settings order, with the categories it offers. */
export const personasV1 = z.object({ locale: localeV1, personas: z.array(personaV1), categories: z.array(categoryV1) })
export type PersonasV1 = z.infer<typeof personasV1>

export const builderOptionV1 = z.object({
  value: z.string(),
  label: z.string(),
  sentenceLabel: z.string(),
  glyph: z.string().nullable(),
  /** Persona slugs the option applies to; empty means every persona. */
  personaSlugs: z.array(z.string()),
})

export const slotKindV1 = z.enum(['persona', 'options', 'date', 'number'])

export const builderSlotV1 = z.object({
  token: z.string(),
  kind: slotKindV1,
  groupLabel: z.string(),
  placeholder: z.string(),
  defaultValue: z.string(),
  required: z.boolean(),
  allowCustom: z.boolean(),
  multiple: z.boolean(),
  options: z.array(builderOptionV1),
})

export const briefBuilderConfigV1 = z.object({
  sentence: z.string(),
  slots: z.array(builderSlotV1),
  submitLabel: z.string(),
  helperText: z.string(),
  whatsappTemplate: z.string(),
  successMessage: z.string(),
  steps: z.array(z.object({ title: z.string(), description: z.string() })),
})

/** `builder` is `null` when the brief builder is switched off. */
export const briefBuilderV1 = z.object({ locale: localeV1, builder: briefBuilderConfigV1.nullable() })
export type BriefBuilderV1 = z.infer<typeof briefBuilderV1>
