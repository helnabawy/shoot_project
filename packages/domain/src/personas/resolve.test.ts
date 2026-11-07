import { describe, expect, it } from 'vitest'
import { categoriesForPersonas, refId, resolveActivePersonas } from './resolve'
import type { Category, Persona } from './types'

const p = (id: string, active = true, order = 100): Persona => ({
  id,
  slug: id,
  singular: id,
  plural: `${id}s`,
  order,
  active,
})
const photographer = p('photographer')
const videographer = p('videographer')
const teacher = p('teacher')
const retired = p('retired', false)

describe('FR-027 active persona resolution', () => {
  it('US5-S1 keeps the order from site settings, not the persona order field', () => {
    const result = resolveActivePersonas(['teacher', 'photographer', 'videographer'], [photographer, videographer, teacher])
    expect(result.map((x) => x.id)).toEqual(['teacher', 'photographer', 'videographer'])
  })

  it('US5-S3 skips inactive personas', () => {
    expect(resolveActivePersonas(['retired', 'photographer'], [retired, photographer]).map((x) => x.id)).toEqual(['photographer'])
  })

  it('skips dangling references and duplicates', () => {
    const result = resolveActivePersonas(['deleted', 'photographer', { id: 'photographer' }], [photographer])
    expect(result.map((x) => x.id)).toEqual(['photographer'])
  })

  it('accepts populated documents and numeric ids', () => {
    const numeric = { ...photographer, id: '7' }
    expect(resolveActivePersonas([{ id: 7 }], [numeric])).toHaveLength(1)
    expect(refId(7)).toBe('7')
    expect(refId({ id: 'x' })).toBe('x')
  })

  it('returns an empty audience when nothing is active', () => {
    expect(resolveActivePersonas([], [photographer])).toEqual([])
  })
})

describe('categories for the active audience', () => {
  const c = (id: string, personas: string[], order = 100, active = true, name = id): Category => ({
    id,
    slug: id,
    name,
    order,
    active,
    personas,
  })

  it('keeps active categories of active personas, sorted by order then name', () => {
    const categories = [
      c('wedding', ['photographer'], 2),
      c('maths', ['teacher'], 1),
      c('events', ['photographer', 'videographer'], 2, true, 'Events'),
      c('hidden', ['photographer'], 0, false),
      c('aerial', ['videographer'], 5),
    ]
    const result = categoriesForPersonas(categories, [photographer])
    expect(result.map((x) => x.id)).toEqual(['events', 'wedding'])
  })
})
