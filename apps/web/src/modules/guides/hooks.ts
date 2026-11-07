import { APIError, type CollectionAfterChangeHook, type CollectionAfterDeleteHook, type CollectionBeforeDeleteHook, type CollectionBeforeValidateHook } from 'payload'
import { recordRemovedPath } from '@/modules/pages/removed'
import { safeRevalidate } from '@/shared/payload/hooks/revalidate'

/** Words that are guide routes themselves: an article cannot take them as an address. */
export const RESERVED_ARTICLE_SLUGS = ['feed', 'category', 'author'] as const

/** An editor who presses Publish without choosing a time means "now". */
export const prepareArticle: CollectionBeforeValidateHook = ({ data, originalDoc }) => {
  if (!data) return data
  if (data._status === 'published' && !data.publishedAt && !originalDoc?.publishedAt) {
    return { ...data, publishedAt: new Date().toISOString() }
  }
  return data
}

export const afterArticleChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!req.context?.disableRevalidate) {
    safeRevalidate('articles')
    safeRevalidate('authors')
  }
  return doc
}

/** A deleted guide that was ever public leaves its address marked as removed (one address for both languages). */
export const beforeArticleDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  try {
    const doc = await req.payload.findByID({ collection: 'articles', id, draft: false, depth: 0, select: { slug: true, _status: true }, overrideAccess: true })
    if (doc._status === 'published') req.context.removedArticle = doc.slug
  } catch (error) {
    throw new APIError(`Could not read the guide before deleting it: ${(error as Error).message}`, 500, undefined, true)
  }
}

export const afterArticleDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const slug = req.context?.removedArticle as string | undefined
  if (slug) await recordRemovedPath(req.payload, { kind: 'article', paths: { en: `/guides/${slug}`, ar: `/guides/${slug}` } })
  if (!req.context?.disableRevalidate) {
    safeRevalidate('articles')
    safeRevalidate('authors')
  }
  return doc
}
