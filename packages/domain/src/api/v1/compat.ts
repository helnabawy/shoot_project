import type { Auth, CacheClass, Method } from './registry'

/**
 * The additive-only check between two contract snapshots (research R11, FR-032). It reads the JSON
 * Schema that `z.toJSONSchema` writes: `$ref`/`$defs`, `anyOf`/`oneOf` (nullable and unions),
 * `type` (a string or a list with `"null"`), `enum`/`const`, `required`, `properties`, `items`,
 * `additionalProperties` and the string, number and array bounds.
 */

export type JsonSchema = { [key: string]: unknown }

export interface SnapshotEndpoint {
  method: Method
  path: string
  auth: Auth
  cache: CacheClass
  deprecated: boolean
  input: JsonSchema
  output: JsonSchema
}

export interface Snapshot {
  version: 1
  endpoints: Record<string, SnapshotEndpoint>
  problems: string[]
}

/** One break: the endpoint id (or `problems`), a JSON pointer into its snapshot entry, the rule. */
export interface Break {
  endpoint: string
  pointer: string
  rule: string
}

type Mode = 'input' | 'output'

const AUTH_RANK: Record<Auth, number> = { none: 0, optional: 1, required: 2 }

const escape = (segment: string) => segment.replace(/~/g, '~0').replace(/\//g, '~1')

/** Follows `$ref`s (`#/$defs/...`) to the schema they name, keeping sibling keywords. */
function resolve(node: JsonSchema, root: JsonSchema): { node: JsonSchema; ref: string | null } {
  const ref = typeof node.$ref === 'string' ? node.$ref : null
  if (ref === null) return { node, ref }
  let target: unknown = root
  for (const segment of ref.replace(/^#\/?/, '').split('/').filter(Boolean)) {
    target = (target as JsonSchema)[segment.replace(/~1/g, '/').replace(/~0/g, '~')]
  }
  const { $ref: _ignored, ...rest } = node
  return { node: { ...(target as JsonSchema), ...rest }, ref }
}

const types = (node: JsonSchema): string[] => (Array.isArray(node.type) ? (node.type as string[]) : typeof node.type === 'string' ? [node.type] : [])

/** Splits off `null`: `type: [x, "null"]` or `anyOf: [x, { type: "null" }]`. */
function unwrapNull(node: JsonSchema): { core: JsonSchema; nullable: boolean } {
  const list = types(node)
  if (list.includes('null')) {
    const rest = list.filter((t) => t !== 'null')
    return { core: { ...node, type: rest.length === 1 ? rest[0] : rest }, nullable: true }
  }
  const union = node.anyOf as JsonSchema[] | undefined
  if (union?.some((b) => types(b).join() === 'null')) {
    const rest = union.filter((b) => types(b).join() !== 'null')
    const { anyOf: _ignored, ...others } = node
    return { core: rest.length === 1 ? { ...others, ...rest[0] } : { ...others, anyOf: rest }, nullable: true }
  }
  return { core: node, nullable: false }
}

/** A union branch's key: its `const` discriminator (`type=heading`), else its position. */
function branchKey(branch: JsonSchema, index: number): string {
  const props = (branch.properties ?? {}) as Record<string, JsonSchema>
  const name = Object.keys(props).find((k) => props[k]?.const !== undefined)
  return name === undefined ? `#${index}` : `${name}=${String(props[name]?.const)}`
}

const LOWER_BOUNDS = ['minLength', 'minimum', 'exclusiveMinimum', 'minItems'] as const
const UPPER_BOUNDS = ['maxLength', 'maximum', 'exclusiveMaximum', 'maxItems'] as const

class Comparer {
  readonly breaks: Break[] = []
  private readonly seen = new Set<string>()

  constructor(
    private readonly endpoint: string,
    private readonly oldRoot: JsonSchema,
    private readonly newRoot: JsonSchema,
    private readonly mode: Mode,
  ) {}

  private report(pointer: string, rule: string) {
    this.breaks.push({ endpoint: this.endpoint, pointer, rule })
  }

  compare(oldRaw: JsonSchema, newRaw: JsonSchema, pointer: string): void {
    const o = resolve(oldRaw, this.oldRoot)
    const n = resolve(newRaw, this.newRoot)
    if (o.ref !== null && n.ref !== null) {
      const pair = `${o.ref}|${n.ref}`
      if (this.seen.has(pair)) return
      this.seen.add(pair)
    }
    const { core: oc, nullable: oNull } = unwrapNull(o.node)
    const { core: nc, nullable: nNull } = unwrapNull(n.node)
    if (this.mode === 'output' && !oNull && nNull) this.report(pointer, 'answer field made nullable')
    if (this.mode === 'input' && oNull && !nNull) this.report(pointer, 'request field no longer accepts null')

    const oUnion = (oc.oneOf ?? oc.anyOf) as JsonSchema[] | undefined
    const nUnion = (nc.oneOf ?? nc.anyOf) as JsonSchema[] | undefined
    if (oUnion || nUnion) return this.compareUnion(oUnion ?? [oc], nUnion ?? [nc], pointer)

    const oTypes = types(oc).join()
    const nTypes = types(nc).join()
    if (oTypes !== '' && nTypes !== '' && oTypes !== nTypes) return this.report(pointer, 'type changed')
    if (oc.const !== undefined && nc.const !== undefined && oc.const !== nc.const) return this.report(pointer, 'const changed')

    if (this.mode === 'input') this.compareInputBounds(oc, nc, pointer)
    this.compareObject(oc, nc, pointer)
    if (oc.items && nc.items) this.compare(oc.items as JsonSchema, nc.items as JsonSchema, `${pointer}/items`)
  }

  private compareUnion(oldBranches: JsonSchema[], newBranches: JsonSchema[], pointer: string) {
    const next = new Map(newBranches.map((b, i) => [branchKey(b, i), { branch: b, index: i }]))
    oldBranches.forEach((branch, i) => {
      const match = next.get(branchKey(branch, i))
      if (match) this.compare(branch, match.branch, `${pointer}/oneOf/${match.index}`)
      else if (this.mode === 'input') this.report(pointer, 'request union narrowed')
    })
  }

  private compareInputBounds(o: JsonSchema, n: JsonSchema, pointer: string) {
    if (Array.isArray(n.enum) && !(Array.isArray(o.enum) && o.enum.every((v) => (n.enum as unknown[]).includes(v)))) {
      this.report(`${pointer}/enum`, 'request enum narrowed')
    }
    if (n.pattern !== undefined && n.pattern !== o.pattern) this.report(`${pointer}/pattern`, 'request pattern changed')
    for (const key of LOWER_BOUNDS) {
      if (n[key] !== undefined && (o[key] === undefined || (n[key] as number) > (o[key] as number))) this.report(`${pointer}/${key}`, 'request bound narrowed')
    }
    for (const key of UPPER_BOUNDS) {
      if (n[key] !== undefined && (o[key] === undefined || (n[key] as number) < (o[key] as number))) this.report(`${pointer}/${key}`, 'request bound narrowed')
    }
    if (n.additionalProperties === false && o.additionalProperties !== false && o.type === 'object') {
      this.report(pointer, 'request refuses extra properties')
    }
  }

  private compareObject(o: JsonSchema, n: JsonSchema, pointer: string) {
    const oProps = (o.properties ?? {}) as Record<string, JsonSchema>
    const nProps = (n.properties ?? {}) as Record<string, JsonSchema>
    const oReq = new Set((o.required ?? []) as string[])
    const nReq = new Set((n.required ?? []) as string[])
    for (const [key, schema] of Object.entries(oProps)) {
      const at = `${pointer}/properties/${escape(key)}`
      const next = nProps[key]
      if (next === undefined) {
        this.report(at, 'property removed')
        continue
      }
      if (this.mode === 'output' && oReq.has(key) && !nReq.has(key)) this.report(at, 'answer field made optional')
      if (this.mode === 'input' && !oReq.has(key) && nReq.has(key)) this.report(at, 'request field made required')
      this.compare(schema, next, at)
    }
    if (this.mode === 'input') {
      for (const key of Object.keys(nProps)) {
        if (!(key in oProps) && nReq.has(key)) this.report(`${pointer}/properties/${escape(key)}`, 'new required request field')
      }
    }
  }
}

/** Every non-additive difference from `old` to `next`; empty means `next` may replace `old`. */
export function checkCompatible(old: Snapshot, next: Snapshot): Break[] {
  const breaks: Break[] = []
  for (const [id, before] of Object.entries(old.endpoints)) {
    const after = next.endpoints[id]
    if (after === undefined) {
      breaks.push({ endpoint: id, pointer: '', rule: 'endpoint removed' })
      continue
    }
    if (before.method !== after.method) breaks.push({ endpoint: id, pointer: '/method', rule: 'method changed' })
    if (before.path !== after.path) breaks.push({ endpoint: id, pointer: '/path', rule: 'path changed' })
    if (AUTH_RANK[after.auth] > AUTH_RANK[before.auth]) breaks.push({ endpoint: id, pointer: '/auth', rule: 'auth tightened' })
    for (const mode of ['input', 'output'] as const) {
      const comparer = new Comparer(id, before[mode], after[mode], mode)
      comparer.compare(before[mode], after[mode], `/${mode}`)
      breaks.push(...comparer.breaks)
    }
  }
  for (const code of old.problems) {
    if (!next.problems.includes(code)) breaks.push({ endpoint: 'problems', pointer: `/problems/${escape(code)}`, rule: 'problem code removed' })
  }
  return breaks
}
