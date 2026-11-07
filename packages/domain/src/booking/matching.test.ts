import { describe, expect, it } from 'vitest'
import { matchCreators, nearbyDates, type MatchCandidate } from './matching'

const c = (id: string, over: Partial<MatchCandidate> = {}): MatchCandidate => ({ id, personaIds: ['p'], emirateIds: ['dxb'], specialtyIds: [], matchValues: [], ...over })
const creators = [
  c('1'),
  c('2', { personaIds: ['v'] }),
  c('3', { emirateIds: ['shj'] }),
  c('4', { matchValues: ['woman'], specialtyIds: ['events'] }),
  c('5', { specialtyIds: ['events'], matchValues: undefined }),
]
const none = new Set<string>()

describe('QM-US1-S1 only free, matching creators', () => {
  it('keeps the type and the emirate', () => {
    expect(matchCreators(creators, { personaId: 'p', emirateId: 'dxb', blocked: none }).map((x) => x.id)).toEqual(['1', '4', '5'])
  })

  it('drops creators who are not free that day', () => {
    expect(matchCreators(creators, { personaId: 'p', emirateId: 'dxb', blocked: new Set(['1', '5']) }).map((x) => x.id)).toEqual(['4'])
  })

  it('a filtering slot keeps only creators with that value; "anyone" keeps all', () => {
    expect(matchCreators(creators, { personaId: 'p', emirateId: 'dxb', blocked: none, filters: [{ value: 'woman', matchesAny: false }] }).map((x) => x.id)).toEqual(['4'])
    expect(matchCreators(creators, { personaId: 'p', emirateId: 'dxb', blocked: none, filters: [{ value: 'anyone', matchesAny: true }, { value: '', matchesAny: false }] }).map((x) => x.id)).toEqual(['1', '4', '5'])
  })

  it('ranks creators with the occasion specialty first, keeping order otherwise', () => {
    expect(matchCreators(creators, { personaId: 'p', emirateId: 'dxb', blocked: none, categoryId: 'events' }).map((x) => x.id)).toEqual(['4', '5', '1'])
  })

  it('QM-US1-S3 no emirate filter when the brief has none', () => {
    expect(matchCreators(creators, { personaId: 'p', emirateId: null, blocked: none }).map((x) => x.id)).toEqual(['1', '3', '4', '5'])
  })
})

describe('QM-US1-S2 nearby dates when nobody is free', () => {
  const free = (days: string[]) => (d: string) => days.includes(d)

  it('nearest first, later first on ties, at most three', () => {
    expect(nearbyDates('2026-12-10', free(['2026-12-09', '2026-12-11', '2026-12-12', '2026-12-16']), { today: '2026-12-01' })).toEqual(['2026-12-11', '2026-12-09', '2026-12-12'])
  })

  it('never before today and within the span', () => {
    expect(nearbyDates('2026-12-10', free(['2026-12-08', '2026-12-09', '2026-12-20']), { today: '2026-12-09', span: 7 })).toEqual(['2026-12-09'])
    expect(nearbyDates('2026-12-10', free(['2026-12-12']), { today: '2026-12-01', span: 1 })).toEqual([])
  })

  it('respects max', () => {
    expect(nearbyDates('2026-12-10', () => true, { today: '2026-12-01', max: 2 })).toEqual(['2026-12-11', '2026-12-09'])
  })
})
