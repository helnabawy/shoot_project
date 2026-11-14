import { z } from 'zod'
import { BOOKING_STATUSES } from '../../account/status'
import { FINISH_ITEMS } from '../../account/finish'

/**
 * The client account's shapes (feature 013, contracts/account-api.md). Words for statuses and rows are
 * the app's own labels; these carry keys, counts and the person's own data only.
 */

const UAE_MOBILE_E164 = /^\+9715\d{8}$/
const isoDate = z.iso.datetime()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const bookingStatusV1 = z.enum(BOOKING_STATUSES)

export const bookingSummaryV1 = z.object({
  reference: z.string().min(1),
  status: bookingStatusV1,
  /** The occasion's label in the answer's language. */
  occasion: z.string().nullable(),
  /** The emirate or place's label. */
  place: z.string().nullable(),
  /** Shoot day (UAE), YYYY-MM-DD. */
  date: day.nullable(),
  /** "HH:mm" when the brief gave a start time. */
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
  /** The assigned professional's display name. */
  professional: z.string().nullable(),
  /** The total in fils; null until priced. */
  totalFils: z.int().nonnegative().nullable(),
})
export type BookingSummaryV1 = z.infer<typeof bookingSummaryV1>

export const briefStatusV1 = z.enum(['new', 'contacted', 'closed'])

export const briefSummaryV1 = z.object({
  reference: z.string().min(1),
  /** As recorded, in the language it was written in. */
  sentence: z.string(),
  sentAt: isoDate,
  status: briefStatusV1,
  /** The booking this brief led to, when there is one. */
  bookingReference: z.string().nullable(),
  /** 019: how many creators said yes to this brief while it is open. */
  saidYes: z.int().nonnegative().optional(),
})
export type BriefSummaryV1 = z.infer<typeof briefSummaryV1>

export const upNextV1 = z.object({
  kind: z.enum(['quote', 'delivery', 'payment', 'declined']),
  booking: bookingSummaryV1,
})
export type UpNextV1 = z.infer<typeof upNextV1>

export const finishItemV1 = z.object({ key: z.enum(FINISH_ITEMS), done: z.boolean(), value: z.string().nullable() })

export const accountHomeV1 = z.object({
  person: z.object({ name: z.string().nullable(), phone: z.string().regex(UAE_MOBILE_E164).nullable() }),
  upNext: upNextV1.nullable(),
  places: z.object({
    bookings: z.object({ waiting: z.int().nonnegative(), open: z.int().nonnegative() }),
    briefs: z.object({ open: z.int().nonnegative() }),
  }),
  /** The latest five. */
  briefs: z.array(briefSummaryV1).max(5),
  finish: z.object({ items: z.array(finishItemV1), autoOpen: z.boolean() }),
  /** "What your account does" (CMS). */
  about: z.array(z.string()),
})
export type AccountHomeV1 = z.infer<typeof accountHomeV1>

const pageQuery = z.object({
  page: z
    .string()
    .regex(/^[1-9]\d{0,5}$/)
    .optional(),
})

export const accountPageRequestV1 = z.object({ query: pageQuery })

/** Upcoming comes with page 1 only; Past is paged. */
export const bookingListV1 = z.object({
  upcoming: z.array(bookingSummaryV1),
  past: z.array(bookingSummaryV1),
  page: z.int().positive(),
  hasMore: z.boolean(),
})
export type BookingListV1 = z.infer<typeof bookingListV1>

export const briefListV1 = z.object({ items: z.array(briefSummaryV1), page: z.int().positive(), hasMore: z.boolean() })
export type BriefListV1 = z.infer<typeof briefListV1>

/** `PATCH me`: the name, the optional email and the one-time "finish" flag. */
export const meUpdateV1 = z
  .object({
    name: z.string().trim().min(2, 'account.errors.nameLength').max(80, 'account.errors.nameLength').optional(),
    email: z.string().trim().max(254, 'account.errors.emailInvalid').pipe(z.email('account.errors.emailInvalid')).optional(),
    finishShown: z.literal(true).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'api.errors.invalidField' })
export type MeUpdateV1 = z.infer<typeof meUpdateV1>
