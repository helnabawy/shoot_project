import { effectiveState, type BookingState } from '@shoot/domain/booking'
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
import { memberBookingPath } from '@/modules/booking/paths'
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
import { getAllPersonas } from '@/modules/personas/queries'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
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
  const ts = await getTranslations('creators.status')
  const personaId = user.persona
    ? String(typeof user.persona === 'object' ? user.persona.id : user.persona)
    : null
  const persona = personas.find((p) => p.id === personaId)
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
  const next = pickNextUp({ today, provider, profileStatus, jobs, bookings })
  const waiting = jobs.filter((j) => j.awaitingAnswer).length
  const bookingStatus = placeStatus({ today, waiting, unread: notices.length, jobs, bookings })
  const daysOff = availability ? availability.blocks.filter((b) => b.kind === 'blocked').length : 0

  return (
    <div className="mx-auto grid max-w-[560px] gap-y-8 px-3 pt-8 pb-24 sm:pt-14 sm:pb-16 lg:max-w-[960px] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-x-16">
      {/* pb-24 on phones: room under the last row for the floating WhatsApp button, with or without JavaScript. */}
      {/* The start column holds who you are, the places in the account and log out; on phones it dissolves so log out falls to the end of the page. */}
      <div className="contents lg:sticky lg:top-24 lg:col-start-1 lg:row-start-1 lg:block lg:self-start">
        <AccountSummary user={user} personaLabel={persona?.singular} locale={locale} />
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
            brief: `${localizeHref('/', locale)}#brief`,
          }}
        />
        {briefs.length || next.kind !== 'brief' ? (
          <div className="mt-10">
            <MyBriefs briefs={briefs} locale={locale} offerNew={next.kind !== 'brief'} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
