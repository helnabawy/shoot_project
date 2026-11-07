import { describe, expect, it } from 'vitest'
import { joinList, listStyleFor } from './conjunctions'
import { interpolatePersonaCopy } from './interpolate'
import type { Persona } from './types'

const make = (singular: string, plural: string): Persona => ({
  id: singular,
  slug: singular.toLowerCase(),
  singular,
  plural,
  order: 1,
  active: true,
})
const photographer = make('Photographer', 'Photographers')
const videographer = make('Videographer', 'Videographers')
const teacher = make('Teacher', 'Teachers')
const arPhotographer = make('مصوّر', 'مصوّرون')
const arVideographer = make('مصوّر فيديو', 'مصوّرو فيديو')
const arTeacher = make('معلّم', 'معلّمون')

describe('FR-028 persona placeholders', () => {
  it('fills singular and plural from a single persona', () => {
    expect(interpolatePersonaCopy("I'm a {persona.singular}. Book {persona.plural}.", photographer)).toBe(
      "I'm a Photographer. Book Photographers.",
    )
  })

  it('US5-S2 joins the audience with "or" and "and"', () => {
    const list = [photographer, videographer, teacher]
    expect(interpolatePersonaCopy('Find a {personas.list}', list)).toBe('Find a photographer, videographer or teacher')
    expect(interpolatePersonaCopy('For {personas.listAnd}', [photographer, videographer])).toBe(
      'For photographer and videographer',
    )
  })

  it('uses the first persona for singular tokens when given a list', () => {
    expect(interpolatePersonaCopy('{persona.singular}', [videographer, photographer])).toBe('Videographer')
  })

  it('leaves unknown tokens verbatim', () => {
    expect(interpolatePersonaCopy('Hi {persona.nickname} {city}', photographer)).toBe('Hi {persona.nickname} {city}')
  })

  it('renders empty strings for an empty audience', () => {
    expect(interpolatePersonaCopy('[{persona.singular}][{personas.list}]', [])).toBe('[][]')
  })
})

describe('FR-041 placeholders in Arabic', () => {
  it('joins with أو and attaches و', () => {
    expect(interpolatePersonaCopy('ابحث عن {personas.list}', [arPhotographer, arVideographer, arTeacher], { locale: 'ar' })).toBe(
      'ابحث عن مصوّر، مصوّر فيديو أو معلّم',
    )
    expect(interpolatePersonaCopy('{personas.listAnd}', [arPhotographer, arTeacher], { locale: 'ar' })).toBe('مصوّر ومعلّم')
  })

  it('falls back to English list style for an unknown locale', () => {
    expect(listStyleFor('fr').or).toBe('or')
    expect(joinList(['a', 'b'], 'or', 'fr')).toBe('a or b')
  })

  it('handles empty and single-item lists', () => {
    expect(joinList([], 'or')).toBe('')
    expect(joinList(['only'], 'and', 'ar')).toBe('only')
  })
})
