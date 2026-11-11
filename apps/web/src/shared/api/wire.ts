import { reduceRichText, type ImageV1, type LinkV1, type RichTextV1 } from '@shoot/domain/api/v1'
import { stripLocalePrefix } from '@shoot/domain/content'
import type { Media } from '@/payload-types'
import { env } from '@/shared/lib/env'
import type { Locale } from '@/shared/lib/locale'

/**
 * Shared `toWire*` helpers (008 research R8, R9). Mappers build new objects field by field and never
 * spread a Payload document, so nothing internal reaches the app.
 */

/** What every mapper needs: the answer language and the absolute origin of relative media URLs. */
export interface WireContext {
  locale: Locale
  base: string
}

/** The site origin that relative media addresses (`/api/media/file/…`) are served from. */
export function mediaBase(): string {
  return env().NEXT_PUBLIC_SITE_URL
}

export function wireContext(locale: Locale): WireContext {
  return { locale, base: mediaBase() }
}

/** An image as the queries hand it out: a media document, an id (not loaded) or a single-size source. */
export type ImageInput = Media | { url?: string | null; width?: number | null; height?: number | null; alt?: string | null } | number | null | undefined

type Sized = { url?: string | null; width?: number | null; height?: number | null }

function absolute(url: string, base: string): string | null {
  if (/^https?:\/\//.test(url)) return url
  return url.startsWith('/') && !url.startsWith('//') ? `${base}${url}` : null
}

/**
 * Every stored size plus the original, absolute, smallest first, one per width (R9). `null` when
 * the image has no usable file.
 */
export function toWireImage(media: ImageInput, base: string): ImageV1 | null {
  if (!media || typeof media !== 'object') return null
  const original: Sized = media
  if (!original.url || !original.width || !original.height) return null
  const variants = 'sizes' in media && media.sizes ? (Object.values(media.sizes) as Sized[]) : []
  const sizes: ImageV1['sizes'] = []
  for (const s of [...variants, original]) {
    const url = s?.url ? absolute(s.url, base) : null
    if (url && s.width && s.height) sizes.push({ url, width: s.width, height: s.height })
  }
  sizes.sort((a, b) => a.width - b.width)
  const unique = sizes.filter((s, i) => i === 0 || s.width !== (sizes[i - 1] as { width: number }).width)
  if (unique.length === 0) return null
  return { alt: media.alt ?? '', width: original.width, height: original.height, sizes: unique }
}

/** A Lexical state as v1 rich text, with uploads as images (R10). */
export function toWireRichText(state: unknown, base: string): RichTextV1 {
  return reduceRichText(state, { image: (value) => toWireImage(value as ImageInput, base) })
}

/** A site link without its language prefix. */
export function toWireLink(link: { label: string; href: string }): LinkV1 {
  return { label: link.label, path: stripLocalePrefix(link.href) }
}
