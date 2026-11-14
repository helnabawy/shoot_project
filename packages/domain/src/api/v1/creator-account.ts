import { z } from 'zod'
import { IDENTITY_DOCUMENTS, MAX_IDENTITY_BYTES, PROFILE_STEPS, SOCIAL_PLATFORMS } from '../../creators'
import { imageV1 } from './common'
import { briefsSummaryV1 } from './inbox'

/**
 * The creator's own account (feature 014, contracts/mobile-api.md): the profile editor, availability
 * and booking requests. Only the signed-in creator reads or writes these; no client phone number, no
 * identity file and nobody else's gender ever appears. Words are never sent: the app builds step state
 * lines and update sentences from the codes here (`required: ['gender']`, `event: 'accepted'`).
 */

const isoDate = z.iso.datetime()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const id = z.string().min(1)

export const profileStatusV1 = z.enum(['draft', 'in-review', 'live', 'live-with-changes', 'paused', 'suspended'])
export const stepKeyV1 = z.enum(PROFILE_STEPS)
export const stepStateV1 = z.enum(['needs', 'recommended', 'done'])
export const identityKindV1 = z.enum(IDENTITY_DOCUMENTS)
export const identityStateV1 = z.enum(['missing', 'pending', 'verified', 'rejected'])

const textPairV1 = z.object({ en: z.string(), ar: z.string() })

export const profileStepV1 = z.object({
  key: stepKeyV1,
  number: z.int().min(1).max(PROFILE_STEPS.length),
  state: stepStateV1,
  /** Review fields still missing in this step (`gender`, `languages`, `emiratesId` …). */
  required: z.array(z.string()),
  /** Strength items still missing in this step (`bio`, `photo`, `sample` …). */
  recommended: z.array(z.string()),
})

export const identityDocumentV1 = z.object({ state: identityStateV1, uploadedAt: isoDate.nullable(), note: z.string() })

export const mySampleV1 = z.object({
  id: z.string(),
  kind: z.enum(['image', 'video']),
  image: imageV1.nullable(),
  videoUrl: z.string(),
  caption: textPairV1,
  specialty: id.nullable(),
})

const option = z.object({ id, name: z.string() })

export const profileOptionsV1 = z.object({
  professions: z.array(option),
  specialties: z.array(option.extend({ professionIds: z.array(id) })),
  emirates: z.array(option),
  languages: z.array(z.object({ code: z.string(), name: z.string() })),
  countries: z.array(z.object({ code: z.string(), name: z.string() })),
})

export const profileFieldsV1 = z.object({
  displayName: textPairV1,
  bio: textPairV1,
  /** Never shown publicly. */
  gender: z.enum(['woman', 'man']).nullable(),
  nationality: z.string().nullable(),
  yearsExperience: z.int().nullable(),
  professions: z.array(id),
  specialties: z.array(id),
  emirates: z.array(id),
  languages: z.array(z.string()),
  social: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: z.string() })),
})

export const myProfileV1 = z.object({
  code: z.string(),
  status: profileStatusV1,
  submittedAt: isoDate.nullable(),
  /** The team's note, empty when none. */
  reviewNote: z.string(),
  /** 0 to 100 (14 equal parts). */
  strength: z.int().min(0).max(100),
  /** Nothing required is missing. */
  canSubmit: z.boolean(),
  /** Saved changes not yet public on a live profile. */
  hasPendingChanges: z.boolean(),
  fields: profileFieldsV1,
  photo: imageV1.nullable(),
  samples: z.array(mySampleV1),
  identity: z.object({ 'emirates-id': identityDocumentV1, 'trade-license': identityDocumentV1 }),
  steps: z.array(profileStepV1).length(PROFILE_STEPS.length),
  options: profileOptionsV1,
  limits: z.object({ samples: z.int().positive(), identityBytes: z.int().positive() }),
})
export type MyProfileV1 = z.infer<typeof myProfileV1>

