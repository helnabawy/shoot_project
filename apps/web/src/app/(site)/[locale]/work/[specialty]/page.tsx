import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  buildDirectory,
  countsLine,
  CreatorRow,
  creatorPath,
  describeCreator,
  DirectoryFilters,
  DirectoryResults,
  getDirectoryContext,
  getSpecialtyPage,
  SpecialtyHeader,
  SpecialtySamples,
  type DirectoryParams,
} from '@/modules/creators'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string; specialty: string }>; searchParams: Promise<DirectoryParams> }

/** A narrowed or paged list is a view of the same page, and a page with nobody on it is not worth indexing. */
const isNarrowed = (p: DirectoryParams) => Boolean(p.type || p.place || Number(p.page) > 1)

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, specialty } = await params
  const page = await getSpecialtyPage(specialty, locale as Locale)
  if (!page) return {}
  const t = await getTranslations({ locale, namespace: 'creators.specialty' })
  const title = page.title || t('titleFallback', { name: page.category.name })
  const description = page.description || t('metaFallback', { name: page.category.name })
  return {
    title,
    description,
    alternates: alternates(`/work/${page.category.slug}`, locale as Locale),
    openGraph: { title, description, locale: locale === 'ar' ? 'ar_AE' : 'en_AE' },
    robots: page.creators.length === 0 || isNarrowed(await searchParams) ? { index: false, follow: true } : undefined,
  }
}

export default async function SpecialtyPage({ params, searchParams }: Props) {
  const { locale: raw, specialty } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const [page, context, query, t] = await Promise.all([
    getSpecialtyPage(specialty, locale),
    getDirectoryContext(locale),
    searchParams,
    getTranslations({ locale, namespace: 'creators.specialty' }),
  ])
  // Unknown, inactive and out-of-audience specialties look like any other missing page.
  if (!page) notFound()

  const view = buildDirectory({ creators: page.creators, context, params: { ...query, specialty: undefined }, locale, base: `/work/${page.category.slug}`, fixed: { specialty: page.category.slug } })
  const toItem = (creator: (typeof page.creators)[number]) => ({
    creator,
    view: describeCreator(creator, context.lookups, context.prefix, locale),
    href: creatorPath(creator.code, locale),
  })
  const top = view.topHit ? toItem(view.topHit) : null
  const counts = countsLine((key, values) => t(key, values), page.counts)

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="px-3 pt-8 sm:pt-14">
        <SpecialtyHeader title={page.title || t('titleFallback', { name: page.category.name })} intro={page.intro} counts={counts} />
        <div className="mt-5">
          <DirectoryFilters
            groups={view.groups}
            tokens={view.tokens}
            clearHref={view.clearHref}
            topHit={top ? <CreatorRow {...top} tone="hit" showSpecialties /> : null}
            message={page.creators.length === 0 ? 'empty' : view.total === 0 ? 'noMatch' : null}
            briefHref={localizeHref('/', locale)}
          />
        </div>
      </div>
      <DirectoryResults view={view} items={view.rows.map(toItem)} hasTop={Boolean(top)} />
      <div className="px-4 pb-16">
        <SpecialtySamples samples={page.samples.map(({ code, creatorId: _creatorId, ...sample }) => ({ ...sample, href: creatorPath(code, locale) }))} />
      </div>
    </div>
  )
}
