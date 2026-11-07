import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GuidesList } from '@/modules/guides/components/GuidesList'
import { listArticles, listCategories } from '@/modules/guides'
import { parsePage } from '@shoot/domain/pages'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

export const revalidate = 60

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const page = parsePage((await searchParams).page)
  const t = await getTranslations({ locale, namespace: 'guides' })
  const alt = alternates(page > 1 ? `/guides?page=${page}` : '/guides', locale as Locale)
  return {
    title: page > 1 ? t('titlePaged', { page }) : t('title'),
    description: t('intro'),
    alternates: { ...alt, types: { 'application/rss+xml': localizeHref('/guides/feed', locale) } },
  }
}

export default async function GuidesPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const requested = parsePage((await searchParams).page)
  const [t, list, categories] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), listArticles({ locale, page: requested }), listCategories(locale)])
  if (list.pagination.page !== requested) permanentRedirect(localizeHref(list.pagination.page === 1 ? '/guides' : `/guides?page=${list.pagination.page}`, locale))
  return <GuidesList title={t('title')} intro={t('intro')} list={list} categories={categories} basePath="/guides" locale={locale} />
}
