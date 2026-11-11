import { hirePageV1, navigationV1 } from '@shoot/domain/api/v1'
import type { CreatorSummary } from '@shoot/domain/creators'
import { describe, expect, it } from 'vitest'
import type { IntentPage } from './intent'
import { toWireHirePage, toWireNavigation } from './wire'

describe('toWireNavigation', () => {
  it('MR-US1-S2 maps header, footer groups and legal links without language prefixes', () => {
    const wire = navigationV1.parse(
      toWireNavigation(
        {
          header: [{ label: 'About', href: '/about' }],
          footerGroups: [{ key: 'company', label: 'الشركة', links: [{ label: 'من نحن', href: '/ar/about' }, { label: 'Broken', href: '//evil.example' }] }],
          legal: [{ label: 'Terms', href: '/ar/terms' }],
        },
        'ar',
      ),
    )
    expect(wire).toEqual({
      locale: 'ar',
      header: [{ label: 'About', path: '/about' }],
      footerGroups: [{ key: 'company', label: 'الشركة', links: [{ label: 'من نحن', path: '/about' }] }],
      legal: [{ label: 'Terms', path: '/terms' }],
    })
  })

  it('answers empty lists when nothing is placed', () => {
    expect(toWireNavigation({ header: [], footerGroups: [], legal: [] }, 'en')).toEqual({ locale: 'en', header: [], footerGroups: [], legal: [] })
  })
})

describe('toWireHirePage', () => {
  const lexical = (text: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text, format: 0 }] }] } })
  const summary = (id: string): CreatorSummary => ({
    id,
    code: `00${id}`,
    displayName: `Omar K${id}`,
    bio: '',
    photo: null,
    personaIds: ['1'],
    specialtyIds: ['11'],
    locationIds: ['30'],
    emirateIds: ['30'],
    languages: ['en'],
    sampleCounts: {},
    sampleCount: 0,
    featured: false,
    publishedAt: '2026-01-01T00:00:00.000Z',
    matchValues: ['male'],
  })
  const intent = (count: number): IntentPage =>
    ({
      status: 'found',
      page: { id: 1, title: 'Wedding photographer in Dubai', previousSlugs: [{ slug: 'old', locale: 'en' }], intent: { intro: 'Tell us the date.' }, sections: [{ blockType: 'richText', anchor: 'intro', content: lexical('Hello') }] },
      slugs: { en: 'wedding-photographer-dubai', ar: 'مصور-اعراس-دبي' },
      builder: null,
      preset: { persona: 'photographer', location: 'dubai' },
      dropped: [],
      creators: Array.from({ length: count }, (_, i) => ({ creator: summary(String(i + 10)), view: {} as never, href: '' })),
      creatorTotal: count + 3,
      faq: [{ question: 'How soon?', answer: lexical('Within a day.') }],
      serviceName: '',
      areaServed: null,
      serviceType: null,
    }) as unknown as IntentPage
  const ctx = (locale: 'en' | 'ar' = 'en') => ({
    locale,
    base: 'https://shoot.example',
    contact: { whatsappNumber: null, whatsappMessage: null, phoneNumber: null },
    personas: [],
    categories: [],
    specialtyCounts: {},
    creators: [],
    directory: { lookups: { personas: new Map([['1', 'Photographer']]), specialties: new Map(), locations: new Map([['30', 'Dubai']]) }, prefix: 'SH' },
  })

  it('MR-US3-S4 sends the current path, the text, the preset, at most six creators and the FAQ as rich text', () => {
    const wire = hirePageV1.parse(toWireHirePage(intent(8), ctx()))
    expect(wire.path).toBe('/hire/wedding-photographer-dubai')
    expect(wire).toMatchObject({ title: 'Wedding photographer in Dubai', intro: 'Tell us the date.', builder: null, preset: { persona: 'photographer', location: 'dubai' }, creatorTotal: 11 })
    expect(wire.creators).toHaveLength(6)
    expect(wire.creators[0]).toMatchObject({ code: '0010', displayCode: 'SH-0010', places: ['Dubai'] })
    expect(wire.sections.map((s) => s.type)).toEqual(['richText'])
    expect(wire.faq).toEqual([{ question: 'How soon?', answer: { nodes: [{ type: 'paragraph', children: [{ type: 'text', text: 'Within a day.', bold: false, italic: false, underline: false, code: false }] }] } }])
    const json = JSON.stringify(wire)
    for (const key of ['matchValues', 'previousSlugs', 'dropped']) expect(json).not.toContain(key)
  })

  it('MR-US3-S4 the Arabic answer names the Arabic address', () => {
    expect(toWireHirePage(intent(1), ctx('ar')).path).toBe('/hire/مصور-اعراس-دبي')
  })
})
