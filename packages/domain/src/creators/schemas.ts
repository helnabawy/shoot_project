import { z } from 'zod'
import { isSpokenLanguage } from './languages'
import { isAllowedSocialUrl, SOCIAL_PLATFORMS, type SocialPlatform } from './links'
import { isAllowedVideoUrl } from './samples'

// Error messages are translation keys (FR-039); forms resolve them with next-intl.
export const PROFILE_LIMITS = { name: { min: 2, max: 60 }, bio: 600, caption: 140, personas: 4, specialties: 12, cities: 12, social: 6 } as const

const distinct = (list: readonly string[]) => new Set(list).size === list.length

const optionalText = (max: number, key: string) => z.string().trim().max(max, key).optional().default('')

/** A list of ids from checkboxes: distinct and within a limit. */
const ids = (max: number, tooMany: string) =>
  z.array(z.string().trim().min(1)).max(max, tooMany).refine(distinct, 'creators.errors.duplicate').optional().default([])

const profileSchema = z.object({
  displayName_en: z.string().trim().min(PROFILE_LIMITS.name.min, 'creators.errors.nameLength').max(PROFILE_LIMITS.name.max, 'creators.errors.nameLength'),
  displayName_ar: optionalText(PROFILE_LIMITS.name.max, 'creators.errors.nameLength'),
  bio_en: optionalText(PROFILE_LIMITS.bio, 'creators.errors.bioLength'),
  bio_ar: optionalText(PROFILE_LIMITS.bio, 'creators.errors.bioLength'),
  personas: z
    .array(z.string().trim().min(1))
    .min(1, 'creators.errors.personasRange')
    .max(PROFILE_LIMITS.personas, 'creators.errors.personasRange')
    .refine(distinct, 'creators.errors.duplicate'),
  specialties: ids(PROFILE_LIMITS.specialties, 'creators.errors.tooMany'),
  cities: ids(PROFILE_LIMITS.cities, 'creators.errors.tooMany'),
  languages: z
    .array(z.string())
    .refine((list) => list.every(isSpokenLanguage), 'creators.errors.languageInvalid')
    .refine(distinct, 'creators.errors.duplicate')
    .optional()
    .default([]),
  social: z
    .array(z.object({ platform: z.enum(SOCIAL_PLATFORMS, { message: 'creators.errors.socialPlatform' }), url: z.string().trim() }))
    .max(PROFILE_LIMITS.social, 'creators.errors.tooMany')
    .optional()
    .default([])
    .superRefine((rows, ctx) => {
      rows.forEach((row, i) => {
        if (!isAllowedSocialUrl(row.platform as SocialPlatform, row.url)) {
          ctx.addIssue({ code: 'custom', path: [i, 'url'], message: 'creators.errors.socialInvalid' })
        }
      })
    }),
})

export interface ProfileInput {
  displayName: { en: string; ar: string }
  bio: { en: string; ar: string }
  personas: string[]
  specialties: string[]
  cities: string[]
  languages: string[]
  social: { platform: string; url: string }[]
}

export type FieldErrors = Record<string, string[]>

/** Zod issue paths as the form's field names: `displayName_en`, `social.0.url`. */
function collect(issues: readonly { path: readonly PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const field = issue.path.map(String).join('.')
    ;(errors[field] ??= []).push(issue.message)
  }
  return errors
}

/** Validates the "My profile" form (CP-US3-S1). Input is the form read into plain values. */
export function parseProfileForm(raw: unknown): { ok: true; data: ProfileInput } | { ok: false; errors: FieldErrors } {
  const result = profileSchema.safeParse(raw)
  if (!result.success) return { ok: false, errors: collect(result.error.issues) }
  const d = result.data
  return {
    ok: true,
    data: {
      displayName: { en: d.displayName_en, ar: d.displayName_ar },
      bio: { en: d.bio_en, ar: d.bio_ar },
      personas: d.personas,
      specialties: d.specialties,
      cities: d.cities,
      languages: d.languages,
      social: d.social,
    },
  }
}

const sampleSchema = z
  .object({
    kind: z.enum(['image', 'video'], { message: 'creators.errors.sampleKind' }),
    videoUrl: z.string().trim().optional(),
    caption_en: optionalText(PROFILE_LIMITS.caption, 'creators.errors.captionLength'),
    caption_ar: optionalText(PROFILE_LIMITS.caption, 'creators.errors.captionLength'),
    category: z.string().trim().optional(),
  })
  .superRefine((sample, ctx) => {
    if (sample.kind === 'video' && !isAllowedVideoUrl(sample.videoUrl ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['videoUrl'], message: 'creators.errors.videoHost' })
    }
  })

export interface SampleInput {
  kind: 'image' | 'video'
  videoUrl: string | undefined
  caption: { en: string; ar: string }
  category: string | undefined
}

/** Validates one portfolio sample's text fields; the files themselves are checked where they are uploaded. */
export function parseSampleForm(raw: unknown): { ok: true; data: SampleInput } | { ok: false; errors: FieldErrors } {
  const result = sampleSchema.safeParse(raw)
  if (!result.success) return { ok: false, errors: collect(result.error.issues) }
  const d = result.data
  return {
    ok: true,
    data: {
      kind: d.kind,
      // A link only means something on a video sample.
      videoUrl: d.kind === 'video' ? d.videoUrl : undefined,
      caption: { en: d.caption_en, ar: d.caption_ar },
      category: d.category || undefined,
    },
  }
}

export type ReviewField = 'displayName' | 'personas' | 'specialties' | 'cities' | 'languages'

/**
 * What a profile still needs before it can be sent for review, in form order. Samples are not required:
 * they gate featuring, not review (CP-US3-S1).
 */
export function missingForReview(profile: {
  displayName: string
  personas: readonly unknown[]
  specialties: readonly unknown[]
  cities: readonly unknown[]
  languages: readonly unknown[]
}): ReviewField[] {
  const missing: ReviewField[] = []
  if (!profile.displayName.trim()) missing.push('displayName')
  if (profile.personas.length === 0) missing.push('personas')
  if (profile.specialties.length === 0) missing.push('specialties')
  if (profile.cities.length === 0) missing.push('cities')
  if (profile.languages.length === 0) missing.push('languages')
  return missing
}

const inRange = (list: readonly unknown[], index: number) => Number.isInteger(index) && index >= 0 && index < list.length

/** Moves the item at `index` one place; a move off either end changes nothing. */
export function moveItem<T>(list: readonly T[], index: number, direction: 'up' | 'down'): T[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (!inRange(list, index) || !inRange(list, target)) return [...list]
  const next = [...list]
  ;[next[index], next[target]] = [next[target] as T, next[index] as T]
  return next
}

export function removeItem<T>(list: readonly T[], index: number): T[] {
  return inRange(list, index) ? list.filter((_, i) => i !== index) : [...list]
}

export function replaceItem<T>(list: readonly T[], index: number, item: T): T[] {
  return inRange(list, index) ? list.map((existing, i) => (i === index ? item : existing)) : [...list]
}
