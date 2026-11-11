import { z } from 'zod'

/**
 * How an endpoint is declared (data-model.md "Endpoint definition", research R11). The web handler
 * spreads its definition into `defineHandler`, so auth, cache, input and output cannot drift from
 * the contract.
 */

export type Auth = 'none' | 'optional' | 'required'
export type CacheClass = 'public' | 'no-store'
export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type SuccessStatus = 200 | 202 | 204

/** The input every endpoint declares: one object with optional `params`, `query` and `body`. */
export type EndpointInput = z.ZodObject<{ params?: z.ZodType; query?: z.ZodType; body?: z.ZodType }>

/** The answer of a 204 endpoint: no body. */
export const noContentV1 = z.null()

export interface EndpointSpec<I extends EndpointInput = EndpointInput, O extends z.ZodType = z.ZodType> {
  /** camelCase; the snapshot key. */
  id: string
  method: Method
  /** `/api/mobile/v1/...` with `{param}` segments; equals the route file location. */
  path: string
  auth: Auth
  cache: CacheClass
  /** Success status, 200 by default. A 204 endpoint answers `noContentV1` and names no example. */
  status?: SuccessStatus
  input: I
  output: O
  /** Example file names (without `.json`) in `examples/`; each parses with `output`. */
  examples: readonly string[]
  /** Request-body examples; each parses with `input.shape.body`. */
  requestExamples?: readonly string[]
  deprecated?: boolean
}

export interface Endpoint<I extends EndpointInput = EndpointInput, O extends z.ZodType = z.ZodType> extends EndpointSpec<I, O> {
  status: SuccessStatus
  requestExamples: readonly string[]
  /** True when the endpoint, or any field of its answer, is marked `.meta({ deprecated: true })` (FR-033). */
  deprecated: boolean
}

/** True when the JSON Schema of `schema` marks anything `deprecated`. */
export function marksDeprecated(schema: z.ZodType): boolean {
  const json = z.toJSONSchema(schema, { io: 'output', unrepresentable: 'any' })
  return JSON.stringify(json).includes('"deprecated":true')
}

export function defineEndpoint<I extends EndpointInput, O extends z.ZodType>(spec: EndpointSpec<I, O>): Endpoint<I, O> {
  return {
    ...spec,
    status: spec.status ?? 200,
    requestExamples: spec.requestExamples ?? [],
    deprecated: Boolean(spec.deprecated) || marksDeprecated(spec.output),
  }
}

const PREFIX = '/api/mobile/v1/'

/** The `{param}` names of a path, in order. */
export function pathParams(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] as string)
}

/** The keys `input.params` declares. */
function declaredParams(input: EndpointInput): string[] {
  const params = input.shape.params
  return params instanceof z.ZodObject ? Object.keys(params.shape) : []
}

export interface RegistryFiles {
  /** The decoded example, or `undefined` when the file does not exist. */
  read: (name: string) => unknown
}

/**
 * The registry rules (T009): unique ids and `(method, path)`, paths under `/api/mobile/v1/` whose
 * `{param}`s equal `input.params`, examples that exist and parse, 204 endpoints without a body or
 * example. Returns one message per problem; empty means the registry is sound.
 */
export function registryProblems(endpoints: readonly Endpoint[], files: RegistryFiles): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  const routes = new Set<string>()
  for (const e of endpoints) {
    if (ids.has(e.id)) problems.push(`${e.id}: duplicate id`)
    ids.add(e.id)
    const route = `${e.method} ${e.path}`
    if (routes.has(route)) problems.push(`${e.id}: duplicate route ${route}`)
    routes.add(route)
    if (!e.path.startsWith(PREFIX)) problems.push(`${e.id}: path must start with ${PREFIX}`)
    const inPath = pathParams(e.path).sort()
    const declared = declaredParams(e.input).sort()
    if (inPath.join(',') !== declared.join(',')) {
      problems.push(`${e.id}: path params {${inPath.join(', ')}} differ from input.params {${declared.join(', ')}}`)
    }
    if (e.status === 204) {
      if (e.output !== noContentV1) problems.push(`${e.id}: a 204 endpoint answers noContentV1`)
      if (e.examples.length > 0) problems.push(`${e.id}: a 204 endpoint names no example`)
    } else if (e.examples.length === 0) {
      problems.push(`${e.id}: names no example`)
    }
    const check = (names: readonly string[], schema: z.ZodType | undefined, what: string) => {
      for (const name of names) {
        const value = files.read(name)
        if (value === undefined) {
          problems.push(`${e.id}: ${what} ${name}.json does not exist`)
        } else if (!schema?.safeParse(value).success) {
          problems.push(`${e.id}: ${what} ${name}.json does not parse`)
        }
      }
    }
    check(e.examples, e.output, 'example')
    check(e.requestExamples, e.input.shape.body, 'request example')
  }
  return problems
}
