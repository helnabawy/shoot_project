import { getFormatter, getTranslations } from 'next-intl/server'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { ArticleCard } from './ArticleCard'
import { CategoryNav } from './CategoryNav'
import { Pagination } from './Pagination'
import type { ArticleList, CategoryEntry } from '../queries'

/** The listing shared by /guides, a category and an author. */
export async function GuidesList({
  title,
  intro,
  list,
  categories,
  activeCategory,
  basePath,
  locale,
}: {
  title: string
  intro?: string | null
  list: ArticleList
  categories: CategoryEntry[]
  activeCategory?: string
  /** Address of the list without a page query, language-neutral. */
  basePath: string
  locale: Locale
}) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), getFormatter({ locale })])
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'long', timeZone: 'Asia/Dubai' })
  const hrefFor = (n: number) => localizeHref(n === 1 ? basePath : `${basePath}?page=${n}`, locale)
  return (
    <section className="mx-auto max-w-[680px] px-4 pt-10 sm:pt-14" data-testid="guides-list">
      <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{title}</h1>
      {intro ? <p className="mt-2 text-[15px] text-mute">{intro}</p> : null}
      <div className="mt-5">
        <CategoryNav categories={categories} active={activeCategory} locale={locale} labels={{ nav: t('categories'), all: t('all') }} />
      </div>
      {list.items.length ? (
        <div className="relative mt-2 divide-y divide-hair">
          {list.items.map((article, i) => (
            <div key={article.id} className="relative">
              <ArticleCard article={article} locale={locale} date={date(article.publishedAt)} eager={i === 0} labels={{ availableInEnglish: t('availableInEnglish'), by: (name) => t('by', { name }) }} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-mute">{t('empty')}</p>
      )}
      <Pagination
        pagination={list.pagination}
        hrefFor={hrefFor}
        labels={{ nav: t('pages'), previous: t('previous'), next: t('next'), pageOf: t('pageOf', { page: list.pagination.page, pages: list.pagination.pages }) }}
      />
      <p className="mt-10 text-[14px] text-mute">
        <a href={localizeHref('/guides/feed', locale)} className="underline">
          {t('feed')}
        </a>
      </p>
    </section>
  )
}
