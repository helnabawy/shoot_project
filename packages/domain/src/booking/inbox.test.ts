import { describe, expect, it } from 'vitest'
import type { Assignment } from './assignments'
import { acceptorsFirst, briefMatchesCreator, inboxSections, isBriefOpen, preconfirm, type InboxBrief, type InboxEntry } from './inbox'
import type { MatchCandidate } from './matching'

const brief = (over: Partial<InboxBrief> = {}): InboxBrief => ({
  id: 'b1',
  status: 'new',
  personaIds: ['p'],
  emirateId: 'dxb',
  date: '2026-11-20',
  createdAt: '2026-11-13T08:00:00.000Z',
  namedCreatorId: null,
  filters: [],
  categoryId: null,
  bookingStates: [],
  ...over,
})
const me = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({ id: 'c1', personaIds: ['p'], emirateIds: ['dxb'], specialtyIds: [], matchValues: [], ...over })
const free = new Set<string>()
const window = { today: '2026-11-13', inboxDays: 30 }

describe('BI-US1-S2 open briefs (research R2)', () => {
  it('a new brief dated today or later is open', () => {
    expect(isBriefOpen(brief(), window)).toBe(true)
    expect(isBriefOpen(brief({ date: '2026-11-13' }), window)).toBe(true)
  })

  it('a past date, another status or an accepted booking closes it', () => {
    expect(isBriefOpen(brief({ date: '2026-11-12' }), window)).toBe(false)
    expect(isBriefOpen(brief({ status: 'contacted' }), window)).toBe(false)
    expect(isBriefOpen(brief({ bookingStates: ['accepted'] }), window)).toBe(false)
  })

  it('a quotation not yet accepted, or an expired one, leaves it open', () => {
    expect(isBriefOpen(brief({ bookingStates: ['quoted', 'expired'] }), window)).toBe(true)
  })

  it('without a date it stays open for inboxDays after it was sent', () => {
    expect(isBriefOpen(brief({ date: null, createdAt: '2026-10-14T10:00:00.000Z' }), window)).toBe(true)
    expect(isBriefOpen(brief({ date: null, createdAt: '2026-10-13T10:00:00.000Z' }), window)).toBe(false)
  })
})

describe('BI-US1-S2 BI-SC-002 a brief matches a creator by the Quick Match rules', () => {
  it('type, emirate, free day and filters must all hold', () => {
    expect(briefMatchesCreator(me(), brief(), free)).toEqual(['p'])
    expect(briefMatchesCreator(me({ personaIds: ['v'] }), brief(), free)).toEqual([])
    expect(briefMatchesCreator(me({ emirateIds: ['shj'] }), brief(), free)).toEqual([])
    expect(briefMatchesCreator(me(), brief(), new Set(['2026-11-20']))).toEqual([])
    expect(briefMatchesCreator(me(), brief({ filters: [{ value: 'woman', matchesAny: false }] }), free)).toEqual([])
    expect(briefMatchesCreator(me({ matchValues: ['woman'] }), brief({ filters: [{ value: 'woman', matchesAny: false }] }), free)).toEqual(['p'])
  })

  it('a brief without a date or emirate ignores the blocked days and the emirate', () => {
    expect(briefMatchesCreator(me(), brief({ date: null }), new Set(['2026-11-20']))).toEqual(['p'])
    expect(briefMatchesCreator(me({ emirateIds: [] }), brief({ emirateId: null }), free)).toEqual(['p'])
  })

  it('a brief for two types matches each type the creator offers', () => {
    expect(briefMatchesCreator(me({ personaIds: ['p', 'v'] }), brief({ personaIds: ['v', 'p'] }), free)).toEqual(['v', 'p'])
  })

  it('a brief sent to one named creator matches only that creator, for the types they offer', () => {
    expect(briefMatchesCreator(me(), brief({ namedCreatorId: 'c2' }), free)).toEqual([])
    expect(briefMatchesCreator(me({ emirateIds: ['shj'] }), brief({ namedCreatorId: 'c1' }), free)).toEqual(['p'])
  })
})

const entry = (ref: string, over: Partial<InboxEntry> = {}): InboxEntry => ({ ref, date: '2026-11-20', createdAt: '2026-11-13T08:00:00.000Z', specialtyMatch: false, answer: null, ...over })

describe('BI-US1-S1 inbox sections and order', () => {
  it('open: soonest date first, then the matching specialty, then newest; "any date" last', () => {
    const { open } = inboxSections([
      entry('late', { date: '2026-11-25' }),
      entry('any', { date: null }),
      entry('old', { createdAt: '2026-11-10T00:00:00.000Z' }),
      entry('fit', { specialtyMatch: true, createdAt: '2026-11-01T00:00:00.000Z' }),
      entry('new'),
    ])
    expect(open.map((e) => e.ref)).toEqual(['fit', 'new', 'old', 'late', 'any'])
  })

  it('answered entries go to their group, newest answer first; withdrawn answers count as none', () => {
    const s = inboxSections([
      entry('a1', { answer: { decision: 'accepted', answeredAt: '2026-11-13T09:00:00.000Z' } }),
      entry('a2', { answer: { decision: 'accepted', answeredAt: '2026-11-13T10:00:00.000Z' } }),
      entry('r1', { answer: { decision: 'rejected', answeredAt: '2026-11-13T09:00:00.000Z' } }),
      entry('w1', { answer: { decision: 'rejected', answeredAt: '2026-11-13T09:00:00.000Z', withdrawnAt: '2026-11-13T09:30:00.000Z' } }),
    ])
    expect(s.accepted.map((e) => e.ref)).toEqual(['a2', 'a1'])
    expect(s.rejected.map((e) => e.ref)).toEqual(['r1'])
    expect(s.open.map((e) => e.ref)).toEqual(['w1'])
  })
})

describe('BI-US2-S3 acceptors are listed first', () => {
  it('keeps the matching order inside each group', () => {
    const list = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]
    expect(acceptorsFirst(list, new Set(['3', '1'])).map((c) => c.id)).toEqual(['1', '3', '2', '4'])
    expect(acceptorsFirst(list, new Set()).map((c) => c.id)).toEqual(['1', '2', '3', '4'])
  })
})

describe('BI-US2-S4 a picked acceptor starts confirmed', () => {
  const now = new Date('2026-11-14T10:00:00.000Z')
  const rows: Assignment[] = [
    { personaId: 'p', creatorId: 'c1', status: 'pending', respondBy: '2026-11-15T10:00:00.000Z' },
    { personaId: 'v', creatorId: 'c2', status: 'pending', respondBy: '2026-11-15T10:00:00.000Z' },
    { personaId: 'x', creatorId: null, status: 'open' },
  ]

  it('confirms only rows whose creator accepted the brief for that type', () => {
    const accepted = new Map([
      ['p', new Set(['c1'])],
      ['v', new Set(['c9'])],
    ])
    const result = preconfirm(rows, accepted, now)
    expect(result.confirmed).toEqual([{ personaId: 'p', creatorId: 'c1' }])
    expect(result.assignments[0]).toMatchObject({ status: 'confirmed', respondedAt: now.toISOString() })
    expect(result.assignments[1]).toEqual(rows[1])
    expect(result.assignments[2]).toEqual(rows[2])
  })

  it('a creator who accepted another type is not confirmed for this one', () => {
    expect(preconfirm(rows, new Map([['v', new Set(['c1'])]]), now).confirmed).toEqual([])
  })
})
