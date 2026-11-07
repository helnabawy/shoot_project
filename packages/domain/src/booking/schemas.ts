import { z } from 'zod'
import { normaliseE164 } from '../contact/whatsapp'
import { isIsoDay } from './dates'

/** Step 3 "Your details" (FR-011, research §13). Errors are message keys. */
export const detailsSchema = z.object({
  name: z.string().trim().min(2, 'booking.errors.name').max(80, 'booking.errors.name'),
  whatsapp: z.string().transform((value, ctx) => {
    const n = normaliseE164(value)
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'contact.errors.whatsappFormat' })
      return z.NEVER
    }
    return n
  }),
  date: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || isIsoDay(v), 'booking.errors.date'),
  addOnIds: z.array(z.string().max(40)).max(10).default([]),
  promo: z.string().trim().max(20).optional().transform((v) => v || undefined),
})
export type DetailsInput = z.infer<typeof detailsSchema>

export const respondSchema = z.object({
  decision: z.enum(['confirm', 'decline']),
  reason: z.string().trim().max(200).optional(),
})

export const reportSchema = z.object({
  reason: z.string().trim().min(5, 'booking.errors.reason').max(500, 'booking.errors.reason'),
})
