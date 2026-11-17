import { z } from 'zod'

/**
 * Recording a brief from the app (feature 010, specs/010-first-visit-landing/contracts/briefs-api.md).
 * Labels are never sent: the server re-derives them from the CMS.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'brief.errors.pastDate')

/** One chosen value; a multiple-choice slot repeats its token, in the order picked. */
export const briefSelectionV1 = z.object({
  token: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
})
export type BriefSelectionV1 = z.infer<typeof briefSelectionV1>

export const briefRecordV1 = z.object({
  selections: z.array(briefSelectionV1).min(1, 'brief.errors.required').max(40),
  /** `YYYY-MM-DD` in the business time zone, or null for "any date". */
  date: isoDate.nullable().default(null),
  /**
   * 011 FR-021 (2026-11-15, additive): the code of the creator the brief is for ("Book with …").
   * The server resolves it like the website's `/book/{code}`: a creator who cannot be booked is
   * ignored and the brief goes out as a normal one; `matchPath` then opens their details step.
   */
  creator: z.string().min(1).max(20).optional(),
  /**
   * 022 (additive): the client's price per professional type, whole fils. In offers mode a missing price
   * is the suggestion (older apps); one outside the range is `brief.errors.budgetRange`.
   */
  budgets: z.array(z.object({ persona: z.string().min(1).max(100), amountFils: z.int().positive() })).max(8).optional(),
  /** 022 (additive): the pinned place; the server finds the area and emirate itself. */
  place: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      placeId: z.string().min(1).max(300).optional(),
      source: z.enum(['search', 'drag', 'device']),
    })
    .optional(),
})
export type BriefRecordV1 = z.infer<typeof briefRecordV1>

export const briefReceiptV1 = z.object({
  reference: z.string().min(1),
  sentence: z.string(),
  /** The WhatsApp link with the composed message, or null when no number is set. */
  whatsappUrl: z.string().nullable(),
  /** Quick Match step 2 (`/match/{reference}/{key}`), or null when Quick Match is off. */
  matchPath: z.string().nullable(),
})
export type BriefReceiptV1 = z.infer<typeof briefReceiptV1>

/** 022: the suggested price and range per type for the answers so far (`POST brief-builder/prices`). */
export const briefPricesRequestV1 = z.object({
  /** The builder's answers by slot token, as the website's preview sends them. */
  values: z.record(z.string().max(40), z.string().max(200)),
  custom: z.record(z.string().max(40), z.boolean()).optional(),
  place: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
})
export type BriefPricesRequestV1 = z.infer<typeof briefPricesRequestV1>

export const briefPricesV1 = z.object({
  prices: z.array(
    z.object({
      persona: z.string(),
      /** `null`: no package for this duration or place; any price of at least AED 1. */
      suggestedFils: z.int().positive().nullable(),
      minFils: z.int().positive(),
      maxFils: z.int().positive().nullable(),
    }),
  ),
  /** The emirate's slug the price is for, or `null` when the place is not known yet. */
  emirate: z.string().nullable(),
})
export type BriefPricesV1 = z.infer<typeof briefPricesV1>
