import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getLandingPage } from '@/modules/landing/queries'
import { alternates } from '@/shared/lib/seo'
import { isLocale } from '@/shared/lib/locale'
import { LandingContent } from './_landing/LandingContent'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const landing = await getLandingPage({ locale })
  const og =
    landing.seo?.ogImage && typeof landing.seo.ogImage === 'object' ? landing.seo.ogImage : null
  return {
    title: { absolute: landing.seo?.title || landing.hero?.headline || '' },
    description: landing.seo?.description ?? undefined,
    alternates: alternates('/', locale),
    openGraph: {
      title: landing.seo?.title ?? undefined,
      description: landing.seo?.description ?? undefined,
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      type: 'website',
      images: og?.url
        ? [
            {
              url: og.url,
              width: og.width ?? undefined,
              height: og.height ?? undefined,
              alt: og.alt,
            },
          ]
        : undefined,
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  // The layout's locale guard runs in parallel with this page, so a file-like path that skips
  // the proxy (e.g. /favicon.ico) would otherwise reach the queries with an invalid locale.
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)
  return <LandingContent locale={locale} />
}
