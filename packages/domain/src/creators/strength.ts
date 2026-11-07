import type { ReviewField } from './schemas'

/** The profile editor's steps, in page order (CP-FR-015, CP-FR-016). */
export const PROFILE_STEPS = ['basics', 'about', 'places', 'links', 'samples', 'calendar', 'identity'] as const
export type ProfileStep = (typeof PROFILE_STEPS)[number]
/** Each step's number, for its tab and its section heading. */
export const STEP_NUMBER = Object.fromEntries(PROFILE_STEPS.map((s, i) => [s, i + 1])) as Record<ProfileStep, number>

/** Parts that are not required for review but make a profile stronger. */
export const STRENGTH_ITEMS = ['photo', 'bio', 'nationality', 'yearsExperience', 'link', 'sample'] as const
export type StrengthItem = (typeof STRENGTH_ITEMS)[number]

const REQUIRED_STEP: Record<ReviewField, ProfileStep> = {
  displayName: 'basics',
  gender: 'about',
  personas: 'places',
  specialties: 'places',
  cities: 'places',
  languages: 'places',
  emiratesId: 'identity',
  tradeLicense: 'identity',
}
const RECOMMENDED_STEP: Record<StrengthItem, ProfileStep> = {
  photo: 'basics',
  bio: 'basics',
  nationality: 'about',
  yearsExperience: 'about',
  link: 'links',
  sample: 'samples',
}
const TOTAL = Object.keys(REQUIRED_STEP).length + STRENGTH_ITEMS.length

export interface StepStanding {
  /** Required for review and missing (in `missingForReview` order). */
  required: ReviewField[]
  /** Recommended and missing. */
  recommended: StrengthItem[]
}

/**
 * CP-FR-016 (owner amendment 2026-11-08): how complete a profile is, as one honest number. Each of the
 * 14 parts (the 8 required for review and 6 recommended) counts the same; the calendar is never a part,
 * because a free calendar is not a missing one. Also says, per step, what is still missing.
 */
export function profileStrength(input: { missing: readonly ReviewField[]; has: Record<StrengthItem, boolean> }): {
  percent: number
  steps: Record<ProfileStep, StepStanding>
} {
  const recommended = STRENGTH_ITEMS.filter((item) => !input.has[item])
  const done = TOTAL - input.missing.length - recommended.length
  const steps = Object.fromEntries(
    PROFILE_STEPS.map((step) => [
      step,
      { required: input.missing.filter((f) => REQUIRED_STEP[f] === step), recommended: recommended.filter((i) => RECOMMENDED_STEP[i] === step) },
    ]),
  ) as Record<ProfileStep, StepStanding>
  return { percent: Math.round((done / TOTAL) * 100), steps }
}

const FIELD_STEP: [RegExp, ProfileStep][] = [
  [/^(displayName|bio)(_|$)|^photo$/, 'basics'],
  [/^(gender|nationality|yearsExperience)$/, 'about'],
  [/^(personas|specialties|cities|languages)$/, 'places'],
  [/^social\./, 'links'],
  [/^(sample\.|image$|poster$|videoUrl$|caption|category$|kind$)/, 'samples'],
  [/^(date|toggle)$/, 'calendar'],
  [/^(emiratesId|tradeLicense|emirates-id|trade-license|document)$/, 'identity'],
]

/** The step a form field (or the field name of an error) belongs to; null when it is none of them. */
export function stepOfField(field: string): ProfileStep | null {
  return FIELD_STEP.find(([pattern]) => pattern.test(field))?.[1] ?? null
}
