import { buildRss } from '@shoot/domain/pages'
import { hasLocale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { getFeedItems } from '@/modules/guides'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/shared/lib/locale'

export const revalidate = 60

/** RSS 2.0 of the newest live guides that have words of their own in the language of the address. */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return new Response('Not found', { status: 404 })
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const prefix = locale === 'ar' ? '/ar' : ''
  const [t, items] = await Promise.all([getTranslations({ locale, namespace: 'guides' }), getFeedItems(locale as Locale)])
  const xml = buildRss({
    title: t('feedTitle'),
    description: t('intro'),
    link: `${base}${prefix}/guides`,
    selfLink: `${base}${prefix}/guides/feed`,
    language: locale,
    items,
    now: new Date(),
  })
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
