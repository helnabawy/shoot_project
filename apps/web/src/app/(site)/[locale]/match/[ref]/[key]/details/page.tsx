import { dubaiToday, isIsoDay, parsePicks } from '@shoot/domain/booking'
import { formatMoney } from '@shoot/domain/pricing'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getCurrentUser } from '@/modules/auth/session'
import { DetailsForm } from '@/modules/booking/components/DetailsForm'
import { getBriefByKey, getMatchPage } from '@/modules/booking/match'
import { matchPath } from '@/modules/booking/paths'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getAddOnsFor } from '@/modules/pricing'
import { getSiteSettings } from '@/modules/site-settings/queries'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string; ref: string; key: string }>; searchParams: Promise<{ pick?: string; date?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'details' })
  return { title: t('metaTitle'), robots: { index: false, follow: false } }
}

const ERROR_KEYS = ['booking.errors.name', 'booking.errors.date', 'booking.errors.tooMany', 'booking.errors.unavailable', 'booking.errors.generic', 'booking.errors.not-found', 'contact.errors.whatsappFormat']

/** Step 3 "Your details" (US2): the last step before the quotation. */
export default async function DetailsPage({ params, searchParams }: Props) {
  const { locale: raw, ref, key } = await params
  const query = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await getCurrentUser()
  const brief = await getBriefByKey(ref, key, user?.id)
  if (!brief) notFound()
  const now = new Date()
  const briefDate = brief.date ? String(brief.date).slice(0, 10) : null
  const date = query.date && isIsoDay(query.date) ? query.date : briefDate
  const page = await getMatchPage(brief, locale, now, { date })
  const picks = parsePicks(query.pick)
  const back = matchPath(brief.reference ?? ref, key, locale)
  if (!picks || !page.total.ok || !page.sections.every((s) => picks.some((p) => p.persona === s.persona.slug))) redirect(back)

  const t = await getTranslations({ locale, namespace: 'details' })
  const summary = [
    { label: brief.sentence ?? '' },
    ...page.sections.map((s) => {
      const pick = picks.find((p) => p.persona === s.persona.slug)
      const creator = pick?.code ? s.creators.find((c) => c.code === pick.code) : null
      return { label: creator ? t('creatorRow', { type: s.persona.singular, name: creator.displayName }) : t('anyCreator', { type: s.persona.singular }) }
    }),
  ]
  const addOns = (await getAddOnsFor(page.facts.personaIds, locale)).map((a) => ({ id: a.id, title: a.title, price: formatMoney(a.price, locale) }))
  const [all, settings] = await Promise.all([getTranslations({ locale }), getSiteSettings(locale)])
  const errorText = Object.fromEntries(ERROR_KEYS.map((k) => [k, all(k as never)]))
  const labels = Object.fromEntries((['title', 'step', 'summary', 'name', 'whatsapp', 'whatsappHint', 'date', 'dateHint', 'extras', 'codeToggle', 'code', 'submit', 'change'] as const).map((k) => [k, t(k)])) as Record<string, string>
  return (
    <section className="mx-auto max-w-[680px] px-3 pt-8 sm:pt-14">
      <h1 id="details-heading" className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">
        {t('title')}
      </h1>
      <p className="mt-1 mb-5 px-1 text-[13px] text-mute">{t('step')}</p>
      <DetailsForm
        labels={{ ...labels, total: t.raw('total') as string } as never}
        whatsapp={{ href: whatsappHref(settings.whatsappNumber, brief.sentence) ?? '#', label: all('match.askWhatsApp'), actions: all('match.actions') }}
        briefRef={brief.reference ?? ref}
        briefKey={key}
        pick={query.pick ?? ''}
        locale={locale}
        needsDate={!date}
        presetDate={date && date !== briefDate ? date : undefined}
        minDate={dubaiToday(now)}
        defaults={{ name: user?.name ?? undefined, whatsapp: user?.phone ?? undefined }}
        summary={summary}
        changeHref={`${back}?pick=${encodeURIComponent(query.pick ?? '')}${date && date !== briefDate ? `&date=${date}` : ''}`}
        addOns={addOns}
        total={formatMoney(page.total.total, locale)}
        errorText={errorText}
      />
    </section>
  )
}
