import { z } from 'zod'
import { linkTarget } from '../../content/links'

/**
 * Shapes shared by every v1 answer (data-model.md "Common shapes", research R8).
 * Ids are strings, dates ISO 8601 UTC, optional values `null` (never absent), lists never `null`.
 */

export const localeV1 = z.enum(['en', 'ar'])
export type LocaleV1 = z.infer<typeof localeV1>

const positiveInt = z.int().positive()
const absoluteUrl = z.string().regex(/^https?:\/\/\S+$/)

/** A site path without language prefix: "/creators", never "/ar/creators" or "//host". */
export const SITE_PATH = /^\/(?![/\\])(?!(?:ar|en)(?:[/?#]|$))\S*$/
export const sitePathV1 = z.string().regex(SITE_PATH)

export const imageSizeV1 = z.object({ url: absoluteUrl, width: positiveInt, height: positiveInt })

/** An image with every stored size, smallest first, so the app picks per device (R9). */
export const imageV1 = z.object({
  /** "" marks a decorative image. */
  alt: z.string(),
  width: positiveInt,
  height: positiveInt,
  sizes: z
    .array(imageSizeV1)
    .min(1)
    .refine((sizes) => sizes.every((s, i) => i === 0 || s.width > (sizes[i - 1] as { width: number }).width), {
      message: 'sizes must be ascending by width with unique widths',
    }),
})
export type ImageV1 = z.infer<typeof imageV1>

export const linkV1 = z.object({ label: z.string(), path: sitePathV1 })
export type LinkV1 = z.infer<typeof linkV1>

export const externalLinkV1 = z.object({ label: z.string(), url: z.string().regex(/^(https?:\/\/|mailto:|tel:)\S+$/i) })
export type ExternalLinkV1 = z.infer<typeof externalLinkV1>

/** A link's `href` is what `linkTarget` keeps: a site path or a web, mail or phone address (R10). */
const hrefV1 = z.string().refine((v) => linkTarget(v) === v, { message: 'href must be a site path or a web, mail or phone address' })

export const textInlineV1 = z.object({
  type: z.literal('text'),
  text: z.string(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.boolean(),
  code: z.boolean(),
})
export const inlineV1 = z.discriminatedUnion('type', [
  textInlineV1,
  z.object({ type: z.literal('link'), href: hrefV1, children: z.array(textInlineV1) }),
  z.object({ type: z.literal('lineBreak') }),
])
export type TextInlineV1 = z.infer<typeof textInlineV1>
export type InlineV1 = z.infer<typeof inlineV1>

export type BlockV1 =
  | { type: 'paragraph'; children: InlineV1[] }
  | { type: 'heading'; level: 2 | 3 | 4; children: InlineV1[] }
  | { type: 'list'; ordered: boolean; items: BlockV1[][] }
  | { type: 'quote'; children: InlineV1[] }
  | { type: 'image'; image: ImageV1 }

const listBlockV1 = z.object({
  type: z.literal('list'),
  ordered: z.boolean(),
  get items(): z.ZodArray<z.ZodArray<typeof blockV1>> {
    return z.array(z.array(blockV1))
  },
})

/** One block of rich text; lists nest through `items` (R10). */
export const blockV1: z.ZodType<BlockV1> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), children: z.array(inlineV1) }),
  z.object({ type: z.literal('heading'), level: z.literal([2, 3, 4]), children: z.array(inlineV1) }),
  listBlockV1,
  z.object({ type: z.literal('quote'), children: z.array(inlineV1) }),
  z.object({ type: z.literal('image'), image: imageV1 }),
])

/** Rich text nests at most this deep: a top-level paragraph is 1, a list of paragraphs 2. */
export const RICH_TEXT_MAX_DEPTH = 8

/** Depth of a block: 1, or 1 + the deepest block inside a list's items. */
export function blockDepth(block: BlockV1): number {
  if (block.type !== 'list') return 1
  return 1 + Math.max(0, ...block.items.flat().map(blockDepth))
}

export const richTextV1 = z
  .object({ nodes: z.array(blockV1) })
  .refine((v) => v.nodes.every((n) => blockDepth(n) <= RICH_TEXT_MAX_DEPTH), { message: 'rich text nests too deep' })
export type RichTextV1 = z.infer<typeof richTextV1>

export const paginationV1 = z
  .object({ page: positiveInt, pageCount: z.int().nonnegative(), total: z.int().nonnegative(), pageSize: positiveInt })
  .refine((p) => p.page <= Math.max(p.pageCount, 1), { message: 'page is past the last page', path: ['page'] })
export type PaginationV1 = z.infer<typeof paginationV1>
