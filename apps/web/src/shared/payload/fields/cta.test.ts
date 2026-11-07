import { describe, expect, it } from 'vitest'
import { ctaGroup, CTA_KINDS } from './cta'

describe('CTA group field', () => {
  it('has a localised label, a kind and a conditional href', () => {
    const group = ctaGroup('primary') as unknown as { name: string; label: string; fields: unknown[] }
    expect(group.name).toBe('primary')
    expect(group.label).toBe('primary')
    expect((ctaGroup('x', 'Main action') as { label?: unknown }).label).toBe('Main action')
    const [label, kind, href] = group.fields as unknown as [Record<string, unknown>, Record<string, unknown>, { admin: { condition: (a: unknown, s: unknown) => boolean } }]
    expect(label).toMatchObject({ name: 'label', localized: true })
    expect(kind).toMatchObject({ name: 'kind', defaultValue: 'whatsapp' })
    expect(href.admin.condition({}, { kind: 'link' })).toBe(true)
    expect(href.admin.condition({}, { kind: 'whatsapp' })).toBe(false)
    expect(CTA_KINDS).toEqual(['whatsapp', 'link', 'call'])
  })
})
