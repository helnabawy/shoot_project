import { describe, expect, it } from 'vitest'
import { localizeHref, stripLocale } from './href'

describe('locale-aware paths', () => {
  it('prefixes Arabic paths only', () => {
    expect(localizeHref('/register', 'en')).toBe('/register')
    expect(localizeHref('/register', 'ar')).toBe('/ar/register')
    expect(localizeHref('/', 'ar')).toBe('/ar')
    expect(localizeHref('#faq', 'ar')).toBe('#faq')
  })
  it('strips a locale prefix', () => {
    expect(stripLocale('/ar/register')).toBe('/register')
    expect(stripLocale('/ar')).toBe('/')
    expect(stripLocale('/en/account')).toBe('/account')
    expect(stripLocale('/arabic')).toBe('/arabic')
  })
})
