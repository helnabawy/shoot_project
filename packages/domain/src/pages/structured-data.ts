export interface FaqItem {
  question?: string | null
  /** The answer as plain text. */
  answer?: string | null
}

/** schema.org FAQPage for the items that have both a question and an answer; null when none do. */
export function faqJsonLd({ items, locale }: { items: readonly FaqItem[]; locale: string }) {
  const entries = items.filter((i) => i.question?.trim() && i.answer?.trim())
  if (entries.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: entries.map((i) => ({
      '@type': 'Question',
      name: (i.question as string).trim(),
      acceptedAnswer: { '@type': 'Answer', text: (i.answer as string).trim() },
    })),
  }
}

/** JSON for an inline `application/ld+json` script: `<` is escaped so content can never close the tag. */
export function jsonLdScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export interface ArticleLd {
  headline: string
  description?: string | null
  url: string
  datePublished: string
  dateModified?: string | null
  author?: string | null
  image?: string | null
  locale: string
}

/** schema.org Article for a guide. */
export function articleJsonLd(a: ArticleLd) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    ...(a.description ? { description: a.description } : {}),
    mainEntityOfPage: a.url,
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    ...(a.author ? { author: { '@type': 'Person', name: a.author } } : {}),
    ...(a.image ? { image: a.image } : {}),
    inLanguage: a.locale,
  }
}

export interface ServiceLd {
  name: string
  serviceType?: string | null
  areaServed?: string | null
  provider: string
  url: string
  locale: string
}

/** schema.org Service for an intent page, offered by the site's organisation. */
export function serviceJsonLd(s: ServiceLd) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    url: s.url,
    ...(s.serviceType ? { serviceType: s.serviceType } : {}),
    ...(s.areaServed ? { areaServed: s.areaServed } : {}),
    provider: { '@type': 'Organization', name: s.provider },
    inLanguage: s.locale,
  }
}
