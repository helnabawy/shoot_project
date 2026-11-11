import type { CategoryV1, PersonaV1 } from '@shoot/domain/api/v1'
import type { Media } from '@/payload-types'
import { toWireImage, type ImageInput } from '@/shared/api/wire'

/** What the persona mapper reads: an `AudiencePersona` (its `copy`, `order` and `active` stay behind). */
export interface PersonaSource {
  id: string
  slug: string
  singular: string
  plural: string
  glyph?: string | null
  description?: string | null
}

/** What the category mapper reads: an `AudienceCategory`, or a hand-picked CMS category. */
export interface CategorySource {
  id: string
  slug: string
  name: string
  glyph?: string | null
  description?: string | null
  scene?: string | null
  /** The single card-size source the website uses. */
  image?: ImageInput
  /** The full media document, preferred for its sizes. */
  media?: Media | null
  /** Persona ids. */
  personas: readonly string[]
}

export function toWirePersona(p: PersonaSource): PersonaV1 {
  return {
    id: p.id,
    slug: p.slug,
    singular: p.singular,
    plural: p.plural,
    glyph: p.glyph || null,
    description: p.description || null,
  }
}

export function toWireCategory(c: CategorySource, base: string): CategoryV1 {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    glyph: c.glyph || null,
    description: c.description || null,
    scene: c.scene || null,
    image: toWireImage(c.media ?? null, base) ?? toWireImage(c.image ?? null, base),
    personaIds: [...c.personas],
  }
}
