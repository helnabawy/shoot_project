import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  buildDirectory,
  CreatorRow,
  creatorPath,
  describeCreator,
  DirectoryFilters,
  DirectoryResults,
  getDirectoryContext,
  getPublicCreators,
  type DirectoryParams,
} from '@/modules/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

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
      <DirectoryResults view={view} items={view.rows.map(toItem)} hasTop={Boolean(top)} />
    </div>
  )
}
