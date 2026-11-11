import { z } from 'zod'
import { checkCompatible, type Break, type JsonSchema, type Snapshot } from './compat'
import type { Endpoint } from './registry'

/**
 * The contract snapshot `specs/contracts/mobile-api/v1.schema.json` (data-model.md "Snapshot",
 * research R11): every endpoint's method, path, access and JSON Schemas, plus the problem codes.
 */

const toSchema = (schema: z.ZodType, io: 'input' | 'output') => z.toJSONSchema(schema, { target: 'draft-2020-12', io }) as JsonSchema

/** A copy of `value` with every object's keys sorted, for stable diffs. */
export function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeys) as T
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    ) as T
  }
  return value
}

export function buildSnapshot(endpoints: readonly Endpoint[], problems: readonly string[]): Snapshot {
  return sortKeys({
    version: 1,
    endpoints: Object.fromEntries(
      endpoints.map((e) => [
        e.id,
        {
          method: e.method,
          path: e.path,
          auth: e.auth,
          cache: e.cache,
          deprecated: e.deprecated,
          input: toSchema(e.input, 'input'),
          output: toSchema(e.output, 'output'),
        },
      ]),
    ),
    problems: [...problems].sort(),
  })
}

/** The file's text: two-space JSON with a final newline. */
export const serializeSnapshot = (snapshot: Snapshot) => `${JSON.stringify(snapshot, null, 2)}\n`

export type SnapshotVerdict =
  /** No committed snapshot yet: write the first one. */
  | { status: 'new' }
  | { status: 'same' }
  /** Differs, but only by additions: run `api:snapshot` to record it. */
  | { status: 'additive' }
  | { status: 'breaking'; breaks: Break[] }

/** How the regenerated snapshot relates to the committed text (`undefined` when there is no file). */
export function snapshotVerdict(committed: string | undefined, next: Snapshot): SnapshotVerdict {
  if (committed === undefined) return { status: 'new' }
  if (committed === serializeSnapshot(next)) return { status: 'same' }
  const breaks = checkCompatible(JSON.parse(committed) as Snapshot, next)
  return breaks.length > 0 ? { status: 'breaking', breaks } : { status: 'additive' }
}

/** The breaks as lines: `landing /output/properties/hero: property removed`. */
export const describeBreaks = (breaks: readonly Break[]) => breaks.map((b) => `${b.endpoint} ${b.pointer || '/'}: ${b.rule}`).join('\n')
