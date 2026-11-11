import 'server-only'
import { categoriesForPersonas, resolveActivePersonas, type Category as DomainCategory, type Persona as DomainPersona } from '@shoot/domain/personas'
import type { Category, Media, Persona } from '@/payload-types'
import { mediaSource } from '@/shared/components/CmsImage'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { getSiteSettings } from '../site-settings/queries'

export type AudiencePersona = DomainPersona & { glyph?: string | null; description?: string | null }
export type AudienceCategory = DomainCategory & {
  glyph?: string | null
  description?: string | null
  /** The drawing on the landing tile (CMS choice), until the specialty has an image. */
  scene?: string | null
  /** The specialty's own image at card size, when the CMS has one. */
  image?: { url: string; width: number; height: number; alt?: string | null } | null
  /** The image's media document with every stored size, for the mobile API (008). */
  media?: Media | null
  /** The specialty page's own text (`/work/{slug}`), in the requested language. */
  seo?: { title?: string | null; description?: string | null; intro?: string | null }
}

const toPersona = (p: Persona): AudiencePersona => ({
  id: String(p.id),
  slug: p.slug,
  singular: p.singular,
  plural: p.plural,
  order: p.order ?? 100,
  active: p.active ?? true,
  copy: p.copy ?? null,
  glyph: p.glyph,
  description: p.description,
})

const toCategory = (c: Category): AudienceCategory => ({
  id: String(c.id),
  slug: c.slug,
  name: c.name,
  order: c.order ?? 100,
  active: c.active ?? true,
  personas: (c.personas ?? []).map((p) => String(typeof p === 'object' ? p.id : p)),
  glyph: c.glyph,
  description: c.description,
  scene: c.scene ?? null,
  image: c.image && typeof c.image === 'object' ? mediaSource(c.image, 'card') : null,
  media: c.image && typeof c.image === 'object' ? c.image : null,
  seo: { title: c.seo?.title, description: c.seo?.description, intro: c.seo?.intro },
})

export function getAllPersonas(locale: Locale): Promise<AudiencePersona[]> {
  return cachedQuery(['personas'], ['personas', locale], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({ collection: 'personas', locale, fallbackLocale: 'en', limit: 100, depth: 0, sort: 'order' })
    return docs.map(toPersona)
  })
}

/** The public audience in Site Settings order (FR-027). */
export async function getActivePersonas(locale: Locale): Promise<AudiencePersona[]> {
  const [settings, personas] = await Promise.all([getSiteSettings(locale), getAllPersonas(locale)])
  const refs = (settings.activePersonas ?? []).map((p) => (typeof p === 'object' ? p.id : p))
  return resolveActivePersonas(refs, personas) as AudiencePersona[]
}

export async function getCategoriesForAudience(locale: Locale): Promise<AudienceCategory[]> {
  const personas = await getActivePersonas(locale)
  const categories = await cachedQuery(['categories'], ['categories', locale], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({ collection: 'categories', locale, fallbackLocale: 'en', limit: 200, depth: 1 })
    return docs.map(toCategory)
  })
  return categoriesForPersonas(categories, personas) as AudienceCategory[]
}
