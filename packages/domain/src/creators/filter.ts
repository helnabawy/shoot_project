import type { CreatorSummary, DirectoryFilters, FacetCounts } from './types'

export interface KnownOptions {
  personaIds: readonly string[]
  specialtyIds: readonly string[]
  emirateIds: readonly string[]
}

const matches = (c: CreatorSummary, f: DirectoryFilters) =>
  (!f.personaId || c.personaIds.includes(f.personaId)) &&
  (!f.specialtyId || c.specialtyIds.includes(f.specialtyId)) &&
  (!f.emirateId || c.emirateIds.includes(f.emirateId))

export function filterCreators(creators: readonly CreatorSummary[], filters: DirectoryFilters): CreatorSummary[] {
  return creators.filter((c) => matches(c, filters))
}

/** Drops filter values that are not options on the page (an old or hand-edited URL is treated as "any"). */
export function sanitiseFilters(filters: DirectoryFilters, known: KnownOptions): DirectoryFilters {
  const result: DirectoryFilters = {}
  if (filters.personaId && known.personaIds.includes(filters.personaId)) result.personaId = filters.personaId
  if (filters.specialtyId && known.specialtyIds.includes(filters.specialtyId)) result.specialtyId = filters.specialtyId
  if (filters.emirateId && known.emirateIds.includes(filters.emirateId)) result.emirateId = filters.emirateId
  return result
}

function count(creators: readonly CreatorSummary[], values: (c: CreatorSummary) => string[], known: readonly string[] = []) {
  const counts: Record<string, number> = Object.fromEntries(known.map((id) => [id, 0]))
  for (const creator of creators) for (const id of new Set(values(creator))) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

/**
 * For each facet, how many creators the page would list if that value were chosen while the other
 * two filters stay applied (CP-US1-S2 "counts shown per filter").
 */
export function facetCounts(creators: readonly CreatorSummary[], filters: DirectoryFilters, known?: KnownOptions): FacetCounts {
  return {
    personas: count(filterCreators(creators, { ...filters, personaId: undefined }), (c) => c.personaIds, known?.personaIds),
    specialties: count(filterCreators(creators, { ...filters, specialtyId: undefined }), (c) => c.specialtyIds, known?.specialtyIds),
    emirates: count(filterCreators(creators, { ...filters, emirateId: undefined }), (c) => c.emirateIds, known?.emirateIds),
  }
}

export function paginate<T>(items: readonly T[], page: number, size: number): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Number.isFinite(page) ? Math.min(pages, Math.max(1, Math.floor(page))) : 1
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length }
}
