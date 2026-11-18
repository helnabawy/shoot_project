import { z } from 'zod'
import { imageV1 } from './common'
import { needV1 } from './creator-account'
import { rejectReasonV1 } from './inbox'

/**
 * Feature 023, the creator home (specs/023-creator-home/contracts/mobile-api.md). One read for the
 * screen: who the creator is, their status, the three counts, the queue of requests to answer, the next
 * shoot and today's availability. Answers go through the existing booking and brief endpoints.
 */

const isoDate = z.iso.datetime()
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const itemBase = {
  ref: z.string().min(1),
  /** Content words in the request language; the title is "{occasion} in {emirate}". */
  occasion: z.string(),
  emirate: z.string(),
  profession: z.string(),
}

/** A booking request waiting for this creator; the client is a first name and an initial only. */
export const homeBookingItemV1 = z
  .object({
    kind: z.literal('booking'),
    ...itemBase,
    /** `null` when the booking has no date on record. */
    date: day.nullable(),
    /** Start time "HH:MM" in the business time zone, when known. */
    time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
    /** The duration option's label in the request language, when known. */
    length: z.string().nullable(),
    client: z.string(),
    respondBy: isoDate,
  })
  .strict()

/** An open client brief that matches this creator. */
export const homeBriefItemV1 = z
  .object({
    kind: z.literal('brief'),
    ...itemBase,
    /** The professional type the answer is for (a brief for two types is two items). */
    persona: z.string().min(1),
    /** `null`: the date is to be agreed. */
    date: day.nullable(),
    sentAt: isoDate,
    /** 022: the client's price for this type, whole fils, only when creators offer prices. */
    budgetFils: z.int().positive().optional(),
  })
  .strict()

export const homeItemV1 = z.discriminatedUnion('kind', [homeBookingItemV1, homeBriefItemV1])
export type HomeItemV1 = z.infer<typeof homeItemV1>

export const homeModeV1 = z.enum(['live', 'incomplete', 'review', 'paused'])

export const creatorHomeV1 = z
  .object({
    name: z.string(),
    code: z.string().nullable(),
    /** Profession names in the request language, primary first. */
    professions: z.array(z.string()),
    photo: imageV1.nullable(),
    mode: homeModeV1,
    /** The steps still missing; non-empty only when `mode` is `incomplete`. */
    needs: z.array(needV1),
    /** Present only when `mode` is `live`; `toAnswer` equals the queue's length. */
    counts: z.object({ toAnswer: z.int().nonnegative(), comingUp: z.int().nonnegative(), completed: z.int().nonnegative() }).strict().optional(),
    /** Ordered: booking requests by answer-by time, then briefs newest first. Empty unless live. */
    queue: z.array(homeItemV1),
    next: z
      .object({
        ref: z.string(),
        quotation: z.string().nullable(),
        occasion: z.string(),
        emirate: z.string(),
        date: day,
        time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        length: z.string().nullable(),
        paid: z.boolean(),
      })
      .strict()
      .nullable(),
    today: z.enum(['free', 'blocked', 'booked']),
    /** From the content area, for declining a brief. */
    reasons: z.array(rejectReasonV1),
  })
  .strict()
  .refine((h) => h.mode !== 'live' || h.counts?.toAnswer === h.queue.length, { path: ['counts'], message: 'counts.toAnswer must equal the queue length' })
  .refine((h) => h.mode === 'live' || (h.queue.length === 0 && h.counts === undefined), { path: ['queue'], message: 'only a live creator has a queue and counts' })
export type CreatorHomeV1 = z.infer<typeof creatorHomeV1>
