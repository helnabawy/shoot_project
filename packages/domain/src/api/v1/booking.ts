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
  /** 019: this creator already said yes to the brief; listed first. */
  saidYes: z.boolean().optional(),
})

/** 022: one creator's offer for one type, as the client sees it (FR-013). */
export const matchOfferV1 = z.object({
  creator: matchCreatorV1,
  amountFils: z.int().positive(),
  feeFils: z.int().nonnegative(),
  totalFils: z.int().positive(),
  /** The creator accepted the client's own price. */
  atYourPrice: z.boolean(),
  answeredAt: isoDateTime,
})
export type MatchOfferV1 = z.infer<typeof matchOfferV1>
export type MatchCreatorV1 = z.infer<typeof matchCreatorV1>

export const matchSectionV1 = z.object({
  persona: z.object({ slug: z.string(), singular: z.string(), plural: z.string() }),
  /** The one fixed price for this type, or `null` when no price rule applies. */
  priceFils: z.int().nonnegative().nullable(),
  /** What the price includes, in CMS words. */
  includes: z.array(z.string()),
  creators: z.array(matchCreatorV1),
  /** 022 (additive): the client's price for this type. */
  budgetFils: z.int().positive().optional(),
  /** 022 (additive): current offers, lowest total first. */
  offers: z.array(matchOfferV1).optional(),
  /** 022 (additive), no longer sent since 2026-11-18 (FR-016c): step 2 does not list unanswered creators. Kept because v1 changes are additive only. */
  waiting: z.array(matchCreatorV1).max(8).optional(),
})

export const matchV1 = z.object({
  locale: localeV1,
  brief: z.object({
    reference: z.string(),
    sentence: z.string(),
    date: isoDay.nullable(),
    /** The `durations` option value priced: the query's, else the brief's; `null` when there is none. */
    duration: z.string().nullable(),
    /** 026 (additive): the start time the client chose with the brief (`HH:MM`); missing or `null` when none. */
    startTime: z.string().regex(START_TIME).nullable().optional(),
  }),
  /** The day shown: the query's, else the brief's; `null` is "any date". */
  date: isoDay.nullable(),
  priceOnRequest: z.boolean(),
  /** The `durations` option set, in the answer's language: what screen 09 offers (CMS data). */
  durations: z.array(z.object({ value: z.string(), label: z.string() })),
  /** The sum over every type, or `null` when any type has no price. */
  totalFils: z.int().nonnegative().nullable(),
  sections: z.array(matchSectionV1),
  /** Other days with someone free in every type, nearest first, with how many are free. */
  nearby: z.array(z.object({ date: isoDay, free: z.int().nonnegative() })),
  /** The business WhatsApp chat with the brief written in: for "price on request" and "Ask on WhatsApp". */
  whatsappUrl: z.string().regex(/^https:\/\/\S+$/).nullable(),
  /** 022 (additive): `offers` when the brief was sent with "Creators offer prices" on. */
  mode: z.enum(['fixed', 'offers']).optional(),
  /** 022 (additive): how many creators the brief went to. */
  sentTo: z.int().nonnegative().optional(),
  /** 022 (FR-012a): the brief's date passed or its window ended; no offers, send a new brief. */
  closed: z.boolean().optional(),
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
  body: z.object({
    picks: z.array(pickV1).min(1).max(8),
    details: detailsV1,
    /** 022 (additive): the offer amounts the client saw; a moved one is `offers.errors.amountChanged`. */
    expect: z.array(z.object({ persona: z.string().min(1).max(100), amountFils: z.int().positive() })).max(8).optional(),
  }),
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

/**
 * Feature 025: the other side of a paid booking (until delivered), sent only to the booking's signed-in client (its booked
 * creators) or to a creator whose own part is confirmed (the client). `phone` is the verified number in E.164.
 */
export const bookingContactV1 = z.object({
  name: z.string(),
  /** The professional type for a creator; empty for the client. */
  role: z.string(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  /** The WhatsApp chat with that person, a first line naming the booking written in. */
  whatsappUrl: z.string().regex(/^https:\/\/\S+$/),
})
export type BookingContactV1 = z.infer<typeof bookingContactV1>

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
      kind: z.enum(['tier', 'travel', 'addon', 'discount', 'adjustment', 'offer', 'fee']),
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
  /** Feature 020: "Pay {total}" online (confirmed, a total above zero, the current quotation, payment on). */
  canPayOnline: z.boolean(),
  /** Types whose professional declined or did not answer, with others who are free at the same price. */
  replacements: z.array(z.object({ persona: z.object({ slug: z.string(), singular: z.string() }), creators: z.array(creatorCardV1) })),
  holdReason: z.string().nullable(),
  whatsappUrl: z.string().regex(/^https:\/\/\S+$/).nullable(),
  /** 025 (additive): the booked creators' contact, only for the booking's signed-in client in a sharing state. */
  contacts: z.array(bookingContactV1).max(8).optional(),
  /** 025 (additive): the booking's private key, only for its signed-in client (the app opens `/q/{reference}/{key}`). */
  key: z.string().min(1).max(64).optional(),
})
export type BookingViewV1 = z.infer<typeof bookingViewV1>

/** Feature 020: where the provider's secure payment page is (`POST quotations/{ref}/{key}/pay`). */
export const checkoutV1 = z.object({ url: z.string().regex(/^https:\/\/\S+$/) })
export type CheckoutV1 = z.infer<typeof checkoutV1>

export const freshQuotationV1 = z.object({
  briefReference: z.string(),
  briefKey: z.string(),
  picks: z.array(pickV1),
})
export type FreshQuotationV1 = z.infer<typeof freshQuotationV1>

/** 022: the client declines one offer (authorised by the brief's private key). */
export const offerDeclineRequestV1 = z.object({
  params: z.object({ ref: linkPart, key: linkPart }),
  body: z.object({ persona: z.string().min(1).max(100), creator: z.string().min(1).max(16) }),
})

/** 022: a short fingerprint of a live list; a different value means "reload" (research R9). */
export const stampV1 = z.object({ stamp: z.string().min(1).max(32) })
export type StampV1 = z.infer<typeof stampV1>
