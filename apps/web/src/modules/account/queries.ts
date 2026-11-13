import 'server-only'
import type { ActorContext } from '@/shared/api/actor'
import type { User } from '@/payload-types'
import { toAccountBooking, toBriefSummary, type AccountBooking } from './summary'

/** The most bookings or briefs the account reads at once (a client has a handful). */
const READ_LIMIT = 200
export const PAGE_SIZE = 20

/** The caller's own bookings, newest first. Every read filters `member` (FR-015). */
export async function readBookings(ctx: ActorContext, user: User): Promise<AccountBooking[]> {
  const { docs } = await ctx.payload.find({
    collection: 'bookings',
    where: { member: { equals: user.id } },
    sort: '-createdAt',
    limit: READ_LIMIT,
    depth: 2,
    locale: ctx.locale,
    fallbackLocale: 'en',
    overrideAccess: true,
  })
  const now = ctx.now()
  return docs.map((b) => toAccountBooking(b, now))
}

/** One page of the caller's briefs, newest first, each with the booking it led to. */
export async function readBriefs(ctx: ActorContext, user: User, page: number, limit: number) {
  const found = await ctx.payload.find({
    collection: 'briefs',
    where: { member: { equals: user.id } },
    sort: '-createdAt',
    page,
    limit,
    depth: 0,
    overrideAccess: true,
  })
  const ids = found.docs.map((b) => b.id)
  const linked = ids.length
    ? (await ctx.payload.find({ collection: 'bookings', where: { and: [{ member: { equals: user.id } }, { brief: { in: ids } }] }, depth: 0, limit: ids.length, pagination: false, overrideAccess: true })).docs
    : []
  const byBrief = new Map(linked.map((b) => [String(typeof b.brief === 'object' ? b.brief.id : b.brief), b.reference]))
  // 019: creators who said yes to an open brief.
  const yes = await (await import('@/modules/inbox')).saidYesCounts(ctx.payload, found.docs)
  return { items: found.docs.map((b) => toBriefSummary(b, byBrief.get(String(b.id)) ?? null, yes.get(b.id) ?? 0)), hasMore: found.hasNextPage }
}

/** Briefs not yet closed (the "1 open" status). */
export async function countOpenBriefs(ctx: ActorContext, user: User): Promise<number> {
  const { totalDocs } = await ctx.payload.count({ collection: 'briefs', where: { and: [{ member: { equals: user.id } }, { status: { not_equals: 'closed' } }] }, overrideAccess: true })
  return totalDocs
}
