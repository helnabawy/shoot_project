import 'server-only'
import { finishAutoOpen, finishItems, openCount, pickUpNext, waitingCount } from '@shoot/domain/account'
import type { AccountHomeV1 } from '@shoot/domain/api/v1'
import { dubaiToday } from '@shoot/domain/booking'
import type { SiteSetting } from '@/payload-types'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { countOpenBriefs, readBookings, readBriefs } from '../queries'

const HOME_BRIEFS = 5

/** "What your account does", from the CMS in the caller's language (FR-027). */
async function aboutLines(ctx: ActorContext): Promise<string[]> {
  const settings = (await ctx.payload.findGlobal({ slug: 'site-settings', locale: ctx.locale, fallbackLocale: 'en', depth: 0 })) as SiteSetting
  return (settings.accountAbout ?? []).map((r) => r.line).filter((l): l is string => typeof l === 'string' && l.trim() !== '')
}

/**
 * `GET me/account`: the client's account home in one answer (FR-002 to FR-005, FR-020). A creator
 * account has no client account, so it answers 404 (they use feature 014's account).
 */
export async function readAccount(ctx: ActorContext): Promise<AccountHomeV1 | Problem> {
  const user = ctx.user!
  if (user.accountType === 'provider') return problem(404, 'api.errors.notFound')
  const [bookings, briefs, openBriefs, about] = await Promise.all([readBookings(ctx, user), readBriefs(ctx, user, 1, HOME_BRIEFS), countOpenBriefs(ctx, user), aboutLines(ctx)])
  const rows = bookings.map((b) => b.row)
  const pick = pickUpNext(rows)
  const picked = pick ? bookings.find((b) => b.summary.reference === pick.reference) : undefined
  const dismissed = (user as { accountFinishDismissedAt?: string | null }).accountFinishDismissedAt ?? null
  return {
    person: { name: user.name ?? null, phone: user.username ?? null },
    upNext: pick && picked ? { kind: pick.kind, booking: picked.summary } : null,
    places: { bookings: { waiting: waitingCount(rows), open: openCount(rows, dubaiToday(ctx.now())) }, briefs: { open: openBriefs } },
    briefs: briefs.items,
    finish: {
      items: finishItems({ phone: user.username ?? null, name: user.name ?? null, email: user.email ?? null }),
      autoOpen: finishAutoOpen({ bookingCount: bookings.length, dismissedAt: dismissed }),
    },
    about,
  }
}
