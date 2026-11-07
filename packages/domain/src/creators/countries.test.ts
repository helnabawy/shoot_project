import { describe, expect, it } from 'vitest'
import { COUNTRIES, GENDERS, isCountryCode, isGender, MAX_YEARS_EXPERIENCE } from './countries'

describe('CP-FR-011 nationality, gender and experience values', () => {
  it('lists every ISO 3166-1 alpha-2 country once, each named by the platform', () => {
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length)
    expect(COUNTRIES.length).toBeGreaterThan(240)
    const names = new Intl.DisplayNames(['en'], { type: 'region' })
    for (const code of COUNTRIES) expect(names.of(code)).not.toBe(code)
    expect(names.of('AE')).toBe('United Arab Emirates')
  })

  it.each([
    ['AE', true],
    ['IR', true],
    ['ae', false],
    ['XX', false],
    [42, false],
  ])('isCountryCode(%j) → %s', (value, expected) => {
    expect(isCountryCode(value)).toBe(expected)
  })

  it('gender is female or male only, stored as the "shot by" values', () => {
    expect(GENDERS).toEqual(['woman', 'man'])
    expect(isGender('woman')).toBe(true)
    expect(isGender('other')).toBe(false)
    expect(isGender(undefined)).toBe(false)
    expect(MAX_YEARS_EXPERIENCE).toBe(60)
  })
})
