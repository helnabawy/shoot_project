import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ENDPOINTS } from './endpoints'
import { defineEndpoint, marksDeprecated, noContentV1, pathParams, registryProblems } from './registry'

const examplesDir = join(import.meta.dirname, 'examples')
/** Reads an example from `examples/`; `undefined` when missing. */
const readExample = (name: string): unknown => {
  const file = join(examplesDir, `${name}.json`)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined
}

const thing = z.object({ name: z.string() })
const fake: Record<string, unknown> = { thing: { name: 'Omar K.' }, 'thing-bad': { name: 1 }, 'thing-body': { note: 'hi' } }
const files = { read: (name: string) => fake[name] }

const base = {
  id: 'thing',
  method: 'GET' as const,
  path: '/api/mobile/v1/things/{code}',
  auth: 'none' as const,
  cache: 'public' as const,
  input: z.object({ params: z.object({ code: z.string() }) }),
  output: thing,
  examples: ['thing'],
}

describe('defineEndpoint', () => {
  it('defaults the status, request examples and deprecation', () => {
    const e = defineEndpoint(base)
    expect(e).toMatchObject({ status: 200, requestExamples: [], deprecated: false })
    expect(defineEndpoint({ ...base, deprecated: true }).deprecated).toBe(true)
  })

  it('FR-033 is deprecated when a field of its answer is marked deprecated', () => {
    const output = z.object({ name: z.string(), old: z.string().meta({ deprecated: true }) })
    expect(marksDeprecated(output)).toBe(true)
    expect(defineEndpoint({ ...base, output }).deprecated).toBe(true)
    expect(marksDeprecated(thing)).toBe(false)
  })

  it('reads path params in order', () => {
    expect(pathParams('/api/mobile/v1/legal/{kind}/versions/{version}')).toEqual(['kind', 'version'])
    expect(pathParams('/api/mobile/v1/site')).toEqual([])
  })
})

describe('registryProblems', () => {
  it('accepts a sound registry, an empty one and a 204 command', () => {
    expect(registryProblems([], files)).toEqual([])
    const command = defineEndpoint({
      ...base,
      id: 'note',
      method: 'POST',
      path: '/api/mobile/v1/notes',
      status: 204,
      input: z.object({ body: z.object({ note: z.string() }) }),
      output: noContentV1,
      examples: [],
      requestExamples: ['thing-body'],
    })
    expect(registryProblems([defineEndpoint(base), command], files)).toEqual([])
  })

  it('refuses duplicate ids and routes, foreign paths and mismatched params', () => {
    const e = defineEndpoint(base)
    expect(registryProblems([e, e], files)).toEqual(['thing: duplicate id', 'thing: duplicate route GET /api/mobile/v1/things/{code}'])
    expect(registryProblems([defineEndpoint({ ...base, path: '/api/things/{code}' })], files)).toEqual(['thing: path must start with /api/mobile/v1/'])
    expect(registryProblems([defineEndpoint({ ...base, path: '/api/mobile/v1/things/{slug}' })], files)).toEqual([
      'thing: path params {slug} differ from input.params {code}',
    ])
    expect(registryProblems([defineEndpoint({ ...base, path: '/api/mobile/v1/things', input: z.object({}) })], files)).toEqual([])
  })

  it('refuses missing, unparsable or absent examples', () => {
    expect(registryProblems([defineEndpoint({ ...base, examples: [] })], files)).toEqual(['thing: names no example'])
    expect(registryProblems([defineEndpoint({ ...base, examples: ['nope'] })], files)).toEqual(['thing: example nope.json does not exist'])
    expect(registryProblems([defineEndpoint({ ...base, examples: ['thing-bad'] })], files)).toEqual(['thing: example thing-bad.json does not parse'])
    expect(registryProblems([defineEndpoint({ ...base, requestExamples: ['thing-body'] })], files)).toEqual([
      'thing: request example thing-body.json does not parse',
    ])
  })

  it('a 204 endpoint answers noContentV1 and names no example', () => {
    expect(registryProblems([defineEndpoint({ ...base, status: 204 })], files)).toEqual([
      'thing: a 204 endpoint answers noContentV1',
      'thing: a 204 endpoint names no example',
    ])
  })
})

describe('the v1 registry', () => {
  it('follows the registry rules', () => {
    expect(registryProblems(ENDPOINTS, { read: readExample })).toEqual([])
  })
})
