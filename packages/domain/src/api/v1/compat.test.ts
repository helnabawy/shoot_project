import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { checkCompatible, type Snapshot } from './compat'
import { richTextV1 } from './common'
import { defineEndpoint, type Auth, type Method } from './registry'
import { buildSnapshot } from './snapshot'

interface Spec {
  id?: string
  method?: Method
  path?: string
  auth?: Auth
  query?: z.ZodType
  output?: z.ZodType
}

const thing = z.object({ name: z.string(), kind: z.enum(['photo', 'video']), years: z.int().nullable() })
const query = z.object({ page: z.int().min(1).max(100).optional(), sort: z.enum(['new', 'old']).optional() })

/** A one-endpoint snapshot (plus any extra endpoints), built as the real one is. */
function snap(spec: Spec = {}, problems: string[] = ['api.errors.notFound'], extra: Spec[] = []): Snapshot {
  const define = (s: Spec) =>
    defineEndpoint({
      id: s.id ?? 'thing',
      method: s.method ?? 'GET',
      path: s.path ?? '/api/mobile/v1/things',
      auth: s.auth ?? 'none',
      cache: 'public',
      input: z.object({ query: s.query ?? query }),
      output: s.output ?? thing,
      examples: ['thing'],
    })
  return buildSnapshot([define(spec), ...extra.map(define)], problems)
}

const rules = (old: Snapshot, next: Snapshot) => checkCompatible(old, next).map((b) => `${b.endpoint} ${b.pointer}: ${b.rule}`)

describe('MR-US2-S1 additive changes pass', () => {
  it('the same snapshot', () => {
    expect(checkCompatible(snap(), snap())).toEqual([])
  })

  it('a new endpoint', () => {
    expect(checkCompatible(snap(), snap({}, undefined, [{ id: 'other', path: '/api/mobile/v1/other' }]))).toEqual([])
  })

  it('a new optional query field, or a wider request enum or range', () => {
    const next = z.object({ page: z.int().min(0).optional(), sort: z.enum(['new', 'old', 'near']).optional(), place: z.string().optional() })
    expect(checkCompatible(snap(), snap({ query: next }))).toEqual([])
  })

  it('a new answer field, required or not', () => {
    expect(checkCompatible(snap(), snap({ output: thing.extend({ city: z.string(), note: z.string().optional() }) }))).toEqual([])
  })

  it('a new answer enum value', () => {
    expect(checkCompatible(snap(), snap({ output: thing.extend({ kind: z.enum(['photo', 'video', 'drone']) }) }))).toEqual([])
  })

  it('a new problem code', () => {
    expect(checkCompatible(snap(), snap({}, ['api.errors.notFound', 'api.errors.rateLimited']))).toEqual([])
  })

  it('auth loosened from optional to none', () => {
    expect(checkCompatible(snap({ auth: 'optional' }), snap({ auth: 'none' }))).toEqual([])
  })

  it('an untyped answer field gaining a type, and recursive shapes through $defs', () => {
    const before = z.object({ data: z.unknown(), body: richTextV1 })
    const after = z.object({ data: z.string(), body: richTextV1 })
    expect(checkCompatible(snap({ output: before }), snap({ output: after }))).toEqual([])
  })

  it('a new variant in an answer union', () => {
    const a = z.object({ type: z.literal('a'), x: z.string() })
    const b = z.object({ type: z.literal('b') })
    expect(checkCompatible(snap({ output: z.object({ s: z.discriminatedUnion('type', [a]) }) }), snap({ output: z.object({ s: z.discriminatedUnion('type', [a, b]) }) }))).toEqual([])
  })
})

