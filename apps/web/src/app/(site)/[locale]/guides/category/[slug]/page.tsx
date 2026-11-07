import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GuidesList } from '@/modules/guides/components/GuidesList'
import { listArticles, listCategories } from '@/modules/guides'
import { parsePage } from '@shoot/domain/pages'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

export const revalidate = 60

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const category = (await listCategories(locale as Locale)).find((c) => c.slug === slug)
  if (!category) return {}
  const page = parsePage((await searchParams).page)
  const t = await getTranslations({ locale, namespace: 'guides' })
  return {
    title: page > 1 ? t('titlePaged', { page }) + ` · ${category.name}` : t('categoryTitle', { name: category.name }),
    description: category.description ?? t('intro'),
    alternates: alternates(page > 1 ? `/guides/category/${slug}?page=${page}` : `/guides/category/${slug}`, locale as Locale),
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale: raw, slug } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const requested = parsePage((await searchParams).page)
  const [t, categories, list] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), listCategories(locale), listArticles({ locale, page: requested, category: slug })])
  const category = categories.find((c) => c.slug === slug)
  if (!category) notFound()
  const base = `/guides/category/${slug}`
  if (list.pagination.page !== requested) permanentRedirect(localizeHref(list.pagination.page === 1 ? base : `${base}?page=${list.pagination.page}`, locale))
  return <GuidesList title={t('categoryTitle', { name: category.name })} intro={category.description} list={list} categories={categories} activeCategory={slug} basePath={base} locale={locale} />
}
