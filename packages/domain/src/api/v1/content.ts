import { z } from 'zod'
import { LEGAL_KINDS } from '../../pages/legal'
import { imageV1, localeV1, paginationV1, richTextV1, sitePathV1 } from './common'
import { sectionV1 } from './landing'

/**
 * Guides, editor-built pages and legal documents (data-model.md "Content"). Every read is of
 * published content only, scheduled guides from their time; drafts stay on the website's preview.
 */

/** A page number as the query sends it: an integer from 1, as a string. */
const pageNumberV1 = z.string().regex(/^[1-9]\d{0,5}$/)
/** A slug as the path carries it. */
const slugV1 = z.string().min(1).max(200)

export const guidesRequestV1 = z.object({
  query: z.object({ page: pageNumberV1.optional(), category: slugV1.optional(), author: slugV1.optional() }),
})

const slugNameV1 = z.object({ slug: z.string(), name: z.string() })

export const articleSummaryV1 = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  cover: imageV1.nullable(),
  publishedAt: z.iso.datetime(),
  readingMinutes: z.int().positive(),
  categories: z.array(slugNameV1),
  author: slugNameV1.nullable(),
  /** False when the answer's language has no text for this guide yet and the English is sent. */
  inRequestedLanguage: z.boolean(),
})
export type ArticleSummaryV1 = z.infer<typeof articleSummaryV1>

export const guideListV1 = z.object({
  locale: localeV1,
  items: z.array(articleSummaryV1),
  pagination: paginationV1,
  /** Categories with at least one live guide, by name. */
  categories: z.array(z.object({ slug: z.string(), name: z.string(), description: z.string().nullable(), count: z.int().nonnegative() })),
  /** The category the list is narrowed to (`?category=`), else `null`. */
  category: z.object({ slug: z.string(), name: z.string(), description: z.string().nullable() }).nullable(),
  /** The author the list is narrowed to (`?author=`), else `null`. */
  author: z.object({ slug: z.string(), name: z.string(), bio: z.string().nullable(), photo: imageV1.nullable() }).nullable(),
})
export type GuideListV1 = z.infer<typeof guideListV1>

export const guideRequestV1 = z.object({ params: z.object({ slug: slugV1 }) })

export const articleV1 = articleSummaryV1.extend({
  body: richTextV1,
  /** Up to three guides sharing a category. */
  related: z.array(articleSummaryV1),
})
export type ArticleV1 = z.infer<typeof articleV1>

export const pageRequestV1 = z.object({ params: z.object({ slug: slugV1 }) })

export const pageV1 = z.object({
  locale: localeV1,
  /** The page's current address in the answer's language; differs from the request after a rename. */
  path: sitePathV1,
  title: z.string(),
  sections: z.array(sectionV1),
})
export type PageV1 = z.infer<typeof pageV1>

export const legalKindV1 = z.enum(LEGAL_KINDS)
export type LegalKindV1 = z.infer<typeof legalKindV1>

/** A version number in the path: 1 to 9999. */
export const legalVersionNumberV1 = z.string().regex(/^[1-9]\d{0,3}$/)

export const legalRequestV1 = z.object({ params: z.object({ kind: legalKindV1 }) })
export const legalVersionRequestV1 = z.object({ params: z.object({ kind: legalKindV1, version: legalVersionNumberV1 }) })

export const legalVersionV1 = z.object({
  locale: localeV1,
  kind: legalKindV1,
  title: z.string(),
  version: z.int().positive(),
  effectiveFrom: z.iso.datetime(),
  /** When the next version took over; `null` for the latest. */
  until: z.iso.datetime().nullable(),
  body: richTextV1,
  inRequestedLanguage: z.boolean(),
})
export type LegalVersionV1 = z.infer<typeof legalVersionV1>

export const legalDocumentV1 = legalVersionV1.extend({
  /** A published version that starts later, announced with the current one. */
  upcoming: z.object({ version: z.int().positive(), effectiveFrom: z.iso.datetime() }).nullable(),
})
export type LegalDocumentV1 = z.infer<typeof legalDocumentV1>

export const legalVersionsV1 = z.object({
  locale: localeV1,
  kind: legalKindV1,
  title: z.string(),
  /** Newest first. */
  versions: z.array(
    z.object({ version: z.int().positive(), from: z.iso.datetime(), until: z.iso.datetime().nullable(), changeSummary: z.string().nullable() }),
  ),
})
export type LegalVersionsV1 = z.infer<typeof legalVersionsV1>
