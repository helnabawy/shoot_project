import { draftMode } from 'next/headers'
import { lexicalToText } from '@shoot/domain/content'
import { faqJsonLd, jsonLdScript } from '@shoot/domain/pages'
import { getBriefBuilderConfig } from '@/modules/brief/queries'
import { networkSelection } from '@shoot/domain/creators'
import {
  creatorPath,
  describeCreator,
  getDirectoryContext,
  getPublicCreators,
  getSpecialtyCounts,
} from '@/modules/creators'
import { Hero } from '@/modules/landing/components/Hero'
import { RenderBlocks } from '@/modules/landing/components/RenderBlocks'
import { getLandingPage } from '@/modules/landing/queries'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { briefLabels } from '@/shared/i18n/server-labels'
import type { Locale } from '@/shared/lib/locale'

/**
 * The landing page's content (feature 023 moved it out of the page unchanged): the hero with its brief
 * builder and the CMS sections. The static page renders it for everyone; the creator home route renders it
 * when its session check finds the visitor is not a creator after all.
 */
export async function LandingContent({ locale }: { locale: Locale }) {
  const { isEnabled: draft } = await draftMode()
  const [landing, settings, builder, personas, categories, labels, specialtyCounts, publicCreators, directory] = await Promise.all([
    getLandingPage({ locale, draft }),
    getSiteSettings(locale),
    getBriefBuilderConfig(locale, { draft }),
    getActivePersonas(locale),
    getCategoriesForAudience(locale),
    briefLabels(locale),
    getSpecialtyCounts(locale),
    getPublicCreators(locale),
    getDirectoryContext(locale),
  ])
  // The hero's creator columns (design 41): the same rule as the network block, creators with work only.
  const heroCreators = networkSelection(publicCreators, 'featuredThenNewest', 8).map((creator) => ({
    creator,
    view: describeCreator(creator, directory.lookups, directory.prefix, locale),
    href: creatorPath(creator.code, locale),
  }))
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
        creators={heroCreators}
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
