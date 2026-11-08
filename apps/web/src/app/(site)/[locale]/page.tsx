import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { lexicalToText } from '@shoot/domain/content'
import { faqJsonLd, jsonLdScript } from '@shoot/domain/pages'
import { getBriefBuilderConfig } from '@/modules/brief/queries'
import { getSpecialtyCounts } from '@/modules/creators'
import { Hero } from '@/modules/landing/components/Hero'
import { RenderBlocks } from '@/modules/landing/components/RenderBlocks'
import { getLandingPage } from '@/modules/landing/queries'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { briefLabels } from '@/shared/i18n/server-labels'
import { alternates } from '@/shared/lib/seo'
import { isLocale } from '@/shared/lib/locale'

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
  const { isEnabled: draft } = await draftMode()
  const [landing, settings, builder, personas, categories, labels, specialtyCounts] = await Promise.all([
    getLandingPage({ locale, draft }),
    getSiteSettings(locale),
    getBriefBuilderConfig(locale, { draft }),
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    briefLabels(locale),
    getSpecialtyCounts(locale),
  ])
  const contact = {
    whatsappNumber: settings.whatsappNumber,
    whatsappMessage: settings.whatsappDefaultMessage,
    phoneNumber: settings.phoneNumber,
  }

  const faqs = (landing.sections ?? []).flatMap((s) => (s.blockType === 'faq' ? (s.items ?? []) : []))
  const faqLd = faqJsonLd({
    locale,
    items: faqs.map((f) => ({ question: f.question, answer: lexicalToText(f.answer) })),
  })
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: settings.siteName,
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    ...(faqLd ? [faqLd] : []),
  ]

  return (
    <>
      <Hero
        hero={landing.hero}
        builder={builder}
        briefLabels={labels}
        settings={settings}
        personas={personas}
        contact={contact}
        locale={locale}
      />
      <RenderBlocks
        sections={landing.sections}
        context={{ contact, personas, categories, specialtyCounts, locale }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
    </>
  )
}
