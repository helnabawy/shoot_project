import { describe, expect, it } from 'vitest'
import { creatorSummary } from '../../../tests/fixtures/creators'
import { buildDirectory, directoryHref } from './directory'
import type { DirectoryContext } from './queries'

const context: DirectoryContext = {
  lookups: { personas: new Map(), specialties: new Map(), locations: new Map() },
  personas: [{ id: '1', slug: 'photographer', name: 'Photographers' }, { id: '2', slug: 'videographer', name: 'Videographers' }],
  specialties: [{ id: '10', slug: 'portrait', name: 'Portrait' }, { id: '11', slug: 'events', name: 'Events' }, { id: '12', slug: 'fashion', name: 'Fashion' }],
  emirates: [{ id: '100', slug: 'dubai', name: 'Dubai' }, { id: '101', slug: 'abu-dhabi', name: 'Abu Dhabi' }],
  prefix: 'CR',
  pageSize: 2,
}
const c = (id: string, over: object = {}) => creatorSummary({ id, code: id, displayName: `C${id}`, ...over })
const creators = [
  c('A', { personaIds: ['1'], specialtyIds: ['10'], emirateIds: ['100'], featured: true }),
  c('B', { personaIds: ['2'], specialtyIds: ['11'], emirateIds: ['101'], publishedAt: '2026-11-03T00:00:00.000Z' }),
  c('C', { personaIds: ['1', '2'], specialtyIds: ['10', '11'], emirateIds: ['100'], publishedAt: '2026-11-02T00:00:00.000Z' }),
]
const view = (params = {}, extra = {}) => buildDirectory({ creators, context, params, locale: 'en', ...extra })

describe('directoryHref', () => {
  it('builds the query from slugs, omits page 1 and prefixes Arabic', () => {
    expect(directoryHref({}, 'en')).toBe('/creators')
    expect(directoryHref({ type: 'videographer', place: 'dubai', page: 1 }, 'en')).toBe('/creators?type=videographer&place=dubai')
    expect(directoryHref({ specialty: 'portrait', page: '2' }, 'ar')).toBe('/ar/creators?specialty=portrait&page=2')
    expect(directoryHref({ page: 'x' }, 'en')).toBe('/creators')
  })
})

describe('CP-US1-S2 directory view', () => {
  it('without filters lists everyone ordered, promotes the first to the Top Hit and paginates', () => {
    const v = view()
    expect(v.total).toBe(3)
    expect(v.topHit?.code).toBe('A')
    expect(v.rows.map((r) => r.code)).toEqual(['B'])
    expect(v.pages).toBe(2)
    expect(v.nextHref).toBe('/creators?page=2')
    expect(v.prevHref).toBeNull()
    expect(v.filtered).toBe(false)
    expect(v.clearHref).toBeNull()
  })

  it('page 2 has no Top Hit and links back', () => {
    const v = view({ page: '2' })
    expect(v.topHit).toBeNull()
    expect(v.rows.map((r) => r.code)).toEqual(['C'])
    expect(v.prevHref).toBe('/creators')
    expect(v.nextHref).toBeNull()
  })

  it('applies filters from slugs, prints tokens, and offers to clear them', () => {
    const v = view({ type: 'videographer', place: 'dubai' })
    expect(v.total).toBe(1)
    expect(v.topHit?.code).toBe('C')
    expect(v.tokens).toEqual(['Videographers', 'Dubai'])
    expect(v.clearHref).toBe('/creators')
    expect(v.filtered).toBe(true)
  })

  it('ignores unknown filter values', () => {
    const v = view({ type: 'teacher', specialty: 'nope', place: 'mars' })
    expect(v.filtered).toBe(false)
    expect(v.total).toBe(3)
    expect(v.tokens).toEqual([])
  })

  it('counts each option with the other filters applied, hides empty options, keeps a chosen one', () => {
    const v = view({ place: 'dubai' })
    const type = v.groups.find((g) => g.key === 'type')!
    expect(type.options.map((o) => [o.slug, o.count])).toEqual([['photographer', 2], ['videographer', 1]])
    const specialty = v.groups.find((g) => g.key === 'specialty')!
    expect(specialty.options.map((o) => o.slug)).toEqual(['portrait', 'events']) // fashion has none
    const place = v.groups.find((g) => g.key === 'place')!
    expect(place.options.map((o) => [o.slug, o.count, o.selected])).toEqual([['dubai', 2, true], ['abu-dhabi', 1, false]])
    expect(place.current).toBe('Dubai')
    expect(place.anyHref).toBe('/creators')
    expect(type.options[0]!.href).toBe('/creators?type=photographer&place=dubai')
  })

  it('keeps a chosen option visible even when it has no creators', () => {
    const v = view({ type: 'photographer', specialty: 'fashion' })
    const specialty = v.groups.find((g) => g.key === 'specialty')!
    // The specialty facet ignores its own filter, so other specialties keep their counts for these photographers.
    expect(specialty.options.map((o) => [o.slug, o.count, o.selected])).toEqual([['portrait', 2, false], ['events', 1, false], ['fashion', 0, true]])
    expect(v.total).toBe(0)
    expect(v.topHit).toBeNull()
    expect(v.rows).toEqual([])
  })

  it('hides the professional filter when the audience has a single type', () => {
    const v = buildDirectory({ creators, context: { ...context, personas: context.personas.slice(0, 1) }, params: {}, locale: 'en' })
    expect(v.groups.map((g) => g.key)).toEqual(['specialty', 'place'])
  })

  it('a fixed filter (a specialty page) belongs to the page: no group, not clearable, still applied', () => {
    const v = buildDirectory({ creators, context, params: { specialty: 'events' }, locale: 'ar', base: '/work/events', fixed: { specialty: 'portrait' } })
    expect(v.groups.map((g) => g.key)).toEqual(['type', 'place'])
    expect(v.total).toBe(2)
    expect(v.tokens).toEqual(['Portrait'])
    expect(v.clearHref).toBeNull()
    expect(v.groups[0]!.options[0]!.href).toBe('/ar/work/events?type=photographer')
  })
})
