import type { Category, Persona, Ref } from './types'

export function refId(ref: Ref): string {
  return typeof ref === 'object' ? String(ref.id) : String(ref)
}

/**
 * The public audience: personas listed in site settings, in that order, that exist and are
 * active. Dangling references (deleted personas) and inactive personas are skipped (FR-027).
 */
export function resolveActivePersonas(activeRefs: readonly Ref[], personas: readonly Persona[]): Persona[] {
  const byId = new Map(personas.map((p) => [String(p.id), p]))
  const seen = new Set<string>()
  const result: Persona[] = []
  for (const ref of activeRefs) {
    const id = refId(ref)
    const persona = byId.get(id)
    if (persona && persona.active && !seen.has(id)) {
      seen.add(id)
      result.push(persona)
    }
  }
  return result
}

/** Active categories that belong to at least one of the given personas, sorted by order then name. */
export function categoriesForPersonas(categories: readonly Category[], personas: readonly Persona[]): Category[] {
  const ids = new Set(personas.map((p) => String(p.id)))
  return categories
    .filter((c) => c.active && c.personas.some((p) => ids.has(String(p))))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}
