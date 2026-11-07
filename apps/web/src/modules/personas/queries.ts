import 'server-only'
import { categoriesForPersonas, resolveActivePersonas, type Category as DomainCategory, type Persona as DomainPersona } from '@shoot/domain/personas'
import type { Category, Persona } from '@/payload-types'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { getSiteSettings } from '../site-settings/queries'

export type AudiencePersona = DomainPersona & { glyph?: string | null; description?: string | null }
export type AudienceCategory = DomainCategory & { glyph?: string | null; description?: string | null }

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
    const { docs } = await payload.find({ collection: 'categories', locale, fallbackLocale: 'en', limit: 200, depth: 0 })
    return docs.map(toCategory)
  })
  return categoriesForPersonas(categories, personas) as AudienceCategory[]
}
