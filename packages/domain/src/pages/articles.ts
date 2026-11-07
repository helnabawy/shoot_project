import { plainWords } from '../content/richtext'

export const GUIDES_PAGE_SIZE = 12
export const WORDS_PER_MINUTE = 200

export interface LiveCheck {
  _status?: string | null
  publishedAt?: string | null
}

/** An article is live when it is published and its publication time has come (spec US3-S2). */
export function isLive(article: LiveCheck, now: Date): boolean {
  if (article._status !== 'published' || !article.publishedAt) return false
  const at = Date.parse(article.publishedAt)
  return !Number.isNaN(at) && at <= now.getTime()
}

export interface Pagination {
  page: number
  pages: number
  size: number
  /** Rows to skip. */
  offset: number
  hasPrev: boolean
  hasNext: boolean
}

/** A page number from the query string: a positive whole number, else 1. */
export function parsePage(input: string | string[] | undefined): number {
  const value = Array.isArray(input) ? input[0] : input
  return value && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1
}

/** Pages of `size`; a page outside the range is clamped to the nearest one. */
export function paginateArticles(total: number, requested: number, size = GUIDES_PAGE_SIZE): Pagination {
  const pages = Math.max(1, Math.ceil(total / size))
  const page = Math.min(Math.max(1, Math.floor(requested) || 1), pages)
  return { page, pages, size, offset: (page - 1) * size, hasPrev: page > 1, hasNext: page < pages }
}

/** Minutes to read `text`: words at 200 a minute, never less than 1. */
export function readingMinutes(text: string): number {
  return Math.max(1, Math.ceil(plainWords(text) / WORDS_PER_MINUTE))
}

/** True when a localized text has words of its own in the requested language (no fallback). */
export function hasNativeText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export interface RelatedCandidate {
  id: string
  categories: readonly string[]
  publishedAt: string
}

/** Up to `limit` other articles that share a category with `current`, newest first. */
export function relatedArticles<T extends RelatedCandidate>(current: RelatedCandidate, all: readonly T[], limit = 3): T[] {
  const mine = new Set(current.categories)
  return all
    .filter((a) => a.id !== current.id && a.categories.some((c) => mine.has(c)))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit)
}
