import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, dirFor, isLocale, LOCALES, otherLocale } from './locale'

describe('locales', () => {
  it('English is the default, Arabic is right-to-left', () => {
    expect(LOCALES).toEqual(['en', 'ar'])
    expect(DEFAULT_LOCALE).toBe('en')
    expect(dirFor('ar')).toBe('rtl')
    expect(dirFor('en')).toBe('ltr')
    expect(dirFor('fr')).toBe('ltr')
  })

  it('validates locales and finds the other one', () => {
    expect(isLocale('ar')).toBe(true)
    expect(isLocale('de')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(otherLocale('en')).toBe('ar')
    expect(otherLocale('ar')).toBe('en')
  })
})
