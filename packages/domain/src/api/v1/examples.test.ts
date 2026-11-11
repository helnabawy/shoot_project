import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'
import { problemV1 } from './problems'

const EXAMPLES = join(import.meta.dirname, 'examples')
const INVENTORY = join(import.meta.dirname, '../../../../../specs/008-mobile-api/contracts/mobile-api.md')

const read = (name: string): unknown => JSON.parse(readFileSync(join(EXAMPLES, `${name}.json`), 'utf8'))
const files = readdirSync(EXAMPLES)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -'.json'.length))
  .sort()

type Claim = { by: string; parses: (value: unknown) => boolean }

/** Who claims each example: an endpoint (answer or request body), a problem, or the app-link prefixes. */
function claimsOf(name: string): Claim[] {
  const claims: Claim[] = []
  for (const e of ENDPOINTS) {
    if (e.examples.includes(name)) claims.push({ by: `${e.id} answer`, parses: (v) => e.output.safeParse(v).success })
    if (e.requestExamples.includes(name)) claims.push({ by: `${e.id} request`, parses: (v) => e.input.shape.body?.safeParse(v).success === true })
  }
  if (name.startsWith('problem-')) claims.push({ by: 'problem', parses: (v) => problemV1.safeParse(v).success })
  if (name === 'app-links') {
    claims.push({ by: 'app links', parses: (v) => Array.isArray((v as { prefixes?: unknown }).prefixes) })
  }
  return claims
}

describe('MR-US2-S3 the examples', () => {
  it('exist', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it.each(files)('%s.json is claimed by exactly one endpoint, problem or app-link entry, and parses', (name) => {
    const claims = claimsOf(name)
    expect(claims.map((c) => c.by)).toHaveLength(1)
    expect((claims[0] as Claim).parses(read(name))).toBe(true)
  })

  it('include the 422 and 404 problems', () => {
    expect(files).toEqual(expect.arrayContaining(['problem-404', 'problem-422']))
  })
})

interface Row {
  id: string
  method: string
  path: string
  auth: string
  cache: string
}

/** The table abbreviates `optional` and `required`. */
const AUTH: Record<string, string> = { opt: 'optional', req: 'required' }

/** The rows of the "Endpoint inventory" table that name an endpoint id. */
function inventoryRows(markdown: string): Row[] {
  const section = markdown.split('## Endpoint inventory')[1]?.split('\n## ')[0] ?? ''
  const rows: Row[] = []
  for (const line of section.split('\n')) {
    const cells = line.split('|').map((c) => c.trim())
    const id = /^`(\w+)`$/.exec(cells[1] ?? '')?.[1]
    const route = /^`(GET|POST|PATCH|PUT|DELETE) (\/[^`?]*)(\?[^`]*)?`$/.exec(cells[2] ?? '')
    if (id === undefined || route === null) continue
    rows.push({ id, method: route[1] as string, path: `/api/mobile/v1${route[2] as string}`, auth: AUTH[cells[3] as string] ?? (cells[3] as string), cache: cells[4] as string })
  }
  return rows
}

describe('MR-US2-S3 the inventory table in contracts/mobile-api.md', () => {
  const rows = inventoryRows(readFileSync(INVENTORY, 'utf8'))
  const byId = new Map(rows.map((r) => [r.id, r]))
  const registered = new Set(ENDPOINTS.map((e) => e.id))

  it('lists each id once', () => {
    expect(rows.length).toBeGreaterThan(0)
    expect(byId.size).toBe(rows.length)
  })

  // Until every 008 endpoint is registered (US5), the table may list endpoints the registry does
  // not have yet; when US5 lands this becomes an exact match in both directions.
  it.each(ENDPOINTS.map((e) => [e.id, e] as const))('has a row matching the registered %s', (_id, e) => {
    expect(byId.get(e.id)).toEqual({ id: e.id, method: e.method, path: e.path, auth: e.auth, cache: e.cache })
  })

  it('every row whose id is registered matches the registry', () => {
    for (const row of rows.filter((r) => registered.has(r.id))) {
      const e = ENDPOINTS.find((x) => x.id === row.id)
      expect(row, row.id).toEqual({ id: e?.id, method: e?.method, path: e?.path, auth: e?.auth, cache: e?.cache })
    }
  })
})
