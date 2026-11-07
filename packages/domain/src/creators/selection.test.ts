import { describe, expect, it } from 'vitest'
import { NETWORK_COUNT_MAX, NETWORK_COUNT_MIN, networkSelection, orderCreators } from './selection'
import type { CreatorSummary } from './types'

const c = (code: string, over: Partial<CreatorSummary> = {}): CreatorSummary => ({
  id: code, code, displayName: code, bio: '', photo: null, personaIds: ['p'], specialtyIds: [], locationIds: [], emirateIds: [],
  languages: [], sampleCounts: {}, sampleCount: 3, featured: false, publishedAt: '2026-11-01T00:00:00.000Z', ...over,
})
const codes = (list: CreatorSummary[]) => list.map((x) => x.code)

describe('CP-FR-003 / CP-US1-S2 ordering', () => {
  it('puts featured first, then the newest publication, ties by code', () => {
    const list = [
      c('AAAAA', { publishedAt: '2026-11-01T00:00:00.000Z' }),
      c('BBBBB', { publishedAt: '2026-11-05T00:00:00.000Z' }),
      c('CCCCC', { featured: true, publishedAt: '2026-10-01T00:00:00.000Z' }),
      c('DDDDD', { publishedAt: '2026-11-05T00:00:00.000Z' }),
    ]
    expect(codes(orderCreators(list))).toEqual(['CCCCC', 'BBBBB', 'DDDDD', 'AAAAA'])
  })

  it('sorts creators with no samples last and never treats them as featured', () => {
    const list = [c('EMPTY', { sampleCount: 0, featured: true, publishedAt: '2026-12-01T00:00:00.000Z' }), c('FULLL')]
    expect(codes(orderCreators(list))).toEqual(['FULLL', 'EMPTY'])
  })

  it('does not change the input order', () => {
    const list = [c('BBBBB'), c('AAAAA')]
    orderCreators(list)
    expect(codes(list)).toEqual(['BBBBB', 'AAAAA'])
  })
})

describe('CP-US1-S1 landing network selection', () => {
  const list = [
    c('F1', { featured: true, publishedAt: '2026-01-01T00:00:00.000Z' }),
    c('F2', { featured: true, publishedAt: '2026-02-01T00:00:00.000Z' }),
    c('N1', { publishedAt: '2026-11-01T00:00:00.000Z' }),
    c('N2', { publishedAt: '2026-10-01T00:00:00.000Z' }),
    c('N3', { publishedAt: '2026-09-01T00:00:00.000Z' }),
    c('NOSAMPLE', { sampleCount: 0, featured: true, publishedAt: '2026-12-01T00:00:00.000Z' }),
  ]

  it('featuredThenNewest: featured first, then newest, up to count', () => {
    expect(codes(networkSelection(list, 'featuredThenNewest', 4))).toEqual(['F2', 'F1', 'N1', 'N2'])
  })

  it('newest: by publication only, featured or not', () => {
    expect(codes(networkSelection(list, 'newest', 3))).toEqual(['N1', 'N2', 'N3'])
  })

  it('featuredOnly: returns only featured creators, even when fewer than count', () => {
    expect(codes(networkSelection(list, 'featuredOnly', 6))).toEqual(['F2', 'F1'])
  })

  it('never shows a creator without samples (the block is a showcase)', () => {
    expect(codes(networkSelection(list, 'newest', 12))).not.toContain('NOSAMPLE')
  })

  it('clamps the count to 3–12 and treats a missing count as 6', () => {
    const many = Array.from({ length: 20 }, (_, i) => c(`C${String(i).padStart(2, '0')}`))
    expect(networkSelection(many, 'newest', 1)).toHaveLength(NETWORK_COUNT_MIN)
    expect(networkSelection(many, 'newest', 99)).toHaveLength(NETWORK_COUNT_MAX)
    expect(networkSelection(many, 'newest', undefined)).toHaveLength(6)
    expect(networkSelection(many, 'newest', Number.NaN)).toHaveLength(6)
  })

  it('an unknown rule falls back to featuredThenNewest', () => {
    expect(codes(networkSelection(list, 'mystery' as never, 4))).toEqual(['F2', 'F1', 'N1', 'N2'])
  })

  it('returns nothing for an empty list', () => {
    expect(networkSelection([], 'featuredThenNewest', 6)).toEqual([])
  })
})
