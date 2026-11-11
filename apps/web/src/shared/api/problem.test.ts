import { problemV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ApiProblem, fromZodError, isProblem, problem, problemResponse } from './problem'

describe('MR-US2-S6 problems', () => {
  it('problem() builds a valid problem that handlers can return', () => {
    const p = problem(404, 'api.errors.notFound')
    expect(p).toEqual({ type: 'about:blank', status: 404, code: 'api.errors.notFound' })
    expect(isProblem(p)).toBe(true)
    expect(isProblem({ ...p })).toBe(false)
    expect(isProblem(null)).toBe(false)
    expect(problemV1.parse(p)).toEqual(p)
    expect(new ApiProblem(p)).toMatchObject({ name: 'ApiProblem', message: 'api.errors.notFound', problem: p })
  })

  it('problemResponse sets the body, the problem content type and no-store', async () => {
    const fields = [{ path: 'query.page', code: 'api.errors.invalidField' }]
    const res = problemResponse(problem(422, 'api.errors.invalidInput', { fields }), { 'X-Request-Id': 'abc' })
    expect(res.status).toBe(422)
    expect(res.headers.get('content-type')).toBe('application/problem+json')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-request-id')).toBe('abc')
    expect(res.headers.get('retry-after')).toBeNull()
    expect(await res.json()).toEqual({ type: 'about:blank', status: 422, code: 'api.errors.invalidInput', fields })
  })

  it('a 429 carries Retry-After', async () => {
    const res = problemResponse(problem(429, 'api.errors.rateLimited', { retryAfter: 90 }))
    expect(res.headers.get('retry-after')).toBe('90')
    expect(problemV1.parse(await res.json()).retryAfter).toBe(90)
  })

  it('never carries a title, detail or stack', async () => {
    const leaky = Object.assign(problem(500, 'api.errors.unexpected'), { title: 'Boom', detail: 'db down', stack: 'at x' })
    const body = await problemResponse(leaky).json()
    expect(Object.keys(body).sort()).toEqual(['code', 'status', 'type'])
  })
})

describe('MR-US2-S6 fromZodError', () => {
  const schema = z.object({
    query: z.object({ page: z.string().regex(/^\d+$/), phone: z.string().regex(/^\+/, 'contact.errors.whatsappFormat') }),
    params: z.object({ code: z.string().min(1).max(3) }),
  })

  it('gives one entry per dotted path, the first issue winning, and keeps message keys', () => {
    const result = schema.safeParse({ query: { page: 'x', phone: '05' }, params: { code: '' } })
    expect(result.success).toBe(false)
    expect(fromZodError(result.error as z.ZodError)).toEqual([
      { path: 'query.page', code: 'api.errors.invalidField' },
      { path: 'query.phone', code: 'contact.errors.whatsappFormat' },
      { path: 'params.code', code: 'api.errors.invalidField' },
    ])
  })

  it('reports a missing object at its own path once', () => {
    const twice = z.object({ a: z.string().min(2).regex(/^z/) })
    const result = twice.safeParse({ a: 'b' })
    expect(fromZodError(result.error as z.ZodError)).toEqual([{ path: 'a', code: 'api.errors.invalidField' }])
    expect(fromZodError(schema.safeParse({}).error as z.ZodError).map((f) => f.path)).toEqual(['query', 'params'])
  })
})
