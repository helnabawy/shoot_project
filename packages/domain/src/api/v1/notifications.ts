import { z } from 'zod'

/**
 * Feature 024, Notifications: the signed-in member's own in-app notices (clients and creators), the
 * latest first, read and unread. The app words each notice from its `event`; `path` is where it leads.
 */

/** One in-app notice. `ref` is the booking's or the brief's reference; `path` a site path, never a URL. */
export const noticeV1 = z.object({
  id: z.string().min(1),
  event: z.string(),
  audience: z.enum(['client', 'creator']),
  ref: z.string().nullable(),
  path: z.string().startsWith('/').nullable(),
  createdAt: z.iso.datetime(),
  read: z.boolean(),
})
export type NoticeV1 = z.infer<typeof noticeV1>

export const noticesV1 = z.object({
  items: z.array(noticeV1),
  /** How many of the member's notices are unread (may exceed the items shown). */
  unread: z.number().int().nonnegative(),
})
export type NoticesV1 = z.infer<typeof noticesV1>

export const noticeIdParamV1 = z.object({ id: z.string().regex(/^\d+$/) })
