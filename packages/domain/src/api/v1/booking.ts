import { z } from 'zod'
import { BOOKING_STATES } from '../../booking/states'
import { imageV1, localeV1 } from './common'
import { creatorCardV1 } from './creators'

/**
 * Quick Match and booking (feature 012, contracts/booking-api.md). Money is whole fils. Field
 * failures carry message keys. Nothing here carries a phone number, a payment detail or the
 * private key's salt.
 */

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTime = z.iso.datetime()
/** A reference or key as it appears in a link. */
const linkPart = z.string().min(1).max(64)
export const START_TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** A card of step 2: the directory card and up to three pieces of work (a play mark on video). */
export const matchCreatorV1 = creatorCardV1.extend({
  gallery: z.array(z.object({ kind: z.enum(['image', 'video']), thumb: imageV1 })).max(3),
})
export type MatchCreatorV1 = z.infer<typeof matchCreatorV1>

export const matchSectionV1 = z.object({
  persona: z.object({ slug: z.string(), singular: z.string(), plural: z.string() }),
  /** The one fixed price for this type, or `null` when no price rule applies. */
  priceFils: z.int().nonnegative().nullable(),
  /** What the price includes, in CMS words. */
  includes: z.array(z.string()),
  creators: z.array(matchCreatorV1),
})

export const matchV1 = z.object({
  locale: localeV1,
  brief: z.object({
    reference: z.string(),
    sentence: z.string(),
    date: isoDay.nullable(),
    /** A `durations` option value; `null` when the brief has none. */
    duration: z.string().nullable(),
  }),
  /** The day shown: the query's, else the brief's; `null` is "any date". */
  date: isoDay.nullable(),
  priceOnRequest: z.boolean(),
  /** The sum over every type, or `null` when any type has no price. */
  totalFils: z.int().nonnegative().nullable(),
  sections: z.array(matchSectionV1),
  /** Other days with someone free in every type, nearest first, with how many are free. */
  nearby: z.array(z.object({ date: isoDay, free: z.int().nonnegative() })),
})
export type MatchV1 = z.infer<typeof matchV1>

export const matchRequestV1 = z.object({
  params: z.object({ ref: linkPart, key: linkPart }),
  query: z.object({
    date: isoDay.optional(),
    duration: z.string().min(1).max(40).optional(),
  }),
})

export const pickV1 = z.object({
  persona: z.string().min(1).max(100),
  /** `null` is "let us pick". */
  code: z.string().min(1).max(16).nullable(),
})

/** Screen 09's details. Errors are `booking.errors.*` keys. */
export const detailsV1 = z.object({
  date: isoDay,
  startTime: z.string().regex(START_TIME, 'booking.errors.startTime'),
  duration: z.string().min(1).max(40),
  venue: z.string().trim().min(1, 'booking.errors.venue').max(200, 'booking.errors.venue'),
  note: z.string().trim().max(300).optional(),
})
export type DetailsV1 = z.infer<typeof detailsV1>

export const quotationRequestV1 = z.object({
  params: z.object({ ref: linkPart, key: linkPart }),
  body: z.object({ picks: z.array(pickV1).min(1).max(8), details: detailsV1 }),
})

export const quotationIssuedV1 = z.object({
  /** The quotation reference (`Q-…`) and its private key: the app opens `/q/{reference}/{key}`. */
  reference: z.string(),
  key: z.string(),
  state: z.enum(BOOKING_STATES),
  /** The WhatsApp chat with the booking written in; never a bare phone number. */
  whatsappUrl: z.string().regex(/^https:\/\/\S+$/).nullable(),
})
export type QuotationIssuedV1 = z.infer<typeof quotationIssuedV1>

export const quotationAddressV1 = z.object({ params: z.object({ ref: linkPart, key: linkPart }) })

export const reportRequestV1 = z.object({
  params: z.object({ ref: linkPart, key: linkPart }),
  body: z.object({ reason: z.string().trim().min(5, 'booking.errors.reason').max(500, 'booking.errors.reason') }),
})

export const pickAnotherRequestV1 = z.object({
  params: z.object({ ref: linkPart, key: linkPart }),
  body: z.object({ persona: z.string().min(1).max(100), code: z.string().min(1).max(16) }),
})

export const NEXT_STEPS = ['accept', 'waitProfessional', 'chooseAnother', 'pay', 'shootDay', 'confirmDelivery', 'freshQuotation', 'contactTeam', 'none'] as const
export const PROGRESS_KEYS = ['briefSent', 'confirmed', 'paid', 'shootDay', 'delivered', 'completed'] as const

export const bookingViewV1 = z.object({
  locale: localeV1,
  reference: z.string(),
  /** The effective state: a quoted booking past its validity reads `expired`. */
  state: z.enum(BOOKING_STATES),
  nextStep: z.enum(NEXT_STEPS),
  sentence: z.string(),
  issuedAt: isoDateTime,
  validUntil: isoDateTime,
  shootDate: isoDay.nullable(),
  startTime: z.string().nullable(),
  totalFils: z.int().nonnegative(),
  lines: z.array(
    z.object({
      kind: z.enum(['tier', 'travel', 'addon', 'discount', 'adjustment']),
      label: z.string(),
      /** Negative for a discount. */
      amountFils: z.int(),
      includes: z.array(z.string()),
    }),
  ),
  /** One per professional type; `name` is `null` while the team is choosing. */
  professionals: z.array(z.object({ type: z.string(), name: z.string().nullable(), code: z.string().nullable() })),
  progress: z.array(z.object({ key: z.enum(PROGRESS_KEYS), at: isoDateTime.nullable() })),
  canAccept: z.boolean(),
  canConfirmDelivery: z.boolean(),
  canReport: z.boolean(),
  /** Types whose professional declined or did not answer, with others who are free at the same price. */
  replacements: z.array(z.object({ persona: z.object({ slug: z.string(), singular: z.string() }), creators: z.array(creatorCardV1) })),
  holdReason: z.string().nullable(),
  whatsappUrl: z.string().regex(/^https:\/\/\S+$/).nullable(),
})
export type BookingViewV1 = z.infer<typeof bookingViewV1>

export const freshQuotationV1 = z.object({
  briefReference: z.string(),
  briefKey: z.string(),
  picks: z.array(pickV1),
})
export type FreshQuotationV1 = z.infer<typeof freshQuotationV1>
