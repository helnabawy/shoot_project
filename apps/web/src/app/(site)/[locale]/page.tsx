import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { setRequestLocale } from 'next-intl/server'
import { getBriefBuilderConfig } from '@/modules/brief/queries'
import { Hero } from '@/modules/landing/components/Hero'
import { RenderBlocks } from '@/modules/landing/components/RenderBlocks'
import { getLandingPage } from '@/modules/landing/queries'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { briefLabels } from '@/shared/i18n/server-labels'
import { alternates } from '@/shared/lib/seo'
import type { Locale } from '@/shared/lib/locale'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const landing = await getLandingPage({ locale: locale as Locale })
  const og =
    landing.seo?.ogImage && typeof landing.seo.ogImage === 'object' ? landing.seo.ogImage : null
  return {
    title: { absolute: landing.seo?.title || landing.hero?.headline || '' },
    description: landing.seo?.description ?? undefined,
    alternates: alternates('/', locale as Locale),
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
  const { locale: raw } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const { isEnabled: draft } = await draftMode()
  const [landing, settings, builder, personas, categories, labels] = await Promise.all([
    getLandingPage({ locale, draft }),
    getSiteSettings(locale),
    getBriefBuilderConfig(locale, { draft }),
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    briefLabels(locale),
  ])
  const contact = {
    whatsappNumber: settings.whatsappNumber,
    whatsappMessage: settings.whatsappDefaultMessage,
    phoneNumber: settings.phoneNumber,
  }

  const faqs = (landing.sections ?? []).flatMap((s) =>
    s.blockType === 'faq' ? (s.items ?? []) : [],
  )
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: settings.siteName,
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    ...(faqs.length
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: locale,
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text:
                  JSON.stringify(f.answer ?? '')
                    .match(/"text":"([^"]*)"/g)
                    ?.map((m) => m.slice(8, -1))
                    .join(' ') ?? '',
              },
            })),
          },
        ]
      : []),
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
        context={{ contact, personas, categories, locale }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </>
  )
}
