import { ENDPOINTS, MESSAGE_KEY, PROBLEM_CODES } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import ar from '../../messages/ar.json'
import en from '../../messages/en.json'

type Tree = { [key: string]: string | Tree }

const lookup = (tree: Tree, key: string): string | undefined => {
  const value = key.split('.').reduce<string | Tree | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), tree)
  return typeof value === 'string' ? value : undefined
}

type Internals = { _zod: { def: Record<string, unknown> } }
const isSchema = (value: unknown): value is Internals => typeof value === 'object' && value !== null && '_zod' in value

/**
 * The custom messages a zod schema can emit, read from its definition tree: the schema's own
 * `error` and each check's (a string message is stored as a function returning it). Only messages
 * that are message keys count; a schema without one emits `api.errors.invalidField` (research R6).
 */
function messageKeys(schema: unknown, keys = new Set<string>(), seen = new Set<unknown>()): Set<string> {
  if (!isSchema(schema) || seen.has(schema)) return keys
  seen.add(schema)
  const def = schema._zod.def
  const emit = (error: unknown) => {
    if (typeof error !== 'function') return
    try {
      // A fixed message gives the same text for any issue; one built from the issue does not.
      const call = error as (issue: unknown) => unknown
      const message = call({ code: 'a', input: null })
      if (typeof message === 'string' && message === call({ code: 'b', input: 2 }) && MESSAGE_KEY.test(message)) keys.add(message)
    } catch {
      // A message function that needs a real issue: not a fixed key.
    }
  }
  emit(def.error)
  for (const check of (def.checks ?? []) as Internals[]) emit(check._zod.def.error)
  for (const [name, value] of Object.entries(def)) {
    if (name === 'getter' && typeof value === 'function') messageKeys((value as () => unknown)(), keys, seen)
    else if (isSchema(value)) messageKeys(value, keys, seen)
    else if (Array.isArray(value)) value.forEach((v) => messageKeys(v, keys, seen))
    else if (name === 'shape' && typeof value === 'object' && value !== null) Object.values(value).forEach((v) => messageKeys(v, keys, seen))
  }
  return keys
}

describe('MR-US2-S4 problem codes have words in both languages', () => {
  const inputKeys = new Set(ENDPOINTS.flatMap((e) => [...messageKeys(e.input)]))
  const codes = [...new Set([...PROBLEM_CODES, ...inputKeys])].sort()

  it('reads message keys out of an input schema', () => {
    const sample = z.object({
      query: z.object({ phone: z.string().regex(/^\+\d+$/, 'contact.errors.whatsappFormat').optional() }),
      body: z.array(z.union([z.string().min(1, { message: 'brief.errors.required' }), z.number()])),
      free: z.string().min(2, 'Too short'),
      dynamic: z.string().max(3, { error: (issue) => `brief.errors.${String(issue.code)}` }),
      throwing: z.string().max(3, { error: (issue) => (issue.input as unknown as { x: string }).x }),
    })
    expect([...messageKeys(sample)].sort()).toEqual(['brief.errors.required', 'contact.errors.whatsappFormat'])
  })

  it.each(codes)('%s exists in en.json and ar.json with text', (code) => {
    expect(lookup(en as Tree, code)?.trim(), `en ${code}`).toBeTruthy()
    expect(lookup(ar as Tree, code)?.trim(), `ar ${code}`).toBeTruthy()
  })
})
