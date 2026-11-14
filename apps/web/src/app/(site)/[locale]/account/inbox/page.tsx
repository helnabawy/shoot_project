import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { requireUser } from '@/modules/auth/session'
import { formatDay } from '@/modules/booking/views'
import { creatorInbox, inboxContext } from '@/modules/inbox'
import { InboxList, type InboxListView } from '@/modules/inbox/components/InboxList'
import type { BriefCardView } from '@/modules/inbox/components/BriefCard'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { BriefBar } from '@/shared/ui/bar'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'inbox' })
  return { title: t('metaTitle'), robots: { index: false } }
}

/** The creator brief inbox (feature 019): open briefs that match them, with accept, reject and undo. */
export default async function InboxPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const { error } = await searchParams
  setRequestLocale(raw)
  const locale = raw as Locale
  const user = await requireUser(locale, '/account/inbox')
  if (user.accountType !== 'provider') redirect(localizeHref('/account', locale))
  const [t, all, inbox] = await Promise.all([getTranslations({ locale, namespace: 'inbox' }), getTranslations({ locale }), creatorInbox(await inboxContext(locale), user.id)])
  const view = (i: InboxListView['open'][number] | Omit<BriefCardView, 'dateLabel' | 'sentLabel'>): BriefCardView => ({
    ...i,
    dateLabel: i.date ? formatDay(i.date, locale) : '',
    sentLabel: formatDay(i.sentAt.slice(0, 10), locale),
  })
  const list: InboxListView = inbox
    ? { open: inbox.open.map(view), accepted: inbox.accepted.map(view), rejected: inbox.rejected.map(view), reasons: inbox.reasons }
    : { open: [], accepted: [], rejected: [], reasons: [] }
  const errorText = error && /^inbox\.errors\.\w+$/.test(error) ? all(error as never) : null
  return (
    <section className="mx-auto max-w-[560px] px-3 pt-8 pb-24 sm:pt-14 sm:pb-10">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink">{t('title')}</h1>
      <p className="mt-1 mb-5 px-1 text-[15px] text-mute">{inbox ? t('intro') : t('notLive')}</p>
      {errorText ? (
        <p role="alert" className="mb-3 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
          {errorText}
        </p>
      ) : null}
      <BriefBar as="div" data-floating-hide>
        <InboxList inbox={list} locale={locale} />
      </BriefBar>
    </section>
  )
}
