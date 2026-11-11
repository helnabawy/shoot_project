import { describe, expect, it } from 'vitest'
import { MESSAGE_KEY, PROBLEM_CODES, PROBLEM_STATUSES, problemV1 } from './problems'

describe('PROBLEM_CODES', () => {
  it('are unique message keys', () => {
    expect(new Set(PROBLEM_CODES).size).toBe(PROBLEM_CODES.length)
    for (const code of PROBLEM_CODES) expect(code, code).toMatch(MESSAGE_KEY)
  })
})

describe('problemV1', () => {
  it('accepts each status of research R6', () => {
    for (const status of PROBLEM_STATUSES) {
      expect(problemV1.parse({ type: 'about:blank', status, code: 'api.errors.unexpected' }).status).toBe(status)
    }
    expect(problemV1.safeParse({ type: 'about:blank', status: 418, code: 'api.errors.unexpected' }).success).toBe(false)
  })

  it('refuses a code outside the list and another type', () => {
    expect(problemV1.safeParse({ type: 'about:blank', status: 404, code: 'api.errors.nope' }).success).toBe(false)
    expect(problemV1.safeParse({ type: 'https://x', status: 404, code: 'api.errors.notFound' }).success).toBe(false)
  })

  it('accepts fields on a 422 only', () => {
    const fields = [{ path: 'query.locale', code: 'api.errors.localeUnsupported' }]
    expect(problemV1.parse({ type: 'about:blank', status: 422, code: 'api.errors.invalidInput', fields }).fields).toEqual(fields)
    expect(problemV1.safeParse({ type: 'about:blank', status: 404, code: 'api.errors.notFound', fields }).success).toBe(false)
    expect(
      problemV1.safeParse({ type: 'about:blank', status: 422, code: 'api.errors.invalidInput', fields: [{ path: 'x', code: 'Not a key' }] }).success,
    ).toBe(false)
  })

  it('accepts retryAfter on a 429 only', () => {
    expect(problemV1.parse({ type: 'about:blank', status: 429, code: 'api.errors.rateLimited', retryAfter: 120 }).retryAfter).toBe(120)
    expect(problemV1.safeParse({ type: 'about:blank', status: 500, code: 'api.errors.unexpected', retryAfter: 1 }).success).toBe(false)
  })
})
