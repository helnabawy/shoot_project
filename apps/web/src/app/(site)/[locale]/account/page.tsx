import { effectiveState, type BookingState } from '@shoot/domain/booking'
import { joinList } from '@shoot/domain/personas'
import { formatMoney } from '@shoot/domain/pricing'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { pickNextUp, placeStatus } from '@/modules/auth/account-home'
import {
  NextUpPanel,
  PlaceRow,
  profileStatusTitle,
  type BookingView,
  type JobView,
} from '@/modules/auth/components/AccountHome'
import { AccountSummary, SignOut } from '@/modules/auth/components/AccountSummary'
import { requireUser } from '@/modules/auth/session'
import { MyBriefs } from '@/modules/brief/components/MyBriefs'
import { getMyBriefs } from '@/modules/brief/queries'
import { accessKey } from '@/modules/booking/keys'
import { matchPath, memberBookingPath } from '@/modules/booking/paths'
import {
  getCreatorBookings,
  getMyAvailability,
  getMyBookings,
  getMyNotifications,
  myProfileIds,
} from '@/modules/booking/queries'
import { creatorBookingViews, formatDay } from '@/modules/booking/views'
import { getLocations } from '@/modules/creators'
import { getMyProfile } from '@/modules/creators/my-profile'
import { briefsSummary, inboxContext, inboxStamp, saidYesCounts } from '@/modules/inbox'
import { liveInboxStamp } from '@/modules/inbox/live-actions'
import { LiveRefresh } from '@/shared/components/LiveRefresh'
import { getAllPersonas } from '@/modules/personas/queries'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { CalendarIcon, DocumentIcon, UserIcon } from '@/shared/ui/icons'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })
  return { title: t('title'), robots: { index: false } }
}

/**
 * The account home (surface brief account-home): who you are, the one thing that comes next with its Top Hit,
 * then the places in the account with a one-line status each, your briefs, and log out last.
 */
