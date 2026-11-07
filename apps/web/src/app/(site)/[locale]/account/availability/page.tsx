import { addDays, dubaiToday } from '@shoot/domain/booking'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { requireUser } from '@/modules/auth/session'
import { AvailabilityList, type AvailabilityDay } from '@/modules/booking/components/AvailabilityList'
import { getMyAvailability } from '@/modules/booking/queries'
import { redirect } from '@/i18n/navigation'
import type { Locale } from '@/shared/lib/locale'
import { BriefBar } from '@/shared/ui/bar'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }

export const dynamic = 'force-dynamic'
const DAYS = 90

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'availability' })
  return { title: t('metaTitle'), robots: { index: false } }
}

/** A provider's next 90 days: free unless blocked; booked days come from confirmations (FR-002). */
export default async function AvailabilityPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const { error } = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/availability')
  const today = dubaiToday(new Date())
  const mine = await getMyAvailability(user, today)
  if (!mine) redirect({ href: '/account/profile', locale })
  const [t, all] = await Promise.all([getTranslations({ locale, namespace: 'availability' }), getTranslations({ locale })])
  const status = new Map(mine!.blocks.map((b) => [b.date, b.kind === 'booking' ? 'booked' : 'blocked'] as const))
  const dayFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const monthFormat = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const months: { label: string; days: AvailabilityDay[] }[] = []
  for (let i = 0; i < DAYS; i += 1) {
    const date = addDays(today, i)
    const at = new Date(`${date}T12:00:00Z`)
    const label = monthFormat.format(at)
    if (months.at(-1)?.label !== label) months.push({ label, days: [] })
    months.at(-1)!.days.push({ date, label: dayFormat.format(at), status: status.get(date) ?? 'free' })
  }
  const errorText = error && /^availability\.errors\.[\w-]+$/.test(error) ? all(error as never) : null
  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 pb-24 sm:pt-14 sm:pb-10">
      {/* pb-24 on phones: room under the last row for the floating WhatsApp button, with or without JavaScript. */}
      <h1 className="mb-2 px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
      <p className="mb-5 px-1 text-[15px] text-mute">{t('intro')}</p>
      {errorText ? (
        <p role="alert" className="mb-3 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
          {errorText}
        </p>
      ) : null}
      <BriefBar as="div" data-floating-hide>
        <AvailabilityList months={months} locale={locale} />
      </BriefBar>
    </section>
  )
}
