import { describe, expect, it } from 'vitest'
import { normaliseSlug, RESERVED_SLUGS, SLUG_MAX_LENGTH, validatePageSlug } from './slug'

describe('MP-US1-S5 validatePageSlug', () => {
  it.each(['studios', 'how-we-vet', 'a1', 'استوديوهات', 'شروط-الخدمة', 'page-2'])('accepts %s', (slug) => {
    expect(validatePageSlug(slug)).toBeNull()
  })

  it.each(RESERVED_SLUGS)('MP-EDGE-slug-reserved refuses the reserved word %s', (slug) => {
    expect(validatePageSlug(slug)).toBe('pages.slug.reserved')
  })

  it.each(['-a', 'a-', 'a--b', 'Studios', 'a b', 'a/b', 'a.b', '', 'ü', 'a_b'])('refuses the malformed address %j', (slug) => {
    expect(validatePageSlug(slug)).toBe('pages.slug.invalid')
  })

  it('refuses more than the maximum length', () => {
    expect(validatePageSlug('a'.repeat(SLUG_MAX_LENGTH))).toBeNull()
    expect(validatePageSlug('a'.repeat(SLUG_MAX_LENGTH + 1))).toBe('pages.slug.tooLong')
  })
})

describe('normaliseSlug', () => {
  it('trims, lower-cases and collapses repeated dashes', () => {
    expect(normaliseSlug('  Our--Studios ')).toBe('our-studios')
    expect(normaliseSlug('استوديو')).toBe('استوديو')
  })
})
