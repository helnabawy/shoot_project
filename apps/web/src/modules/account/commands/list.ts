import 'server-only'
import { splitBookings } from '@shoot/domain/account'
import type { BookingListV1, BriefListV1 } from '@shoot/domain/api/v1'
import { dubaiToday } from '@shoot/domain/booking'
import type { ActorContext } from '@/shared/api/actor'
import { PAGE_SIZE, readBookings, readBriefs } from '../queries'

/**
 * `GET me/bookings?page=`: Upcoming (shoot day today or later in the business time zone, soonest first,
 * on page 1) and Past (most recent first, paged), FR-011. A page past the last answers an empty page.
 */
export async function listBookings(ctx: ActorContext, query: { page?: string }): Promise<BookingListV1> {
  const page = Number(query.page ?? 1)
  const { upcoming, past } = splitBookings(await readBookings(ctx, ctx.user!), dubaiToday(ctx.now()))
  const from = (page - 1) * PAGE_SIZE
  return {
    upcoming: page === 1 ? upcoming.map((b) => b.summary) : [],
    past: past.slice(from, from + PAGE_SIZE).map((b) => b.summary),
    page,
    hasMore: past.length > from + PAGE_SIZE,
  }
}

/** `GET me/briefs?page=`: the caller's own briefs, newest first (FR-005). */
export async function listBriefs(ctx: ActorContext, query: { page?: string }): Promise<BriefListV1> {
  const page = Number(query.page ?? 1)
  return { ...(await readBriefs(ctx, ctx.user!, page, PAGE_SIZE)), page }
}
