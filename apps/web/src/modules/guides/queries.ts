import 'server-only'
import { lexicalToText } from '@shoot/domain/content'
import { GUIDES_PAGE_SIZE, hasNativeText, paginateArticles, readingMinutes, relatedArticles, type FeedItem, type Pagination } from '@shoot/domain/pages'
import type { Where } from 'payload'
import type { Article, ArticleCategory, Author, Media } from '@/payload-types'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

const TAGS = ['articles', 'article-categories', 'authors', 'media']
/** Cache keys follow the clock by the minute, so a scheduled guide appears within a minute of its time. */
const minute = (now: Date) => Math.floor(now.getTime() / 60_000)

export interface CoverImage {
  url: string
  alt: string
  width: number | null
  height: number | null
}

export interface ArticleSummary {
  id: string
  slug: string
  title: string
  summary: string
  publishedAt: string
  /** The reader's language has no text for this guide yet: the English text is shown. */
  translated: boolean
  cover: CoverImage | null
  /** The cover's media document with every stored size, for the app (008 research R9). */
  coverMedia: Media | null
  /** Minutes to read the body, rounded up. */
  readingMinutes: number
  author: { slug: string; name: string } | null
  categories: { slug: string; name: string }[]
}

const asMedia = (value: unknown): Media | null => (value && typeof value === 'object' ? (value as Media) : null)
const cover = (value: unknown): CoverImage | null => {
  const media = asMedia(value)
  const size = media?.sizes?.card?.url ? media.sizes.card : null
  const url = size?.url ?? media?.url
  return media && url ? { url, alt: media.alt ?? '', width: size?.width ?? media.width ?? null, height: size?.height ?? media.height ?? null } : null
}

function summarise(doc: Article, translated: boolean): ArticleSummary {
  const author = doc.author && typeof doc.author === 'object' ? (doc.author as Author) : null
  return {
    id: String(doc.id),
    slug: doc.slug,
    title: doc.title,
    summary: doc.summary,
    publishedAt: doc.publishedAt,
    translated,
    cover: cover(doc.cover),
    coverMedia: asMedia(doc.cover),
    readingMinutes: readingMinutes(lexicalToText(doc.body)),
    author: author ? { slug: author.slug, name: author.name } : null,
    categories: (doc.categories ?? []).flatMap((c) => (typeof c === 'object' ? [{ slug: (c as ArticleCategory).slug, name: (c as ArticleCategory).name }] : [])),
  }
}

const liveContext = (now: Date) => ({ now })

export interface ArticleList {
  items: ArticleSummary[]
  pagination: Pagination
  total: number
}

/** Live guides, newest first, twelve to a page; the page asked for is clamped (the route redirects when it was). */
export function listArticles({ locale, page, category, author, now = new Date() }: { locale: Locale; page: number; category?: string; author?: string; now?: Date }): Promise<ArticleList> {
  return cachedQuery(TAGS, ['guides', locale, page, category ?? '', author ?? '', minute(now)], async () => {
    const payload = await getPayloadClient()
    const where: Where = {
      and: [...(category ? [{ 'categories.slug': { equals: category } }] : []), ...(author ? [{ 'author.slug': { equals: author } }] : [])],
    }
    const read = { collection: 'articles' as const, where, sort: '-publishedAt', limit: GUIDES_PAGE_SIZE, page, depth: 1, overrideAccess: false, context: liveContext(now) }
    const found = await payload.find({ ...read, locale, fallbackLocale: 'en' })
    const pagination = paginateArticles(found.totalDocs, page)
    if (pagination.page !== page) return { items: [], pagination, total: found.totalDocs }
    // Which of these have words of their own in the reader's language (the rest are shown in English, marked).
    let native = new Set<string>(found.docs.map((d) => String(d.id)))
    if (locale !== 'en' && found.docs.length) {
      const own = await payload.find({ ...read, locale, fallbackLocale: false, depth: 0, select: { title: true } })
      native = new Set(own.docs.filter((d) => hasNativeText(d.title)).map((d) => String(d.id)))
    }
    return { items: found.docs.map((d) => summarise(d, native.has(String(d.id)))), pagination, total: found.totalDocs }
  })
}

export interface ArticleDetail extends ArticleSummary {
  body: Article['body']
  updatedAt: string
  seo: Article['seo']
  ogImage: CoverImage | null
}

export interface ArticlePage {
  article: ArticleDetail
  related: ArticleSummary[]
  /** Each language's reader has words of their own for it. */
  nativeIn: Record<Locale, boolean>
}

