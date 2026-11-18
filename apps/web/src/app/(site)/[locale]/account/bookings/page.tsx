import { effectiveState, type BookingState } from '@shoot/domain/booking'
import { formatMoney } from '@shoot/domain/pricing'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { splitConfirmed } from '@/modules/auth/account-home'
import { requireUser } from '@/modules/auth/session'
import { clientContactsFor } from '@/modules/booking/contact'
import { CreatorBookingRow } from '@/modules/booking/components/CreatorBookingRow'
import { StatusTag } from '@/modules/booking/components/StatusTag'
import { memberBookingPath } from '@/modules/booking/paths'
import { getCreatorBookings, getMyBookings, myProfileIds } from '@/modules/booking/queries'
import { creatorBookingViews, formatDay } from '@/modules/booking/views'
import { getLocations } from '@/modules/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { BriefBar, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { CalendarIcon, DocumentIcon, MinusIcon, PlusIcon } from '@/shared/ui/icons'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'booking' })
  return { title: t('metaTitle'), robots: { index: false } }
}

/** Seekers' quotations and bookings; providers' booking requests (surface brief account-bookings). */
export default async function BookingsPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const { error } = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/bookings')
  const [t, all, mine, assigned, profileIds, locations] = await Promise.all([
    getTranslations({ locale, namespace: 'booking' }),
    getTranslations({ locale }),
    getMyBookings(user),
    getCreatorBookings(user),
    myProfileIds(user.id),
    getLocations(locale),
  ])
  const placeName = (slug: string) => locations.find((l) => l.slug === slug)?.name ?? slug
  // 025: the client's contact on a creator's confirmed part; confirmed bookings lead both lists.
  const contacts = await clientContactsFor(await getPayloadClient(), assigned, profileIds, locale)
  const creatorRows = creatorBookingViews(assigned, profileIds, locale, placeName, contacts)
  const now = new Date()
  const waitingRows = creatorRows.filter((r) => r.awaitingAnswer)
  const jobs = splitConfirmed(creatorRows.filter((r) => !r.awaitingAnswer).map((r) => ({ ...r, state: r.state as BookingState })))
  const primaryRow = creatorRows.find((r) => r.awaitingAnswer || r.state === 'scheduled')
  const creatorRow = (row: (typeof creatorRows)[number]) => (
    <CreatorBookingRow key={`${row.bookingId}-${row.personaId}`} view={row} locale={locale} primary={row.bookingId === primaryRow?.bookingId && row.personaId === primaryRow?.personaId} />
  )
  const own = splitConfirmed(mine.map((b) => ({ ...b, state: effectiveState({ state: b.state as BookingState, validUntil: b.quoteValidUntil ?? null }, now), date: b.date ?? null })))
  const ownRow = (b: (typeof own.rest)[number]) => (
    <Link key={b.id} href={memberBookingPath(b.reference, locale)} className={rowClass('open')} data-testid="my-booking" data-reference={b.reference}>
      <RowContent
        glyph={<DocumentIcon width={15} height={15} />}
        label={
          <>
            <span className="block font-semibold text-ink">{b.reference}</span>
            <span className="block text-[13px] text-mute">
              {b.date ? formatDay(b.date, locale) : ''} {b.totalFils != null ? `· ${formatMoney(b.totalFils, locale)}` : ''}
            </span>
          </>
        }
        trailing={<StatusTag state={b.state} label={t(`state.${b.state}` as never)} />}
      />
    </Link>
  )
  const errorText = error && /^booking\.errors\.[\w-]+$/.test(error) ? all(error as never) : null
  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 pb-24 sm:pt-14 sm:pb-10">
      {/* pb-24 on phones: room under the last row for the floating WhatsApp button, with or without JavaScript. */}
      <h1 className="mb-5 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
      {errorText ? (
        <p role="alert" className="mb-3 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
          {errorText}
        </p>
      ) : null}
      <BriefBar as="div" data-floating-hide>
        {/* 024: notices moved to /account/notifications. */}
        {profileIds.length ? (
          <>
            {waitingRows.length ? <ResultGroup label={t('assigned')}>{waitingRows.map(creatorRow)}</ResultGroup> : null}
            {jobs.confirmed.length ? (
              <ResultGroup label={t('confirmedGroup')} id="confirmed-jobs">
                {jobs.confirmed.map(creatorRow)}
              </ResultGroup>
            ) : null}
            <ResultGroup label={waitingRows.length || jobs.confirmed.length ? t('otherRequests') : t('assigned')}>
              {jobs.rest.length ? (
                jobs.rest.map(creatorRow)
              ) : creatorRows.length ? null : (
                <div className={rowClass('open', false)}>
                  <RowContent glyph={<MinusIcon width={15} height={15} />} label={t('empty')} />
                </div>
              )}
              <Link href={localizeHref('/account/availability', locale)} className={rowClass('open')}>
                <RowContent glyph={<CalendarIcon width={15} height={15} />} label={t('availability')} />
              </Link>
            </ResultGroup>
          </>
        ) : null}
        {own.confirmed.length ? (
          <ResultGroup label={t('confirmedGroup')} id="confirmed-bookings">
            {own.confirmed.map(ownRow)}
          </ResultGroup>
        ) : null}
        {own.rest.length || !own.confirmed.length ? (
          <ResultGroup label={own.confirmed.length ? t('otherBookings') : t('yourRequests')}>
            {own.rest.length ? (
              own.rest.map(ownRow)
            ) : (
              <Link href={localizeHref('/', locale)} className={rowClass('open')}>
                <RowContent glyph={<PlusIcon width={15} height={15} />} label={t('empty')} trailing={t('startBrief')} />
              </Link>
            )}
          </ResultGroup>
        ) : null}
      </BriefBar>
    </section>
  )
}
