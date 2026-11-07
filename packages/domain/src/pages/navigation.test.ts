import { describe, expect, it } from 'vitest'
import { checkPlacementLimits, FOOTER_LINK_LIMIT, groupFooter, orderHeader, type PlacementPage } from './navigation'

const page = (id: string, extra: Partial<PlacementPage> = {}): PlacementPage => ({
  id,
  title: `Page ${id}`,
  inHeader: false,
  order: 100,
  ...extra,
})

describe('MP-EDGE-nav-limits checkPlacementLimits', () => {
  const keys = ['company', 'help']

  it('accepts a page that fits', () => {
    expect(checkPlacementLimits([page('a', { inHeader: true })], page('b', { inHeader: true, footerGroup: 'company' }), keys)).toBeNull()
  })

  it('refuses a fourth header page but lets an already-placed page keep its place', () => {
    const three = ['a', 'b', 'c'].map((id) => page(id, { inHeader: true }))
    expect(checkPlacementLimits(three, page('d', { inHeader: true }), keys)).toBe('pages.nav.headerLimit')
    expect(checkPlacementLimits(three, page('a', { inHeader: true }), keys)).toBeNull()
    expect(checkPlacementLimits(three, page('d'), keys)).toBeNull()
  })

  it('refuses a footer group that does not exist', () => {
    expect(checkPlacementLimits([], page('a', { footerGroup: 'nope' }), keys)).toBe('pages.nav.unknownGroup')
  })

  it('refuses the footer link past the limit', () => {
    const full = Array.from({ length: FOOTER_LINK_LIMIT }, (_, i) => page(`p${i}`, { footerGroup: 'company' }))
    expect(checkPlacementLimits(full, page('x', { footerGroup: 'help' }), keys)).toBe('pages.nav.footerLimit')
    expect(checkPlacementLimits(full, page('p0', { footerGroup: 'help' }), keys)).toBeNull()
  })
})

describe('MP-US1-S4 groupFooter and orderHeader', () => {
  it('orders groups as given, pages by order then label, and drops empty groups and unknown groups', () => {
    const pages = [
      page('1', { footerGroup: 'help', order: 2, label: 'Zebra' }),
      page('2', { footerGroup: 'help', order: 2, label: 'Apple' }),
      page('3', { footerGroup: 'help', order: 1 }),
      page('4', { footerGroup: 'gone-group' }),
      page('5', { footerGroup: 'company' }),
    ]
    const groups = [
      { key: 'empty', label: 'Empty' },
      { key: 'help', label: 'Help' },
      { key: 'company', label: 'Company' },
    ]
    expect(groupFooter(pages, groups)).toEqual([
      { key: 'help', label: 'Help', links: [{ id: '3', label: 'Page 3' }, { id: '2', label: 'Apple' }, { id: '1', label: 'Zebra' }] },
      { key: 'company', label: 'Company', links: [{ id: '5', label: 'Page 5' }] },
    ])
  })

  it('keeps at most four groups', () => {
    const groups = ['a', 'b', 'c', 'd', 'e'].map((key) => ({ key, label: key }))
    const pages = groups.map((g) => page(g.key, { footerGroup: g.key }))
    expect(groupFooter(pages, groups).map((g) => g.key)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lists header pages in order, using the label when set', () => {
    const pages = [page('b', { inHeader: true, order: 2 }), page('a', { inHeader: true, order: 1, label: 'Studios' }), page('c')]
    expect(orderHeader(pages)).toEqual([{ id: 'a', label: 'Studios' }, { id: 'b', label: 'Page b' }])
  })
})
