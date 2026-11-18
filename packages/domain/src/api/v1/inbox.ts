import { z } from 'zod'

/** Feature 019: the creator brief inbox (specs/019-creator-brief-inbox/contracts/mobile-api.md). */

const isoDate = z.iso.datetime()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Where an answered brief stands now, as the creator may know it (never another creator's name). */
export const briefOutcomeV1 = z.enum(['open', 'other-creator', 'booked-you', 'closed'])

/** One brief as a creator sees it: what, where and when, never who the client is (FR-004). */
export const briefItemV1 = z.object({
  ref: z.string().min(1),
  /** The professional type this item is for (a brief for two types is two items). */
  persona: z.string().min(1),
  /** Content words, in the request language. */
  profession: z.string(),
  occasion: z.string(),
  /** The client's brief sentence, as recorded. */
  sentence: z.string(),
  emirate: z.string(),
  /** `null`: the date is to be agreed. */
  date: day.nullable(),
  /** Additive: how long the shoot is, the duration option's label in the request language ("2 hours"). */
  duration: z.string().optional(),
  sentAt: isoDate,
  answer: z.enum(['accepted', 'rejected']).nullable(),
  /** The rejection reason's value, when rejected with one. */
  reason: z.string().nullable(),
  outcome: briefOutcomeV1,
  /** 022 (additive): the client's price for this type, whole fils. */
  budgetFils: z.int().positive().optional(),
  /** 022 (additive): the prices this creator may offer. */
  range: z.object({ minFils: z.int().positive(), maxFils: z.int().positive().nullable() }).optional(),
  /** 022 (additive): this creator's current offer. */
  offerFils: z.int().positive().nullable().optional(),
  /** 022 (additive): price changes left (of 3). */
  revisionsLeft: z.int().min(0).max(3).optional(),
  /** 022 (additive): the client declined this creator's offer (final). */
  declined: z.boolean().optional(),
  /** 022 (additive): the place as a creator may see it before booking: never the pin or the address. */
  place: z
    .object({
      area: z.string(),
      emirate: z.string(),
      mapUrl: z.string().nullable(),
      distanceKm: z.int().nonnegative().nullable(),
      /** Additive: the area's public point (the centre of its 0.02° cell, as the static map shows), to open in a maps app. Never the pin. */
      point: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().optional(),
    })
    .optional(),
})
export type BriefItemV1 = z.infer<typeof briefItemV1>

export const rejectReasonV1 = z.object({ value: z.string().min(1), label: z.string() })

export const creatorBriefsV1 = z.object({
  open: z.array(briefItemV1),
  accepted: z.array(briefItemV1),
  rejected: z.array(briefItemV1),
  /** From the content area, in order. */
  reasons: z.array(rejectReasonV1),
})
export type CreatorBriefsV1 = z.infer<typeof creatorBriefsV1>

export const briefAnswerRequestV1 = z
  .object({
    persona: z.string().min(1),
    decision: z.enum(['accept', 'reject']),
    reason: z.string().min(1).max(64).optional(),
    note: z.string().max(300).optional(),
    /** 022 (additive): the offer, whole fils; accept only. Missing: the client's price. */
    amountFils: z.int().positive().optional(),
  })
  .refine((b) => b.decision === 'reject' || (b.reason === undefined && b.note === undefined), { path: ['reason'], message: 'inbox.errors.reasonUnknown' })
  .refine((b) => b.decision === 'accept' || b.amountFils === undefined, { path: ['amountFils'], message: 'offers.errors.outOfRange' })
export type BriefAnswerRequestV1 = z.infer<typeof briefAnswerRequestV1>

/** The account screen's summary for Up next. */
export const briefsSummaryV1 = z.object({
  count: z.int().nonnegative(),
  soonest: z
    .object({ ref: z.string(), profession: z.string(), occasion: z.string(), emirate: z.string(), date: day.nullable(), budgetFils: z.int().positive().optional() })
    .nullable(),
})
export type BriefsSummaryV1 = z.infer<typeof briefsSummaryV1>

export const briefRefParamV1 = z.object({ ref: z.string().min(1).max(32) })
export const briefPersonaQueryV1 = z.object({ persona: z.string().min(1) })
