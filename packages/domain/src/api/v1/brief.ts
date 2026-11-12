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
