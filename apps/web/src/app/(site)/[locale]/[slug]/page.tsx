import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound, permanentRedirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getBlockContext } from '@/modules/landing'
import { getPageBySlug } from '@/modules/pages'
import { PageView } from '@/modules/pages/components/PageView'
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
  const result = await getPageBySlug(decode(slug), locale as Locale, { draft })
  return { locale: locale as Locale, draft, result }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, draft, result } = await lookup(props)
  if (result?.status !== 'found') return {}
  const { page, slugs } = result
  const og = page.seo?.ogImage && typeof page.seo.ogImage === 'object' ? page.seo.ogImage : null
  const title = page.seo?.title || page.title
  const description = page.seo?.description ?? undefined
  return {
    title,
    description,
    alternates: alternates({ en: `/${slugs.en}`, ar: `/${slugs.ar}` }, locale),
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

export default async function EditorPage(props: Props) {
  const { locale: raw } = await props.params
  setRequestLocale(raw)
  const { locale, result } = await lookup(props)
  if (!result) notFound()
  if (result.status === 'redirect') permanentRedirect(encodeURI(localizeHref(result.redirectTo, locale)))
  const context = await getBlockContext(locale)
  return <PageView page={result.page} context={context} />
}
