import { formatMoney } from '@shoot/domain/pricing'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireUser } from '@/modules/auth/session'
import { CreatorBookingRow } from '@/modules/booking/components/CreatorBookingRow'
import { NotificationList } from '@/modules/booking/components/NotificationList'
import { memberBookingPath } from '@/modules/booking/paths'
import { getCreatorBookings, getMyBookings, getMyNotifications, myProfileIds } from '@/modules/booking/queries'
import { creatorBookingViews, formatDay } from '@/modules/booking/views'
import { getLocations } from '@/modules/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
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
  const [t, all, mine, assigned, profileIds, notices, locations] = await Promise.all([
    getTranslations({ locale, namespace: 'booking' }),
    getTranslations({ locale }),
    getMyBookings(user),
    getCreatorBookings(user),
    myProfileIds(user.id),
    getMyNotifications(user),
    getLocations(locale),
  ])
  const placeName = (slug: string) => locations.find((l) => l.slug === slug)?.name ?? slug
  const creatorRows = creatorBookingViews(assigned, profileIds, locale, placeName)
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
        <NotificationList items={notices.map((n) => ({ id: n.id, text: n.text }))} locale={locale} />
        {profileIds.length ? (
          <ResultGroup label={t('assigned')}>
            {creatorRows.length ? creatorRows.map((row, i) => <CreatorBookingRow key={`${row.bookingId}-${row.personaId}`} view={row} locale={locale} primary={i === creatorRows.findIndex((r) => r.awaitingAnswer || r.state === 'scheduled')} />) : (
              <div className={rowClass('open', false)}>
                <RowContent glyph={<MinusIcon width={15} height={15} />} label={t('empty')} />
              </div>
            )}
            <Link href={localizeHref('/account/availability', locale)} className={rowClass('open')}>
              <RowContent glyph={<CalendarIcon width={15} height={15} />} label={t('availability')} />
            </Link>
          </ResultGroup>
        ) : null}
        <ResultGroup label={t('yourRequests')}>
          {mine.length ? (
            mine.map((b) => (
              <Link key={b.id} href={memberBookingPath(b.reference, locale)} className={rowClass('open')} data-testid="my-booking">
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
                  trailing={t(`state.${b.state}` as never)}
                />
              </Link>
            ))
          ) : (
            <Link href={localizeHref('/', locale)} className={rowClass('open')}>
              <RowContent glyph={<PlusIcon width={15} height={15} />} label={t('empty')} trailing={t('startBrief')} />
            </Link>
          )}
        </ResultGroup>
      </BriefBar>
    </section>
  )
}
