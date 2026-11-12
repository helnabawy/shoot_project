import type { ArticleSummaryV1, ArticleV1, GuideListV1 } from '@shoot/domain/api/v1'
import { toWireImage, toWireRichText, type WireContext } from '@/shared/api/wire'
import type { ArticleList, ArticlePage, ArticleSummary, AuthorEntry, CategoryEntry } from './queries'

/** A guide as a list row: the cover with every size, and whether its words are in the answer's language. */
export function toWireArticleSummary(article: ArticleSummary, ctx: WireContext): ArticleSummaryV1 {
  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    cover: toWireImage(article.coverMedia ?? article.cover, ctx.base),
    publishedAt: new Date(article.publishedAt).toISOString(),
    readingMinutes: article.readingMinutes,
    categories: article.categories.map((c) => ({ slug: c.slug, name: c.name })),
    author: article.author ? { slug: article.author.slug, name: article.author.name } : null,
    inRequestedLanguage: article.translated,
  }
}

/** One guide with its body as v1 rich text and up to three related guides. */
export function toWireArticle(page: ArticlePage, ctx: WireContext): ArticleV1 {
  return {
    ...toWireArticleSummary(page.article, ctx),
    body: toWireRichText(page.article.body, ctx.base),
    related: page.related.map((r) => toWireArticleSummary(r, ctx)),
  }
}

export interface GuideListInput {
  list: ArticleList
  categories: readonly CategoryEntry[]
  /** The category the list is narrowed to, when it is. */
  category: CategoryEntry | null
  author: AuthorEntry | null
}

/** The guides list, its categories and, when narrowed, the category or author it is narrowed to. */
export function toWireGuideList({ list, categories, category, author }: GuideListInput, ctx: WireContext): GuideListV1 {
  return {
    locale: ctx.locale,
    items: list.items.map((a) => toWireArticleSummary(a, ctx)),
    pagination: { page: list.pagination.page, pageCount: list.total === 0 ? 0 : list.pagination.pages, total: list.total, pageSize: list.pagination.size },
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description, count: c.count })),
    category: category ? { slug: category.slug, name: category.name, description: category.description } : null,
    author: author ? { slug: author.slug, name: author.name, bio: author.bio, photo: toWireImage(author.photoMedia ?? author.photo, ctx.base) } : null,
  }
}
