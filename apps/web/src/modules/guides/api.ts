import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { parsePage } from '@shoot/domain/pages'
import { defineHandler, problem } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import { getArticle, getAuthor, listArticles, listCategories } from './queries'
import { toWireArticle, toWireGuideList } from './wire'

/**
 * `GET /api/mobile/v1/guides`: live guides newest first, optionally narrowed to a category or an
 * author (FR-027). An unknown category or author is a 404; a page past the end answers the last one.
 */
export const getGuidesV1 = defineHandler({
  ...endpoints.guides,
  run: async (ctx, { query }) => {
    const { locale } = ctx
    const now = ctx.now()
    const requested = parsePage(query.page)
    const [categories, author] = await Promise.all([listCategories(locale, now), query.author ? getAuthor(query.author, locale, now) : Promise.resolve(null)])
    const category = query.category ? (categories.find((c) => c.slug === query.category) ?? null) : null
    if ((query.category && !category) || (query.author && !author)) return problem(404, 'api.errors.notFound')
    const narrow = { locale, category: query.category, author: query.author, now }
    let list = await listArticles({ ...narrow, page: requested })
    if (list.pagination.page !== requested) list = await listArticles({ ...narrow, page: list.pagination.page })
    return toWireGuideList({ list, categories, category, author }, wireContext(locale))
  },
})

/** `GET /api/mobile/v1/guides/{slug}`: one live guide (never a draft, scheduled ones from their time). */
export const getGuideV1 = defineHandler({
  ...endpoints.guide,
  run: async (ctx, { params }) => {
    const found = await getArticle(params.slug, ctx.locale, { now: ctx.now() })
    return found ? toWireArticle(found, wireContext(ctx.locale)) : problem(404, 'api.errors.notFound')
  },
})