/** Any subset of the editable fields: the step being left. Both languages travel together. */
export const profilePatchV1 = z
  .object({
    displayName: textPairV1,
    bio: textPairV1,
    gender: z.enum(['woman', 'man']),
    nationality: z.string().nullable(),
    yearsExperience: z.int().min(0).max(60).nullable(),
    professions: z.array(id),
    specialties: z.array(id),
    emirates: z.array(id),
    languages: z.array(z.string()),
    social: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: z.string() })),
  })
  .partial()
export type ProfilePatchV1 = z.infer<typeof profilePatchV1>

/** A file as base64 in JSON (the handler reads JSON only); the decoded size is checked by the command. */
export const uploadV1 = z.object({
  contentType: z.string().min(1).max(100),
  filename: z.string().max(200),
  data: z.string().min(1).max(Math.ceil((MAX_IDENTITY_BYTES * 4) / 3) + 8),
})
export type UploadV1 = z.infer<typeof uploadV1>

export const sampleAddV1 = z.object({
  kind: z.enum(['image', 'video']),
  videoUrl: z.string().max(500).optional(),
  caption: textPairV1.optional(),
  specialty: id.nullable().optional(),
  /** The image, or the video's poster. */
  file: uploadV1,
})

export const visibilityV1 = z.object({ hidden: z.boolean() })

export const needV1 = z.object({ step: stepKeyV1, required: z.array(z.string()), recommended: z.array(z.string()) })

export const bookingRequestV1 = z.object({
  ref: z.string(),
  quotation: z.string().nullable(),
  /** The client's brief sentence (what, where, how long). */
  occasion: z.string(),
  emirate: z.string(),
  date: day,
  profession: z.string(),
  /** First name only. */
  client: z.string(),
  respondBy: isoDate.nullable(),
  state: z.string(),
  answer: z.enum(['pending', 'confirmed', 'declined', 'lapsed']),
  canDeliver: z.boolean(),
  paid: z.boolean(),
})
export type BookingRequestV1 = z.infer<typeof bookingRequestV1>

export const updateV1 = z.object({ id, event: z.string(), ref: z.string().nullable(), createdAt: isoDate, read: z.boolean() })

export const creatorBookingsV1 = z.object({
  updates: z.array(updateV1),
  waiting: z.array(bookingRequestV1),
  upcoming: z.array(bookingRequestV1),
  done: z.array(bookingRequestV1),
})
export type CreatorBookingsV1 = z.infer<typeof creatorBookingsV1>

export const creatorAccountV1 = z.object({
  name: z.string(),
  code: z.string().nullable(),
  /** Profession names in the request language. */
  professions: z.array(z.string()),
  status: profileStatusV1,
  strength: z.int().min(0).max(100),
  needs: z.array(needV1),
  /** The request with the nearest deadline, if any. */
  waiting: bookingRequestV1.nullable(),
  /** A booking whose shoot day passed and that can be marked delivered. */
  deliverable: bookingRequestV1.nullable(),
  counts: z.object({ waiting: z.int().nonnegative(), upcoming: z.int().nonnegative(), blockedDays: z.int().nonnegative() }),
  /** 019: open briefs that match the creator; absent while the profile is not live. */
  briefs: briefsSummaryV1.optional(),
})
export type CreatorAccountV1 = z.infer<typeof creatorAccountV1>

export const availabilityV1 = z.object({
  /** Today in the business time zone. */
  today: day,
  windowDays: z.int().positive(),
  /** Only the days that are not free. */
  days: z.array(z.object({ date: day, state: z.enum(['blocked', 'booked']) })),
  blockedCount: z.int().nonnegative(),
})
export type AvailabilityV1 = z.infer<typeof availabilityV1>

export const answerV1 = z.object({ decision: z.enum(['confirm', 'decline']), reason: z.string().max(200).optional() })
export const availabilitySetV1 = z.object({ blocked: z.boolean() })

export const creatorKindParamV1 = z.object({ kind: identityKindV1 })
export const creatorDateParamV1 = z.object({ date: day })
export const creatorRefParamV1 = z.object({ ref: z.string().min(1) })
export const creatorIdParamV1 = z.object({ id: z.string().min(1) })
export const creatorIndexParamV1 = z.object({ index: z.string().regex(/^\d{1,3}$/) })
