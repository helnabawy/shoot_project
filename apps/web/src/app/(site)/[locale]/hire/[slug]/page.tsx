import { faqJsonLd, jsonLdScript, serviceJsonLd } from '@shoot/domain/pages'
import { lexicalToText } from '@shoot/domain/content'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getBlockContext } from '@/modules/landing'
import { getIntentPage } from '@/modules/pages/intent'
import { IntentView } from '@/modules/pages/components/IntentView'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { briefLabels } from '@/shared/i18n/server-labels'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

const decode = (slug: string) => {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

async function lookup({ params }: Props) {
  const { locale, slug } = await params
  const { isEnabled: draft } = await draftMode()
  return { locale: locale as Locale, draft, result: await getIntentPage(decode(slug), locale as Locale, { draft }) }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, draft, result } = await lookup(props)
  if (result?.status !== 'found') return {}
  const { page, slugs } = result
  const og = page.seo?.ogImage && typeof page.seo.ogImage === 'object' ? page.seo.ogImage : null
  const title = page.seo?.title || page.title
  const description = page.seo?.description || page.intent?.intro || undefined
  return {
    title,
    description,
    alternates: alternates({ en: `/hire/${slugs.en}`, ar: `/hire/${slugs.ar}` }, locale),
    robots: page.seo?.hideFromSearch || draft ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      type: 'website',
      images: og?.url ? [{ url: og.url, width: og.width ?? undefined, height: og.height ?? undefined, alt: og.alt }] : undefined,
    },
  }
}

export default async function IntentPage(props: Props) {
  const { locale: raw } = await props.params
  setRequestLocale(raw)
  const { locale, result } = await lookup(props)
  if (!result) notFound()
  if (result.status === 'redirect') permanentRedirect(encodeURI(localizeHref(result.redirectTo, locale)))

  const [context, labels, settings] = await Promise.all([getBlockContext(locale), briefLabels(locale), getSiteSettings(locale)])
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const path = localizeHref(`/hire/${result.slugs[locale]}`, locale)
  const jsonLd = [
    faqJsonLd({ locale, items: result.faq.map((f) => ({ question: f.question, answer: lexicalToText(f.answer) })) }),
    serviceJsonLd({ name: result.serviceName, serviceType: result.serviceType, areaServed: result.areaServed, provider: settings.siteName, url: `${base}${path}`, locale }),
  ].filter(Boolean)
  return (
    <>
      <IntentView
        page={result.page}
        locale={locale}
        builder={result.builder}
        preset={result.preset}
        labels={labels}
        creators={result.creators}
        creatorTotal={result.creatorTotal}
        faq={result.faq}
        context={context}
        whatsappHref={whatsappHref(settings.whatsappNumber, settings.whatsappDefaultMessage) ?? '#'}
        quickMatch={settings.quickMatch?.enabled === true}
        sourcePath={path}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} />
    </>
  )
}
