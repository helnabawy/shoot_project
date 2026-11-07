import { normaliseCode } from '@shoot/domain/creators'
import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { creatorPath, getCreatorProfile, ProfileView } from '@/modules/creators'
import { excerpt } from '@/modules/creators/summary'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

type Props = { params: Promise<{ locale: string; code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, code } = await params
  const normalised = normaliseCode(code)
  const page = normalised ? await getCreatorProfile(normalised, locale as Locale) : null
  if (!page) return {}
  const t = await getTranslations({ locale, namespace: 'creators.profile' })
  const { view } = page
  const title = view.types ? t('metaTitle', { name: view.name, types: view.types }) : t('metaTitleNoTypes', { name: view.name })
  const description = excerpt(view.bio, 155) || undefined
  return {
    title,
    description,
    alternates: alternates(`/creators/${view.code.toLowerCase()}`, locale as Locale),
    openGraph: {
      title,
      description,
      type: 'profile',
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      images: view.shareImage ? [{ url: view.shareImage.url, width: view.shareImage.width, height: view.shareImage.height, alt: view.name }] : undefined,
    },
  }
}

export default async function CreatorPage({ params }: Props) {
  const { locale: raw, code } = await params
  setRequestLocale(raw)
  const locale = raw as Locale
  const normalised = normaliseCode(code)
  // Unknown, malformed, paused, suspended and unpublished all look the same: the site's 404.
  const page = normalised ? await getCreatorProfile(normalised, locale) : null
  if (!normalised || !page) notFound()
  // Any other spelling of the code (a prefix, upper case) goes to the one canonical address.
  if (code !== normalised.toLowerCase()) permanentRedirect(creatorPath(normalised, locale))

  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'creators.profile' }), getSiteSettings(locale)])
  const { view, displayCode, canBook } = page
  const askHref = whatsappHref(settings.whatsappNumber, t('askMessage', { name: view.name, code: displayCode })) ?? '#'
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  // Only what is true: no ratings or reviews exist, so none are claimed.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    inLanguage: locale,
    mainEntity: {
      '@type': 'Person',
      name: view.name,
      ...(view.types ? { jobTitle: view.types } : {}),
      ...(view.shareImage ? { image: `${base}${view.shareImage.url}` } : {}),
      ...(view.places.length ? { areaServed: view.places } : {}),
      ...(view.languages.length ? { knowsLanguage: view.languages } : {}),
    },
  }

  return (
    <>
      <ProfileView view={view} displayCode={displayCode} canBook={canBook} bookHref={localizeHref(`/book/${view.code.toLowerCase()}`, locale)} askHref={askHref} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  )
}
