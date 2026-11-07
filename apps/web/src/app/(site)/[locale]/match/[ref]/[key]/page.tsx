import { isIsoDay } from '@shoot/domain/booking'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentUser } from '@/modules/auth/session'
import { MatchResults } from '@/modules/booking/components/MatchResults'
import { getBriefByKey, getMatchPage } from '@/modules/booking/match'
import { matchView, picksFor } from '@/modules/booking/views'
import { getDirectoryContext } from '@/modules/creators'
import { getSiteSettings } from '@/modules/site-settings/queries'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string; ref: string; key: string }>; searchParams: Promise<{ pick?: string; date?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'match' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

/** Step 2 "Your creator" (US1): free, matching creators under one fixed price. */
export default async function MatchPage({ params, searchParams }: Props) {
  const { locale: raw, ref, key } = await params
  const query = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await getCurrentUser()
  const brief = await getBriefByKey(ref, key, user?.id)
  if (!brief) notFound()
  const now = new Date()
  const date = query.date && isIsoDay(query.date) ? query.date : brief.date ? String(brief.date).slice(0, 10) : null
  const [page, ctx, settings, t] = await Promise.all([getMatchPage(brief, locale, now, { date }), getDirectoryContext(locale), getSiteSettings(locale), getTranslations({ locale, namespace: 'match' })])
  const experience = await getTranslations({ locale, namespace: 'creators.profile' })
  const view = matchView(page, {
    ref: brief.reference ?? ref,
    key,
    locale,
    picks: picksFor(page, query.pick),
    date,
    ctx,
    settings,
    sentence: brief.sentence ?? '',
    experience: (count) => experience('experienceYears', { count }),
  })
  return (
    <section className="mx-auto max-w-[680px] px-3 pt-8 sm:pt-14">
      <h1 id="match-heading" className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">
        {t('title')}
      </h1>
      <p className="mt-1 mb-5 px-1 text-[13px] text-mute">{t('step')}</p>
      <MatchResults {...view} />
    </section>
  )
}
