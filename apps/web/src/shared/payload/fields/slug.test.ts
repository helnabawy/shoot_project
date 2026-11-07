import { describe, expect, it } from 'vitest'
import { preventSlugChange, slugField, validateSlug } from './slug'

describe('slug field', () => {
  it.each(['photographer', 'wedding-engagement', 'a1'])('accepts %s', (v) => expect(validateSlug(v)).toBe(true))
  it.each(['Photographer', 'wedding--x', '-x', 'x_y', '', 3])('rejects %s', (v) => expect(validateSlug(v)).toMatch(/lowercase/))

  const run = (args: Record<string, unknown>) =>
    preventSlugChange({ field: { name: 'slug', type: 'text' }, req: {}, ...args } as never)

  it('is immutable after creation', () => {
    expect(() => run({ operation: 'update', value: 'new', originalDoc: { slug: 'old' } })).toThrow()
  })

  it('allows create, unchanged updates and first-time values', () => {
    expect(run({ operation: 'create', value: 'new' })).toBe('new')
    expect(run({ operation: 'update', value: 'same', originalDoc: { slug: 'same' } })).toBe('same')
    expect(run({ operation: 'update', value: 'x', originalDoc: {} })).toBe('x')
    expect(run({ operation: 'update', value: undefined, originalDoc: { slug: 'kept' } })).toBeUndefined()
  })

  it('builds a unique, indexed, required field with overrides', () => {
    const field = slugField({ name: 'value' })
    expect(field).toMatchObject({ name: 'value', unique: true, index: true, required: true })
  })
})
