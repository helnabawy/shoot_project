import { navigationV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import { toWireNavigation } from './wire'

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
