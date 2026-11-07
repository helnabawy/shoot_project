import { getFormatter, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { RichContent } from '@/shared/ui/RichContent'
import type { LegalVersionView, LegalView as LegalViewData } from '../queries'

type Props = { view: LegalViewData | LegalVersionView; locale: Locale; basePath: string; archive?: boolean }

const isCurrent = (view: Props['view']): view is LegalViewData => 'upcoming' in view

/** A legal document at its fixed address, or one earlier version read as it stood. */
export async function LegalView({ view, locale, basePath, archive = false }: Props) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: 'legal' }), getFormatter({ locale })])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long', timeZone: 'Asia/Dubai' })
  return (
    <article className="mx-auto max-w-[680px] px-4 pt-10 sm:pt-14" data-testid="legal-view">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{view.title}</h1>
      <p className="mt-2 text-[14px] text-mute">
        {archive
          ? t('versionPeriod', { version: view.version, from: date(view.effectiveFrom), until: view.until ? date(view.until) : t('stillInForce') })
          : t('versionLine', { version: view.version, date: date(view.effectiveFrom) })}
      </p>
      {isCurrent(view) && view.upcoming ? (
        <p className="mt-4 rounded-md bg-selected px-3 py-2 text-[14px] text-selected-ink" role="note">
          {t('appliesFrom', { version: view.upcoming.version, date: date(view.upcoming.effectiveFrom) })}
        </p>
      ) : null}
      {locale === 'ar' && view.fallback ? (
        <p className="mt-4 rounded-md bg-selected px-3 py-2 text-[14px] text-selected-ink" role="note">
          {t('arabicUnavailable')}
        </p>
      ) : locale === 'ar' ? (
        <p className="mt-4 text-[14px] text-mute" role="note">
          {t('englishGoverns')}
        </p>
      ) : null}
      <div className="mt-6" lang={view.fallback ? 'en' : undefined} dir={view.fallback ? 'ltr' : undefined}>
        <RichContent data={view.body as never} locale={locale} />
      </div>
      {!archive && isCurrent(view) && view.hasEarlier ? (
        <p className="mt-8 text-[14px]">
          <Link href={localizeHref(`${basePath}/versions`, locale)} className="underline">
            {t('previousVersions')}
          </Link>
        </p>
      ) : null}
      {archive ? (
        <p className="mt-8 text-[14px]">
          <Link href={localizeHref(`${basePath}/versions`, locale)} className="underline">
            {t('allVersions')}
          </Link>
        </p>
      ) : null}
    </article>
  )
}
