import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { checkCompatible } from './compat'
import { ENDPOINTS } from './endpoints'
import { PROBLEM_CODES } from './problems'
import { defineEndpoint } from './registry'
import { buildSnapshot, describeBreaks, serializeSnapshot, snapshotVerdict, sortKeys } from './snapshot'

const SNAPSHOT_FILE = join(import.meta.dirname, '../../../../../specs/contracts/mobile-api/v1.schema.json')
const UPDATE = process.env.UPDATE_API_SNAPSHOT === '1'

/** Properties never sent (contracts/mobile-api.md "Access results"). */
const INTERNAL = [
  'accessSalt',
  'matchValues',
  'gender',
  'briefLimitPerHour',
  'autoPublishEdits',
  'translationStatus',
  'quickMatch',
  'templates',
  'channels',
  'uploadedBy',
  'publishedBy',
  'previousSlugs',
  'email',
  'password',
]

/** Every property name declared anywhere in a JSON Schema tree. */
function propertyNames(node: unknown, names = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => propertyNames(n, names))
  else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'properties' && value !== null && typeof value === 'object') Object.keys(value).forEach((k) => names.add(k))
      propertyNames(value, names)
    }
  }
  return names
}

const thing = (output: z.ZodType) =>
  defineEndpoint({
    id: 'thing',
    method: 'GET',
    path: '/api/mobile/v1/things',
    auth: 'none',
    cache: 'public',
    input: z.object({}),
    output,
    examples: ['thing'],
  })

describe('buildSnapshot', () => {
  it('has the data-model shape with sorted keys and sorted problems', () => {
    const snapshot = buildSnapshot([thing(z.object({ name: z.string() }))], ['b.c', 'a.b'])
    expect(Object.keys(snapshot)).toEqual(['endpoints', 'problems', 'version'])
    expect(snapshot.problems).toEqual(['a.b', 'b.c'])
    expect(Object.keys(snapshot.endpoints.thing ?? {})).toEqual(['auth', 'cache', 'deprecated', 'input', 'method', 'output', 'path'])
    expect(snapshot.endpoints.thing?.output.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(sortKeys({ b: [{ d: 1, c: 2 }], a: null })).toEqual({ a: null, b: [{ c: 2, d: 1 }] })
    expect(serializeSnapshot(snapshot).endsWith('}\n')).toBe(true)
  })

  it('FR-033 marks a deprecated field, and removing it later is still breaking', () => {
    const before = buildSnapshot([thing(z.object({ name: z.string(), old: z.string().meta({ deprecated: true }) }))], [])
    const entry = before.endpoints.thing
    expect(entry?.deprecated).toBe(true)
    expect((entry?.output.properties as Record<string, { deprecated?: boolean }>).old?.deprecated).toBe(true)
    const after = buildSnapshot([thing(z.object({ name: z.string() }))], [])
    expect(checkCompatible(before, after)).toEqual([{ endpoint: 'thing', pointer: '/output/properties/old', rule: 'property removed' }])
  })
})

describe('snapshotVerdict', () => {
  const base = buildSnapshot([thing(z.object({ name: z.string() }))], ['api.errors.notFound'])

  it('is new without a committed file, and same when unchanged', () => {
    expect(snapshotVerdict(undefined, base)).toEqual({ status: 'new' })
    expect(snapshotVerdict(serializeSnapshot(base), base)).toEqual({ status: 'same' })
  })

  it('MR-US2-S1 accepts an additive change and records it', () => {
    const next = buildSnapshot([thing(z.object({ name: z.string(), city: z.string() }))], ['api.errors.notFound'])
    expect(snapshotVerdict(serializeSnapshot(base), next)).toEqual({ status: 'additive' })
    expect(serializeSnapshot(next)).toContain('"city"')
  })

  it('MR-US2-S2 refuses a breaking change and names it', () => {
    const next = buildSnapshot([thing(z.object({ fullName: z.string() }))], [])
    const verdict = snapshotVerdict(serializeSnapshot(base), next)
    expect(verdict.status).toBe('breaking')
    expect(verdict.status === 'breaking' && describeBreaks(verdict.breaks)).toBe(
      'thing /output/properties/name: property removed\nproblems /problems/api.errors.notFound: problem code removed',
    )
    expect(describeBreaks([{ endpoint: 'thing', pointer: '', rule: 'endpoint removed' }])).toBe('thing /: endpoint removed')
  })
})

describe('the committed snapshot (specs/contracts/mobile-api/v1.schema.json)', () => {
  const next = buildSnapshot(ENDPOINTS, PROBLEM_CODES)

  it('MR-US1-S6 names no internal property', () => {
    const names = propertyNames(next)
    expect(INTERNAL.filter((n) => names.has(n))).toEqual([])
    expect(names.has('quickMatchEnabled')).toBe(true)
  })

  it('MR-US2-S1 MR-US2-S2 matches the registry, or differs only additively', () => {
    const committed = existsSync(SNAPSHOT_FILE) ? readFileSync(SNAPSHOT_FILE, 'utf8') : undefined
    const verdict = snapshotVerdict(committed, next)
    if (verdict.status === 'breaking') {
      expect.fail(`breaking change to the v1 contract; it belongs in /api/mobile/v2:\n${describeBreaks(verdict.breaks)}`)
    }
    if (UPDATE && verdict.status !== 'same') {
      mkdirSync(dirname(SNAPSHOT_FILE), { recursive: true })
      writeFileSync(SNAPSHOT_FILE, serializeSnapshot(next))
      return
    }
    expect(verdict.status, 'the contract changed additively: run `pnpm --filter @shoot/domain api:snapshot`').toBe('same')
  })
})
