import { describe, expect, it } from 'vitest'
import { isSpokenLanguage, SPOKEN_LANGUAGES } from './languages'

describe('CP-FR-001 spoken languages', () => {
  it('is a curated list of lower-case codes with no duplicates, led by the site languages', () => {
    expect(SPOKEN_LANGUAGES.slice(0, 2)).toEqual(['en', 'ar'])
    expect(new Set(SPOKEN_LANGUAGES).size).toBe(SPOKEN_LANGUAGES.length)
    for (const code of SPOKEN_LANGUAGES) expect(code).toMatch(/^[a-z]{2}$/)
  })

  it('recognises listed codes only', () => {
    expect(isSpokenLanguage('ur')).toBe(true)
    expect(isSpokenLanguage('xx')).toBe(false)
    expect(isSpokenLanguage('EN')).toBe(false)
    expect(isSpokenLanguage('')).toBe(false)
  })
})
