import { describe, expect, it } from 'vitest'
import { findUnknownPlaceholders, KNOWN_PLACEHOLDERS } from './placeholders'

describe('unknown placeholders in CMS copy', () => {
  it('ignores the known persona placeholders', () => {
    expect(findUnknownPlaceholders('Book {persona.plural} or {personas.list}')).toEqual([])
    expect(KNOWN_PLACEHOLDERS).toContain('personas.listAnd')
  })

  it('reports each unknown token once', () => {
    expect(findUnknownPlaceholders('{persona.name} and {city} and {city}')).toEqual(['persona.name', 'city'])
  })

  it('accepts a custom known list (brief sentence tokens)', () => {
    expect(findUnknownPlaceholders('I need a {persona} in {location}', ['persona'])).toEqual(['location'])
  })

  it('ignores text without braces', () => {
    expect(findUnknownPlaceholders('Plain text')).toEqual([])
  })
})
