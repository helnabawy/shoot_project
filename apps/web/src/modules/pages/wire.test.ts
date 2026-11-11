import { navigationV1, pageV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import type { SectionContext } from '@/modules/landing/wire'
import { toWireNavigation, toWirePage } from './wire'

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

describe('toWirePage', () => {
  const ctx: SectionContext = {
    locale: 'en',
    base: 'https://shoot.example',
    contact: { whatsappNumber: '+971500000001', whatsappMessage: 'Hi', phoneNumber: null },
    personas: [],
    categories: [],
    specialtyCounts: {},
    creators: [],
    directory: null,
  }
  const text = (t: string) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: t, format: 0 }] }] } }) as never

  it('MR-US4-S4 maps the title, the given current path and the sections, skipping an unknown block', () => {
    const seen: string[] = []
    const wire = pageV1.parse(
      toWirePage(
        { title: 'How it works', sections: [{ blockType: 'richText', anchor: 'intro', content: text('Brief, match, shoot.') }, { blockType: 'mystery' }] as never },
        '/how-it-works',
        { ...ctx, onUnknown: (t) => seen.push(t) },
      ),
    )
    expect(wire).toMatchObject({ locale: 'en', path: '/how-it-works', title: 'How it works' })
    expect(wire.sections).toHaveLength(1)
    expect(wire.sections[0]).toMatchObject({ type: 'richText', anchor: 'intro' })
    expect(seen).toEqual(['mystery'])
  })

  it('answers an empty section list for a page without sections', () => {
    expect(toWirePage({ title: 'Empty', sections: null }, '/empty', ctx).sections).toEqual([])
  })
})