export default async function AccountPage({ params }: Props) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account')
  const provider = user.accountType === 'provider'
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const [
    t,
    briefs,
    personas,
    mine,
    assigned,
    profileIds,
    notices,
    locations,
    profile,
    availability,
  ] = await Promise.all([
    getTranslations('account'),
    getMyBriefs(user),
    getAllPersonas(locale),
    getMyBookings(user),
    getCreatorBookings(user),
    myProfileIds(user.id),
    getMyNotifications(user),
    getLocations(locale),
    provider ? getMyProfile(user) : Promise.resolve(null),
    provider ? getMyAvailability(user, today) : Promise.resolve(null),
  ])
  // 019: open client briefs that match a live creator (null when the profile is not live).
  const yes = await saidYesCounts((await inboxContext(locale, now)).payload, briefs)
  const inbox = provider ? await briefsSummary(await inboxContext(locale, now), user.id) : null
  // 022: an offers brief shows the client's price in Up next (board 53).
  const openBriefs = inbox?.soonest
    ? { ...inbox, soonest: { ...inbox.soonest, dateLabel: inbox.soonest.date ? formatDay(inbox.soonest.date, locale) : '', ...(inbox.soonest.budgetFils ? { priceLabel: formatMoney(inbox.soonest.budgetFils, locale) } : {}) } }
    : inbox
  const ts = await getTranslations('creators.status')
  // Every profession the member offers, primary first ("Photographer and Videographer").
  const personaLabel = joinList(
    (user.persona ?? [])
      .map((ref) => personas.find((p) => p.id === String(typeof ref === 'object' ? ref.id : ref))?.singular)
      .filter((label): label is string => Boolean(label)),
    'and',
    locale,
  )
  const placeName = (slug: string) => locations.find((l) => l.slug === slug)?.name ?? slug

  const jobs: JobView[] = creatorBookingViews(assigned, profileIds, locale, placeName).map((v) => ({
    reference: v.reference,
    state: v.state as BookingState,
    awaitingAnswer: v.awaitingAnswer,
    date: v.date,
    dateLabel: v.dateLabel,
    place: v.place,
    sentence: v.sentence,
    price: v.price,
    respondBy: v.respondBy,
  }))
  const bookings: BookingView[] = mine.map((b) => ({
    reference: b.reference,
    state: effectiveState(
      { state: b.state as BookingState, validUntil: b.quoteValidUntil ?? null },
      now,
    ),
    date: b.date ?? null,
    dateLabel: b.date ? formatDay(b.date, locale) : '',
    place: b.location ? placeName(b.location) : '',
    sentence: typeof b.brief === 'object' && b.brief ? (b.brief.sentence ?? '') : '',
    price: b.totalFils != null ? formatMoney(b.totalFils, locale) : '',
  }))
  const profileStatus = provider ? (profile?.status ?? 'draft') : null
  const offers = provider ? null : await offersNextUp(briefs, yes, locale)
  const next = pickNextUp({ today, provider, profileStatus, jobs, bookings, briefs: openBriefs, offers })
  const waiting = jobs.filter((j) => j.awaitingAnswer).length
  const bookingStatus = placeStatus({ today, waiting, unread: notices.length, jobs, bookings })
  const daysOff = availability ? availability.blocks.filter((b) => b.kind === 'blocked').length : 0

  return (
    <div className="mx-auto grid max-w-[560px] gap-y-8 px-3 pt-8 pb-24 sm:pt-14 sm:pb-16 lg:max-w-[960px] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-x-16">
      {/* pb-24 on phones: room under the last row for the floating WhatsApp button, with or without JavaScript. */}
      {/* 022 (FR-023): a creator's Up next shows new briefs and offers without a reload. */}
      {inbox ? <LiveRefresh stamp={await inboxStamp(await inboxContext(locale, now), user.id)} check={liveInboxStamp.bind(null, locale)} /> : null}
      {/* The start column holds who you are, the places in the account and log out; on phones it dissolves so log out falls to the end of the page. */}
      <div className="contents lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1 lg:block lg:self-start">
        <AccountSummary user={user} personaLabel={personaLabel || undefined} locale={locale} />
        <nav aria-labelledby="account-places-title" className="max-lg:order-2 lg:mt-8">
          <h2 id="account-places-title" className="group-label px-1 pb-2">
            {t('places')}
          </h2>
          <ul className="-mx-3 divide-y divide-hair border-y border-hair">
            <PlaceRow
              href={localizeHref('/account/bookings', locale)}
              glyph={<DocumentIcon width={15} height={15} />}
              label={t('bookingsLink')}
              status={
                <span
                  className={bookingStatus.key === 'waiting' ? 'font-medium text-ink' : undefined}
                >
                  {t(`place.${bookingStatus.key}`, { count: bookingStatus.count })}
                </span>
              }
              testId="account-bookings-link"
            />
            {provider ? (
              <>
                <PlaceRow
                  href={localizeHref('/account/profile', locale)}
                  glyph={<UserIcon width={15} height={15} />}
                  label={t('myProfile')}
                  status={ts(profileStatusTitle(profileStatus ?? 'draft') as never)}
                  testId="my-profile-link"
                />
                <PlaceRow
                  href={localizeHref('/account/availability', locale)}
                  glyph={<CalendarIcon width={15} height={15} />}
                  label={t('availabilityLink')}
                  status={t('place.daysOff', { count: daysOff })}
                />
              </>
            ) : null}
          </ul>
        </nav>
        <div className="max-lg:order-last lg:mt-8">
          <SignOut locale={locale} />
        </div>
      </div>
      <div className="min-w-0 max-lg:order-1 lg:col-start-2 lg:row-start-1">
        <NextUpPanel
          next={next}
          hrefs={{
            bookings: localizeHref('/account/bookings', locale),
            booking: (ref) => memberBookingPath(ref, locale),
            profile: localizeHref('/account/profile', locale),
            availability: localizeHref('/account/availability', locale),
            inbox: localizeHref('/account/inbox', locale),
            brief: `${localizeHref('/', locale)}#brief`,
          }}
        />
        {briefs.length || next.kind !== 'brief' ? (
          <div className="mt-10">
            <MyBriefs briefs={briefs} locale={locale} offerNew={next.kind !== 'brief'} saidYes={yes} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 022 (board 54): the client's open offers brief with the most offers, and the private link to its offers. */
async function offersNextUp(briefs: { id: number; reference?: string | null; sentence?: string | null; status?: string | null }[], counts: ReadonlyMap<number, number>, locale: Locale) {
  const withOffers = briefs.filter((b) => (b as { offers?: { mode?: string | null } | null }).offers?.mode === 'offers' && (counts.get(b.id) ?? 0) > 0)
  const top = withOffers.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0]
  if (!top?.reference) return null
  const payload = await getPayloadClient()
  const full = (await payload.findByID({ collection: 'briefs', id: top.id, depth: 0, overrideAccess: true, showHiddenFields: true, select: { accessSalt: true } })) as { accessSalt?: string | null }
  if (!full.accessSalt) return null
  return { count: counts.get(top.id)!, sentence: top.sentence ?? '', reference: top.reference, href: matchPath(top.reference, accessKey(full.accessSalt, 'brief'), locale) }
}

