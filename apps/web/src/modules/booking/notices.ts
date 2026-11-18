import 'server-only'
import type { NoticesV1, NoticeV1 } from '@shoot/domain/api/v1'
import type { Payload, Where } from 'payload'
import type { Notification, User } from '@/payload-types'
import { problem, type Problem } from '@/shared/api/problem'

/** Feature 024: the member's own in-app notices, for `/account/notifications` and the app's Notifications. */

export const NOTICES_SHOWN = 20

/** A member's in-app rows (client or creator, never admin). */
const mine = (user: User): Where => ({
  and: [{ user: { equals: user.id } }, { channel: { equals: 'in-app' } }, { audience: { in: ['client', 'creator'] } }],
})

/**
 * Where a notice leads, as a locale-free site path: the stored link without the site's origin or the
 * `/ar` prefix. `null` for an empty link, another site, or an admin page.
 */
export function noticePath(link: string | null | undefined): string | null {
  if (!link) return null
  let path = link
  if (/^https?:\/\//i.test(link)) {
    try {
      const url = new URL(link)
      const site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')
      if (url.host !== site.host) return null
      path = `${url.pathname}${url.search}`
    } catch {
      return null
    }
  }
  if (!path.startsWith('/') || path.startsWith('//')) return null
  path = path.replace(/^\/ar(?=\/|$|\?)/, '') || '/'
  if (path.startsWith('/admin')) return null
  return path
}

export type NoticeRow = NoticeV1 & { text: string }

function toNotice(n: Notification): NoticeRow {
  const booking = typeof n.booking === 'object' && n.booking ? n.booking.reference : null
  const brief = typeof n.brief === 'object' && n.brief ? n.brief.reference : null
  return {
    id: String(n.id),
    event: n.event,
    audience: n.audience === 'client' ? 'client' : 'creator',
    ref: booking ?? brief ?? null,
    path: noticePath(n.link),
    createdAt: n.createdAt,
    read: Boolean(n.readAt),
    text: n.text,
  }
}

/** The latest notices, newest first, read and unread, with the unread count; `text` is for the website. */
export async function myNoticeRows(payload: Payload, user: User): Promise<{ items: NoticeRow[]; unread: number }> {
  const [list, unread] = await Promise.all([
    payload.find({ collection: 'notifications', where: mine(user), sort: '-createdAt', limit: NOTICES_SHOWN, depth: 1, overrideAccess: true }),
    payload.count({ collection: 'notifications', where: { and: [mine(user), { readAt: { exists: false } }] }, overrideAccess: true }),
  ])
  return { items: list.docs.map((n) => toNotice(n as Notification)), unread: unread.totalDocs }
}

/** The wire shape: the rows without the stored text (the app words them from `event`). */
export async function myNotices(payload: Payload, user: User): Promise<NoticesV1> {
  const { items, unread } = await myNoticeRows(payload, user)
  return { items: items.map(({ text: _text, ...n }) => n), unread }
}

/**
 * Marks the member's own notice read and answers where it leads (`null` when nowhere); another person's
 * notice, or an admin row, is "not found".
 */
export async function readNotice(payload: Payload, user: User, id: string, now: Date): Promise<{ path: string | null } | Problem> {
  if (!/^\d+$/.test(id)) return problem(404, 'booking.errors.not-found')
  const own = (await payload.find({ collection: 'notifications', where: { and: [{ id: { equals: Number(id) } }, mine(user)] }, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!own) return problem(404, 'booking.errors.not-found')
  if (!own.readAt) await payload.update({ collection: 'notifications', id: own.id, data: { readAt: now.toISOString() }, user, overrideAccess: false })
  return { path: noticePath(own.link) }
}
