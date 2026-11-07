/** A kind of professional the platform offers, already resolved for one locale. */
export interface Persona {
  id: string
  slug: string
  singular: string
  plural: string
  order: number
  active: boolean
  copy?: { seekerCta?: string | null; providerCta?: string | null; providerPitch?: string | null } | null
}

/** A specialty that belongs to one or more personas. */
export interface Category {
  id: string
  slug: string
  name: string
  order: number
  active: boolean
  personas: string[]
}

/** A relationship value as Payload returns it: an id, or a populated document. */
export type Ref = string | number | { id: string | number }
