import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { briefBuilderV1, navigationV1, personasV1, siteV1 } from './site'

const example = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8')) as Record<string, unknown>

/** A copy of `value` without `key`. */
const without = (value: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key))

const cases: [string, z.ZodType, string][] = [
  ['siteV1', siteV1, 'site'],
  ['navigationV1', navigationV1, 'navigation'],
  ['personasV1', personasV1, 'personas'],
  ['briefBuilderV1', briefBuilderV1, 'brief-builder'],
]

describe.each(cases)('%s', (_name, schema, file) => {
  it('accepts its English and Arabic examples', () => {
    expect(schema.safeParse(example(file)).success).toBe(true)
    const ar = example(`${file}.ar`)
    expect(ar.locale).toBe('ar')
    expect(schema.safeParse(ar).success).toBe(true)
  })

  it('refuses a missing required field', () => {
    const value = example(file)
    for (const key of Object.keys(value)) expect(schema.safeParse(without(value, key)).success, key).toBe(false)
  })
})

describe('siteV1', () => {
  it('MR-US1-S1 takes an E.164 WhatsApp number or null', () => {
    const site = example('site') as z.input<typeof siteV1>
    expect(siteV1.safeParse({ ...site, whatsapp: { ...site.whatsapp, number: null } }).success).toBe(true)
    expect(siteV1.safeParse({ ...site, whatsapp: { ...site.whatsapp, number: '0501234567' } }).success).toBe(false)
  })

  it('MR-US1-S2 the Arabic example carries the written Arabic', () => {
    expect(siteV1.parse(example('site.ar')).labels.seeker).toBe('أحتاج مصوّرًا أو مصوّر فيديو')
  })
})

describe('navigationV1', () => {
  it('refuses a link with a language prefix', () => {
    const nav = example('navigation') as z.input<typeof navigationV1>
    expect(navigationV1.safeParse({ ...nav, header: [{ label: 'Creators', path: '/ar/creators' }] }).success).toBe(false)
  })
})

describe('personasV1', () => {
  it('MR-US1-S4 the personas are CMS data with categories pointing at them', () => {
    const { personas, categories } = personasV1.parse(example('personas'))
    expect(personas.map((p) => p.slug)).toEqual(['photographer', 'videographer'])
    const ids = new Set(personas.map((p) => p.id))
    for (const c of categories) expect(c.personaIds.every((id) => ids.has(id))).toBe(true)
  })
})

describe('briefBuilderV1', () => {
  it('accepts builder: null when the brief builder is off', () => {
    expect(briefBuilderV1.safeParse({ locale: 'en', builder: null }).success).toBe(true)
    expect(briefBuilderV1.safeParse({ locale: 'en' }).success).toBe(false)
  })

  it('refuses an unknown slot kind', () => {
    const value = example('brief-builder') as { locale: string; builder: { slots: { kind: string }[] } }
    const slots = value.builder.slots.map((s, i) => (i === 0 ? { ...s, kind: 'colour' } : s))
    expect(briefBuilderV1.safeParse({ ...value, builder: { ...value.builder, slots } }).success).toBe(false)
  })
})
