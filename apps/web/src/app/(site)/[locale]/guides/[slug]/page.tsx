import { articleJsonLd, jsonLdScript } from '@shoot/domain/pages'
import { lexicalToText } from '@shoot/domain/content'
import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { ArticleView } from '@/modules/guides/components/ArticleView'
import { getArticle } from '@/modules/guides'
import { getSiteSettings } from '@/modules/site-settings/queries'
import type { Locale } from '@/shared/lib/locale'
import { alternates } from '@/shared/lib/seo'

export const revalidate = 60

type Props = { params: Promise<{ locale: string; slug: string }> }

async function lookup({ params }: Props) {
  const { locale, slug } = await params
  const { isEnabled: draft } = await draftMode()
  return { locale: locale as Locale, slug, draft, page: await getArticle(slug, locale as Locale, { draft }) }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug, draft, page } = await lookup(props)
  if (!page) return {}
  const { article } = page
  const title = article.seo?.title || article.title
  const description = article.seo?.description || article.summary
  const image = article.ogImage ?? article.cover
  return {
    title,
    description,
    alternates: alternates(`/guides/${slug}`, locale),
    robots: article.seo?.hideFromSearch || draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'article',
      title,
      description,
      locale: locale === 'ar' ? 'ar_AE' : 'en_AE',
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: article.author ? [article.author.name] : undefined,
      images: image ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt }] : undefined,
    },
  }
}

export default async function GuidePage(props: Props) {
  const { locale: raw } = await props.params
  setRequestLocale(raw)
  const { locale, slug, page } = await lookup(props)
  if (!page) notFound()
  const settings = await getSiteSettings(locale)
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const { article } = page
  const ld = articleJsonLd({
    headline: article.title,
    description: article.summary || lexicalToText(article.body).slice(0, 160),
    url: `${base}${locale === 'ar' ? '/ar' : ''}/guides/${slug}`,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: article.author?.name,
    image: article.cover ? new URL(article.cover.url, base).toString() : null,
    locale,
  })
  return (
    <>
      <ArticleView
        article={article}
        related={page.related}
        locale={locale}
        contact={{ whatsappNumber: settings.whatsappNumber, whatsappMessage: settings.whatsappDefaultMessage, phoneNumber: settings.phoneNumber }}
        english={locale !== 'en' && !page.nativeIn[locale]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
    </>
  )
}
