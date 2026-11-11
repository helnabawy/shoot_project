import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  articleV1,
  guideListV1,
  guidesRequestV1,
  legalDocumentV1,
  legalKindV1,
  legalVersionRequestV1,
  legalVersionsV1,
  legalVersionV1,
  pageV1,
} from './content'
import type { BlockV1 } from './common'

const example = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8')) as Record<string, unknown>

const without = (value: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key))

const cases: [string, z.ZodType, string][] = [
  ['guideListV1', guideListV1, 'guides'],
  ['articleV1', articleV1, 'guide'],
  ['pageV1', pageV1, 'page'],
  ['legalDocumentV1', legalDocumentV1, 'legal'],
  ['legalVersionsV1', legalVersionsV1, 'legal-versions'],
  ['legalVersionV1', legalVersionV1, 'legal-version'],
]

describe.each(cases)('%s', (_name, schema, file) => {
  it('accepts its example', () => {
    expect(schema.safeParse(example(file)).success).toBe(true)
  })

  it('refuses a missing required field', () => {
    const value = example(file)
    for (const key of Object.keys(value)) expect(schema.safeParse(without(value, key)).success, key).toBe(false)
  })
})

/** Every block type anywhere in a rich text, lists included. */
const kinds = (nodes: readonly BlockV1[], into = new Set<string>()): Set<string> => {
  for (const n of nodes) {
    into.add(n.type)
    if (n.type === 'list') n.items.forEach((item) => kinds(item, into))
  }
  return into
}

describe('the content examples', () => {
  it('MR-US4-S2 the guide example carries every block kind, a site link and an outside link', () => {
    const guide = articleV1.parse(example('guide'))
    expect(guide.title).toBe('How to brief a wedding photographer')
    expect([...kinds(guide.body.nodes)].sort()).toEqual(['heading', 'image', 'list', 'paragraph', 'quote'])
    const text = JSON.stringify(guide.body)
    expect(text).toContain('"href":"/creators"')
    expect(text).toContain('"type":"lineBreak"')
    expect(text).toContain('mailto:')
  })

  it('MR-US4-S4 the page example is "How it works" at its path', () => {
    const page = pageV1.parse(example('page'))
    expect(page).toMatchObject({ title: 'How it works', path: '/how-it-works' })
  })

  it('MR-US4-S5 the legal example is the terms, with the earlier version in its list', () => {
    expect(legalDocumentV1.parse(example('legal')).kind).toBe('terms')
    expect(legalVersionsV1.parse(example('legal-versions')).versions.map((v) => v.version)).toEqual([2, 1])
  })
})

describe('legalKindV1', () => {
  it('takes the three document kinds and refuses cookies', () => {
    for (const kind of ['terms', 'professional-terms', 'privacy']) expect(legalKindV1.safeParse(kind).success).toBe(true)
    expect(legalKindV1.safeParse('cookies').success).toBe(false)
  })
})

describe('legalVersionRequestV1', () => {
  const version = (v: string) => legalVersionRequestV1.safeParse({ params: { kind: 'terms', version: v } }).success

  it('takes 1 to 9999 and refuses 0, 10000 and anything else', () => {
    expect(version('1')).toBe(true)
    expect(version('9999')).toBe(true)
    for (const bad of ['0', '10000', '01', '-1', '1.5', 'one']) expect(version(bad), bad).toBe(false)
  })
})

describe('guidesRequestV1', () => {
  it('takes a page from 1 as a string and refuses 0', () => {
    expect(guidesRequestV1.safeParse({ query: { page: '2', category: 'weddings', author: 'sara' } }).success).toBe(true)
    expect(guidesRequestV1.safeParse({ query: {} }).success).toBe(true)
    expect(guidesRequestV1.safeParse({ query: { page: '0' } }).success).toBe(false)
  })
})
