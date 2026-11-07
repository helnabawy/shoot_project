import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GuidesList } from '@/modules/guides/components/GuidesList'
import { getAuthor, listArticles, listCategories } from '@/modules/guides'
import { parsePage } from '@shoot/domain/pages'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

export const revalidate = 60

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const author = await getAuthor(slug, locale as Locale)
  if (!author) return {}
  const page = parsePage((await searchParams).page)
  const t = await getTranslations({ locale, namespace: 'guides' })
  return {
    title: t('authorTitle', { name: author.name }),
    description: author.bio ?? undefined,
    alternates: alternates(page > 1 ? `/guides/author/${slug}?page=${page}` : `/guides/author/${slug}`, locale as Locale),
  }
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { locale: raw, slug } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const requested = parsePage((await searchParams).page)
  const [t, author, categories, list] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), getAuthor(slug, locale), listCategories(locale), listArticles({ locale, page: requested, author: slug })])
  if (!author) notFound()
  const base = `/guides/author/${slug}`
  if (list.pagination.page !== requested) permanentRedirect(localizeHref(list.pagination.page === 1 ? base : `${base}?page=${list.pagination.page}`, locale))
  return <GuidesList title={t('authorTitle', { name: author.name })} intro={author.bio} list={list} categories={categories} basePath={base} locale={locale} />
}
