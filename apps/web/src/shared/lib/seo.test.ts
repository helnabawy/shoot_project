import { describe, expect, it } from 'vitest'
import { alternates } from './seo'

describe('alternates', () => {
  it('uses one path for both languages', () => {
    expect(alternates('/guides', 'ar')).toEqual({
      canonical: '/ar/guides',
      languages: { en: '/guides', ar: '/ar/guides', 'x-default': '/guides' },
    })
    expect(alternates('/', 'en')).toEqual({ canonical: '/', languages: { en: '/', ar: '/ar', 'x-default': '/' } })
  })

  it('MP-FR-013 uses each language its own address when they differ', () => {
    expect(alternates({ en: '/studios', ar: '/استوديوهات' }, 'ar')).toEqual({
      canonical: '/ar/استوديوهات',
      languages: { en: '/studios', ar: '/ar/استوديوهات', 'x-default': '/studios' },
    })
    expect(alternates({ en: '/studios', ar: '/استوديوهات' }, 'en')?.canonical).toBe('/studios')
  })
})
