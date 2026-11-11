import { MESSAGE_KEY, type ProblemCode, type ProblemField, type ProblemStatus } from '@shoot/domain/api/v1'
import type { z } from 'zod'

/**
 * `application/problem+json` answers (008 research R6, contracts/handler.md). A problem carries a
 * code that is a message key, never a title, detail or stack.
 */

export interface Problem {
  type: 'about:blank'
  status: ProblemStatus
  code: ProblemCode
  fields?: ProblemField[]
  retryAfter?: number
}

const PROBLEM = Symbol('problem')

/** A problem value a handler returns (or throws inside `ApiProblem`). */
export function problem(status: ProblemStatus, code: ProblemCode, extra: { fields?: ProblemField[]; retryAfter?: number } = {}): Problem {
  const value: Problem = { type: 'about:blank', status, code }
  if (extra.fields) value.fields = extra.fields
  if (extra.retryAfter !== undefined) value.retryAfter = extra.retryAfter
  Object.defineProperty(value, PROBLEM, { value: true, enumerable: false })
  return value
}

/** True for a value made by `problem()`. */
export function isProblem(value: unknown): value is Problem {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[PROBLEM] === true
}

/** Thrown from deep inside a handler to answer with a problem. */
export class ApiProblem extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.code)
    this.name = 'ApiProblem'
  }
}

/** One field code per path (the first issue wins); a message key is kept, anything else is generic. */
export function fromZodError(error: z.ZodError): ProblemField[] {
  const fields = new Map<string, string>()
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.')
    if (fields.has(path)) continue
    fields.set(path, MESSAGE_KEY.test(issue.message) ? issue.message : 'api.errors.invalidField')
  }
  return [...fields].map(([path, code]) => ({ path, code }))
}

/** The response for a problem: its JSON body, `application/problem+json`, `no-store`, `Retry-After` on 429. */
export function problemResponse(value: Problem, headers: Record<string, string> = {}): Response {
  const body: Problem = { type: 'about:blank', status: value.status, code: value.code }
  if (value.fields) body.fields = value.fields
  if (value.retryAfter !== undefined) body.retryAfter = value.retryAfter
  const out = new Headers(headers)
  out.set('Content-Type', 'application/problem+json')
  out.set('Cache-Control', 'no-store')
  if (value.status === 429 && value.retryAfter !== undefined) out.set('Retry-After', String(value.retryAfter))
  return new Response(JSON.stringify(body), { status: value.status, headers: out })
}
