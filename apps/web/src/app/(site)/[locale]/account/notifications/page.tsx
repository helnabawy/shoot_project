import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireUser } from '@/modules/auth/session'
import { NotificationList } from '@/modules/booking/components/NotificationList'
import { myNoticeRows } from '@/modules/booking/notices'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { BriefBar, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { BellIcon } from '@/shared/ui/icons'

type Props = { params: Promise<{ locale: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'notifications' })
  return { title: t('metaTitle'), robots: { index: false } }
}

/** Feature 024: the member's latest notices, newest first, read and unread (moved here from Bookings). */
export default async function NotificationsPage({ params }: Props) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/notifications')
  const [t, { items }] = await Promise.all([getTranslations({ locale, namespace: 'notifications' }), myNoticeRows(await getPayloadClient(), user)])
  const when = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 pb-24 sm:pt-14 sm:pb-10">
      {/* pb-24 on phones: room under the last row for the floating WhatsApp button. */}
      <h1 className="mb-5 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
      <BriefBar as="div" data-floating-hide>
        {items.length ? (
          <NotificationList
            items={items.map((n) => ({ id: n.id, text: n.text, read: n.read, when: when.format(new Date(n.createdAt)), hasTarget: n.path !== null }))}
            locale={locale}
          />
        ) : (
          <ResultGroup label={t('title')}>
            <div className={rowClass('open', false)} data-testid="notifications-empty">
              <RowContent glyph={<BellIcon width={15} height={15} />} label={t('empty')} />
            </div>
          </ResultGroup>
        )}
      </BriefBar>
    </section>
  )
}
