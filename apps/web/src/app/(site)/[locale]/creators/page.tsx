import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  buildDirectory,
  CreatorList,
  CreatorRow,
  creatorPath,
  describeCreator,
  DirectoryFilters,
  getDirectoryContext,
  getPublicCreators,
  type DirectoryParams,
} from '@/modules/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'
import { RowContent, rowClass } from '@/shared/ui/bar'
import { ChevronIcon } from '@/shared/ui/icons'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<DirectoryParams> }

const isFiltered = (p: DirectoryParams) => Boolean(p.type || p.specialty || p.place || (Number(p.page) > 1))

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'creators.directory' })
  return {
    title: t('title'),
    description: t('metaDescription'),
    alternates: alternates('/creators', locale as Locale),
    // A filtered or paged list is a view of the same content, not a page of its own.
    robots: isFiltered(await searchParams) ? { index: false, follow: true } : undefined,
  }
}

export default async function CreatorsPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const [t, creators, context, query] = await Promise.all([
    getTranslations({ locale, namespace: 'creators.directory' }),
    getPublicCreators(locale),
    getDirectoryContext(locale),
    searchParams,
  ])
  const view = buildDirectory({ creators, context, params: query, locale })
  const toItem = (creator: (typeof creators)[number]) => ({
    creator,
    view: describeCreator(creator, context.lookups, context.prefix, locale),
    href: creatorPath(creator.code, locale),
  })
  const top = view.topHit ? toItem(view.topHit) : null

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="px-3 pt-8 sm:pt-14">
        <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{t('title')}</h1>
        <p className="mt-2 mb-5 px-1 text-[15px] text-mute">{t('intro')}</p>
        <DirectoryFilters
          groups={view.groups}
          tokens={view.tokens}
          clearHref={view.clearHref}
          topHit={top ? <CreatorRow {...top} tone="hit" showSpecialties /> : null}
          message={creators.length === 0 ? 'empty' : view.total === 0 ? 'noMatch' : null}
          briefHref={localizeHref('/', locale)}
        />
      </div>
      <div className="px-4 pt-10">
        {view.rows.length ? (
          <>
            {top ? <p className="group-label pb-2">{t('everyone')}</p> : null}
            <CreatorList items={view.rows.map(toItem)} label={t('resultsLabel')} testId="directory-list" showSpecialties />
          </>
        ) : null}
        {view.pages > 1 ? (
          <nav aria-label={t('resultsLabel')} data-testid="directory-pagination" className="mt-4 -mx-2 grid gap-1">
            {view.prevHref ? (
              <Link href={view.prevHref} rel="prev" className={rowClass('open')}>
                <RowContent glyph={<ChevronIcon width={16} height={16} className="rotate-180" />} label={t('previous')} />
              </Link>
            ) : null}
            <p className="px-4 text-center text-[13px] text-mute tabular-nums">{t('page', { page: view.page, pages: view.pages })}</p>
            {view.nextHref ? (
              <Link href={view.nextHref} rel="next" className={rowClass('open')}>
                <RowContent glyph={<ChevronIcon width={16} height={16} />} label={t('next')} />
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  )
}