describe('MR-US2-S2 breaking changes fail with endpoint id and JSON pointer', () => {
  it('a removed endpoint', () => {
    expect(rules(snap({}, undefined, [{ id: 'other', path: '/api/mobile/v1/other' }]), snap())).toEqual(['other : endpoint removed'])
  })

  it('a changed path or method', () => {
    expect(rules(snap(), snap({ path: '/api/mobile/v1/stuff', method: 'POST' }))).toEqual(['thing /method: method changed', 'thing /path: path changed'])
  })

  it('a removed or renamed answer field', () => {
    expect(rules(snap(), snap({ output: z.object({ fullName: z.string(), kind: thing.shape.kind, years: thing.shape.years }) }))).toEqual([
      'thing /output/properties/name: property removed',
    ])
  })

  it('an answer field made optional', () => {
    expect(rules(snap(), snap({ output: thing.extend({ name: z.string().optional() }) }))).toEqual(['thing /output/properties/name: answer field made optional'])
  })

  it('an answer field made nullable, a value or an object', () => {
    expect(rules(snap(), snap({ output: thing.extend({ name: z.string().nullable() }) }))).toEqual(['thing /output/properties/name: answer field made nullable'])
    const place = z.object({ city: z.string() })
    expect(rules(snap({ output: z.object({ place }) }), snap({ output: z.object({ place: place.nullable() }) }))).toEqual([
      'thing /output/properties/place: answer field made nullable',
    ])
  })

  it('a type change, and a changed const', () => {
    expect(rules(snap(), snap({ output: thing.extend({ name: z.number() }) }))).toEqual(['thing /output/properties/name: type changed'])
    expect(rules(snap({ output: z.object({ v: z.literal('a') }) }), snap({ output: z.object({ v: z.literal('b') }) }))).toEqual([
      'thing /output/properties/v: const changed',
    ])
  })

  it('a break inside a list item and inside a union variant', () => {
    const list = (item: z.ZodType) => z.object({ items: z.array(item) })
    expect(rules(snap({ output: list(thing) }), snap({ output: list(thing.omit({ kind: true })) }))).toEqual([
      'thing /output/properties/items/items/properties/kind: property removed',
    ])
    const variant = (x: z.ZodType) => z.object({ s: z.discriminatedUnion('type', [z.object({ type: z.literal('a') }), z.object({ type: z.literal('b'), x })]).nullable() })
    expect(rules(snap({ output: variant(z.string()) }), snap({ output: variant(z.int()) }))).toEqual(['thing /output/properties/s/oneOf/1/properties/x: type changed'])
  })

  it('a new required request field, or an optional one made required', () => {
    expect(rules(snap(), snap({ query: query.extend({ place: z.string() }) }))).toEqual(['thing /input/properties/query/properties/place: new required request field'])
    expect(rules(snap(), snap({ query: query.extend({ page: z.int().min(1).max(100) }) }))).toEqual([
      'thing /input/properties/query/properties/page: request field made required',
    ])
  })

  it('a narrowed request enum, pattern, length or range', () => {
    const at = 'thing /input/properties/query/properties'
    expect(rules(snap(), snap({ query: query.extend({ sort: z.enum(['new']).optional() }) }))).toEqual([`${at}/sort/enum: request enum narrowed`])
    expect(rules(snap(), snap({ query: query.extend({ page: z.int().min(2).max(50).optional() }) }))).toEqual([
      `${at}/page/minimum: request bound narrowed`,
      `${at}/page/maximum: request bound narrowed`,
    ])
    const code = (s: z.ZodString) => z.object({ code: s.optional() })
    expect(rules(snap({ query: code(z.string()) }), snap({ query: code(z.string().regex(/^[A-Z]+$/).max(16)) }))).toEqual([
      'thing /input/properties/query/properties/code/pattern: request pattern changed',
      'thing /input/properties/query/properties/code/maxLength: request bound narrowed',
    ])
    expect(rules(snap({ query: code(z.string()) }), snap({ query: code(z.string().min(1)) }))).toEqual(['thing /input/properties/query/properties/code/minLength: request bound narrowed'])
  })

  it('a request that no longer takes null, a variant, or extra properties', () => {
    const at = 'thing /input/properties/query/properties'
    expect(rules(snap({ query: z.object({ q: z.string().nullable() }) }), snap({ query: z.object({ q: z.string() }) }))).toEqual([`${at}/q: request field no longer accepts null`])
    const [a, b, c] = [z.object({ a: z.string() }), z.object({ b: z.string() }), z.object({ c: z.string() })]
    expect(rules(snap({ query: z.object({ q: z.union([a, b, c]) }) }), snap({ query: z.object({ q: z.union([a, b]) }) }))).toEqual([
      `${at}/q: request union narrowed`,
    ])
    expect(rules(snap({ query: z.object({ q: z.string() }) }), snap({ query: z.strictObject({ q: z.string() }) }))).toEqual([
      'thing /input/properties/query: request refuses extra properties',
    ])
  })

  it('auth tightened from none to optional', () => {
    expect(rules(snap(), snap({ auth: 'optional' }))).toEqual(['thing /auth: auth tightened'])
  })

  it('a removed problem code, with the code as pointer', () => {
    expect(rules(snap(), snap({}, []))).toEqual(['problems /problems/api.errors.notFound: problem code removed'])
  })

  it('escapes a property name in the pointer', () => {
    expect(rules(snap({ output: z.object({ 'a/b~c': z.string() }) }), snap({ output: z.object({}) }))).toEqual(['thing /output/properties/a~1b~0c: property removed'])
  })
})
