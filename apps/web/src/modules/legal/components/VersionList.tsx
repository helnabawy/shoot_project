import { getFormatter, getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

/** Every published version of a document with the period it applied. */
export async function VersionList({
  title,
  versions,
  basePath,
  locale,
}: {
  title: string
  versions: { version: number; from: string; until: string | null; changeSummary: string | null }[]
  basePath: string
  locale: Locale
}) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: 'legal' }), getFormatter({ locale })])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long', timeZone: 'Asia/Dubai' })
  return (
    <section className="mx-auto max-w-[680px] px-4 pt-10 sm:pt-14" data-testid="legal-versions">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{t('versionsTitle', { title })}</h1>
      <ol className="mt-6 divide-y divide-hair border-y border-hair">
        {versions.map((v) => (
          <li key={v.version} className="py-4">
            <Link href={localizeHref(`${basePath}/versions/${v.version}`, locale)} className="font-medium text-ink underline">
              {t('versionLabel', { version: v.version })}
            </Link>
            <p className="mt-1 text-[14px] text-mute">
              {t('period', { from: date(v.from), until: v.until ? date(v.until) : t('stillInForce') })}
            </p>
            {v.changeSummary ? <p className="mt-1 text-[14px] text-ink">{v.changeSummary}</p> : null}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[14px]">
        <Link href={localizeHref(basePath, locale)} className="underline">
          {t('backToCurrent')}
        </Link>
      </p>
    </section>
  )
}