/** One guide with up to three related ones. Drafts and not-yet-live guides only in preview. */
export function getArticle(slug: string, locale: Locale, { now = new Date(), draft = false }: { now?: Date; draft?: boolean } = {}): Promise<ArticlePage | null> {
  return cachedQuery(
    TAGS,
    ['guide', slug, locale, minute(now)],
    async () => {
      const payload = await getPayloadClient()
      const read = { collection: 'articles' as const, where: { slug: { equals: slug } }, limit: 1, depth: 2, draft, overrideAccess: draft, context: liveContext(now) }
      const found = await payload.find({ ...read, locale, fallbackLocale: 'en' })
      const doc = found.docs[0]
      if (!doc) return null
      const titles = await payload.findByID({ collection: 'articles', id: doc.id, locale: 'all', fallbackLocale: false, depth: 0, draft, overrideAccess: draft, context: liveContext(now), select: { title: true } })
      const byLocale = (titles.title ?? {}) as unknown as Partial<Record<Locale, string>>
      const nativeIn = { en: hasNativeText(byLocale.en), ar: hasNativeText(byLocale.ar) }
      const summary = summarise(doc, locale === 'en' || nativeIn[locale])
      const categoryIds = (doc.categories ?? []).map((c) => (typeof c === 'object' ? c.id : c))
      const others = categoryIds.length
        ? await payload.find({
            collection: 'articles',
            where: { and: [{ 'categories': { in: categoryIds } }, { id: { not_equals: doc.id } }] },
            sort: '-publishedAt',
            limit: 30,
            depth: 1,
            locale,
            fallbackLocale: 'en',
            overrideAccess: false,
            context: liveContext(now),
          })
        : { docs: [] as Article[] }
      const candidates = others.docs.map((d) => summarise(d, true))
      const toCandidate = (a: ArticleSummary) => ({ ...a, categories: a.categories.map((c) => c.slug) })
      const related = relatedArticles(toCandidate(summary), candidates.map(toCandidate), 3).map((r) => candidates.find((c) => c.id === r.id) as ArticleSummary)
      return {
        article: {
          ...summary,
          body: doc.body,
          updatedAt: doc.updatedAt,
          seo: doc.seo,
          ogImage: cover(doc.seo?.ogImage),
        },
        related,
        nativeIn,
      }
    },
    { bypass: draft },
  )
}

export interface CategoryEntry {
  slug: string
  name: string
  description: string | null
  count: number
}

/** Categories with at least one live guide, by name. */
export function listCategories(locale: Locale, now = new Date()): Promise<CategoryEntry[]> {
  return cachedQuery(TAGS, ['guide-categories', locale, minute(now)], async () => {
    const payload = await getPayloadClient()
    const live = await payload.find({ collection: 'articles', depth: 1, limit: 1000, pagination: false, select: { categories: true }, overrideAccess: false, context: liveContext(now), locale, fallbackLocale: 'en' })
    const counts = new Map<string, { category: ArticleCategory; count: number }>()
    for (const doc of live.docs) {
      for (const c of doc.categories ?? []) {
        if (typeof c !== 'object') continue
        const entry = counts.get(c.slug) ?? { category: c as ArticleCategory, count: 0 }
        entry.count += 1
        counts.set(c.slug, entry)
      }
    }
    return [...counts.values()]
      .map(({ category, count }) => ({ slug: category.slug, name: category.name, description: category.description ?? null, count }))
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  })
}

export interface AuthorEntry {
  slug: string
  name: string
  bio: string | null
  photo: CoverImage | null
  /** The photo's media document with every stored size, for the app. */
  photoMedia: Media | null
  count: number
}

/** An author with at least one live guide; null otherwise (their page does not exist). */
export function getAuthor(slug: string, locale: Locale, now = new Date()): Promise<AuthorEntry | null> {
  return cachedQuery(TAGS, ['guide-author', slug, locale, minute(now)], async () => {
    const payload = await getPayloadClient()
    const live = await payload.count({ collection: 'articles', where: { 'author.slug': { equals: slug } }, overrideAccess: false, context: liveContext(now) })
    if (live.totalDocs === 0) return null
    const found = await payload.find({ collection: 'authors', where: { slug: { equals: slug } }, limit: 1, depth: 1, locale, fallbackLocale: 'en', overrideAccess: false })
    const author = found.docs[0]
    return author ? { slug: author.slug, name: author.name, bio: author.bio ?? null, photo: cover(author.photo), photoMedia: asMedia(author.photo), count: live.totalDocs } : null
  })
}

/** The newest live guides that have words of their own in `locale`, for the feed. */
export function getFeedItems(locale: Locale, now = new Date()): Promise<FeedItem[]> {
  return cachedQuery(TAGS, ['guide-feed', locale, minute(now)], async () => {
    const payload = await getPayloadClient()
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const prefix = locale === 'ar' ? '/ar' : ''
    const own = await payload.find({ collection: 'articles', sort: '-publishedAt', limit: 100, depth: 1, locale, fallbackLocale: false, overrideAccess: false, context: liveContext(now) })
    return own.docs
      .filter((d) => hasNativeText(d.title) && hasNativeText(d.summary))
      .slice(0, 20)
      .map((d) => ({
        title: d.title,
        summary: d.summary,
        link: `${base}${prefix}/guides/${d.slug}`,
        publishedAt: d.publishedAt,
        author: d.author && typeof d.author === 'object' ? (d.author as Author).name : null,
      }))
  })
}

export interface GuidesForSitemap {
  articles: { slug: string; updatedAt: string; hideFromSearch: boolean }[]
  categories: string[]
  authors: string[]
}

/** What the sitemap lists: live guides, and the categories and authors that have one. */
export async function listGuidesForSitemap(now = new Date()): Promise<GuidesForSitemap> {
  const payload = await getPayloadClient()
  const live = await payload.find({ collection: 'articles', depth: 1, limit: 2000, pagination: false, select: { slug: true, updatedAt: true, seo: true, categories: true, author: true }, overrideAccess: false, context: liveContext(now) })
  const categories = new Set<string>()
  const authors = new Set<string>()
  for (const d of live.docs) {
    for (const c of d.categories ?? []) if (typeof c === 'object') categories.add((c as ArticleCategory).slug)
    if (d.author && typeof d.author === 'object') authors.add((d.author as Author).slug)
  }
  return {
    articles: live.docs.map((d) => ({ slug: d.slug, updatedAt: d.updatedAt, hideFromSearch: Boolean(d.seo?.hideFromSearch) })),
    categories: [...categories],
    authors: [...authors],
  }
}
