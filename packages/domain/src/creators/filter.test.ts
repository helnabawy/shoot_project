import { describe, expect, it } from 'vitest'
import { facetCounts, filterCreators, paginate, sanitiseFilters } from './filter'
import type { CreatorSummary } from './types'

const c = (code: string, personaIds: string[], specialtyIds: string[], emirateIds: string[]): CreatorSummary => ({
  id: code, code, displayName: code, bio: '', photo: null, personaIds, specialtyIds, locationIds: emirateIds, emirateIds,
  languages: [], sampleCounts: {}, sampleCount: 1, featured: false, publishedAt: '2026-11-01T00:00:00.000Z',
})

// photo = p, video = v; portrait = s1, events = s2; dubai = e1, abu dhabi = e2
const list = [
  c('A', ['p'], ['s1'], ['e1']),
  c('B', ['p', 'v'], ['s1', 's2'], ['e2']),
  c('C', ['v'], ['s2'], ['e1', 'e2']),
  c('D', ['p'], ['s2'], ['e1']),
]
const codes = (l: CreatorSummary[]) => l.map((x) => x.code)

describe('CP-US1-S2 filters', () => {
  it('filters by professional type, specialty and emirate, and their combinations', () => {
    expect(codes(filterCreators(list, {}))).toEqual(['A', 'B', 'C', 'D'])
    expect(codes(filterCreators(list, { personaId: 'v' }))).toEqual(['B', 'C'])
    expect(codes(filterCreators(list, { specialtyId: 's1' }))).toEqual(['A', 'B'])
    expect(codes(filterCreators(list, { emirateId: 'e2' }))).toEqual(['B', 'C'])
    expect(codes(filterCreators(list, { personaId: 'p', specialtyId: 's2', emirateId: 'e1' }))).toEqual(['D'])
  })

  it('a creator whose city lies in an emirate matches that emirate', () => {
    const city = { ...c('E', ['p'], ['s1'], ['e1']), locationIds: ['city-in-e1'] }
    expect(codes(filterCreators([city], { emirateId: 'e1' }))).toEqual(['E'])
  })

  it('counts each facet value with the other two filters applied (standard faceting)', () => {
    const counts = facetCounts(list, { personaId: 'p', emirateId: 'e1' })
    // personas: emirate e1 only (persona filter ignored for its own facet): A, C, D
    expect(counts.personas).toEqual({ p: 2, v: 1 })
    // specialties: persona p and emirate e1: A, D
    expect(counts.specialties).toEqual({ s1: 1, s2: 1 })
    // emirates: persona p only: A, B, D
    expect(counts.emirates).toEqual({ e1: 2, e2: 1 })
  })

  it('includes known values with zero counts when the known options are given', () => {
    const counts = facetCounts(list, { specialtyId: 's1' }, { personaIds: ['p', 'v', 'x'], specialtyIds: ['s1'], emirateIds: ['e3'] })
    expect(counts.personas).toEqual({ p: 2, v: 1, x: 0 })
    expect(counts.emirates).toEqual({ e1: 1, e2: 1, e3: 0 })
  })

  it('returns empty counts (or zeros for known values) for an empty list', () => {
    expect(facetCounts([], {})).toEqual({ personas: {}, specialties: {}, emirates: {} })
    expect(facetCounts([], {}, { personaIds: ['p'], specialtyIds: [], emirateIds: [] }).personas).toEqual({ p: 0 })
  })

  it('ignores filter values that are not known options', () => {
    const known = { personaIds: ['p', 'v'], specialtyIds: ['s1'], emirateIds: ['e1'] }
    expect(sanitiseFilters({ personaId: 'p', specialtyId: 'nope', emirateId: 'e1' }, known)).toEqual({ personaId: 'p', emirateId: 'e1' })
    expect(sanitiseFilters({ specialtyId: 's1' }, known)).toEqual({ specialtyId: 's1' })
    expect(sanitiseFilters({}, known)).toEqual({})
  })
})

describe('pagination', () => {
  const items = Array.from({ length: 50 }, (_, i) => i)
  it('slices pages and reports the page count', () => {
    expect(paginate(items, 1, 24)).toEqual({ items: items.slice(0, 24), page: 1, pages: 3, total: 50 })
    expect(paginate(items, 3, 24).items).toEqual([48, 49])
  })
  it('clamps out-of-range and invalid pages, and has one page when empty', () => {
    expect(paginate(items, 9, 24).page).toBe(3)
    expect(paginate(items, 0, 24).page).toBe(1)
    expect(paginate(items, Number.NaN, 24).page).toBe(1)
    expect(paginate([], 1, 24)).toEqual({ items: [], page: 1, pages: 1, total: 0 })
  })
})
