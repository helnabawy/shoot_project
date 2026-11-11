import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { consumeAllowance, RATE_WINDOW_MS, visitorKey } from './rate-limit'

type Row = { id: number; key: string; count: number; windowStart: string }

function fakeReq(rows: Row[] = [], headers: Record<string, string> = {}, context: Record<string, unknown> = {}) {
  const payload = {
    find: vi.fn(async ({ where }: { where: { key: { equals: string } } }) => ({ docs: rows.filter((r) => r.key === where.key.equals) })),
    create: vi.fn(async ({ data }: { data: Omit<Row, 'id'> }) => {
      rows.push({ id: rows.length + 1, ...data })
    }),
    update: vi.fn(async ({ id, data }: { id: number; data: Partial<Row> }) => {
      Object.assign(rows.find((r) => r.id === id) as Row, data)
    }),
  }
  const req = { payload, context, headers: new Headers(headers) } as unknown as PayloadRequest
  return { req, payload, rows }
}

describe('CP-FR-008 consumeAllowance', () => {
  const now = Date.parse('2026-11-07T10:00:00Z')

  it('creates the row on the first call and counts calls inside the window', async () => {
    const { req, payload, rows } = fakeReq()
    await consumeAllowance(req, 'upload:user:1', 2, 'media.upload.tooMany', now)
    expect(payload.create).toHaveBeenCalledOnce()
    expect(rows[0]).toMatchObject({ key: 'upload:user:1', count: 1 })
    await consumeAllowance(req, 'upload:user:1', 2, 'media.upload.tooMany', now + 1000)
    expect(rows[0]?.count).toBe(2)
  })

  it('refuses the call past the limit with a 429 carrying the message key', async () => {
    const { req, rows } = fakeReq([{ id: 1, key: 'k', count: 2, windowStart: new Date(now).toISOString() }])
    await expect(consumeAllowance(req, 'k', 2, 'media.upload.tooMany', now + 1000)).rejects.toMatchObject({
      status: 429,
      message: 'media.upload.tooMany',
    })
    expect(rows[0]?.count).toBe(2)
  })

  it('MR-US2-S8 the 429 carries the seconds to the end of the hourly window', async () => {
    const { req } = fakeReq([{ id: 1, key: 'k', count: 2, windowStart: new Date(now).toISOString() }])
    await expect(consumeAllowance(req, 'k', 2, 'api.errors.rateLimited', now + 1000)).rejects.toMatchObject({
      status: 429,
      data: { retryAfter: RATE_WINDOW_MS / 1000 - 1 },
    })
    await expect(consumeAllowance(req, 'k', 2, 'api.errors.rateLimited', now + RATE_WINDOW_MS - 1)).rejects.toMatchObject({
      data: { retryAfter: 1 },
    })
  })

  it('starts a fresh window once the old one has expired', async () => {
    const { req, rows } = fakeReq([{ id: 1, key: 'k', count: 9, windowStart: new Date(now).toISOString() }])
    await consumeAllowance(req, 'k', 2, 'media.upload.tooMany', now + RATE_WINDOW_MS + 1)
    expect(rows[0]).toMatchObject({ count: 1, windowStart: new Date(now + RATE_WINDOW_MS + 1).toISOString() })
  })

  it('keeps separate counters per key', async () => {
    const { req, rows } = fakeReq()
    await consumeAllowance(req, 'a', 1, 'm', now)
    await consumeAllowance(req, 'b', 1, 'm', now)
    expect(rows.map((r) => r.key)).toEqual(['a', 'b'])
  })
})

describe('visitorKey', () => {
  it('prefers the visitor cookie id, then the forwarded address, then the real address', () => {
    expect(visitorKey(fakeReq([], { 'x-forwarded-for': '1.1.1.1' }, { visitorId: 'abc' }).req)).toBe('abc')
    expect(visitorKey(fakeReq([], { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }).req)).toBe('1.1.1.1')
    expect(visitorKey(fakeReq([], { 'x-real-ip': '3.3.3.3' }).req)).toBe('3.3.3.3')
    expect(visitorKey(fakeReq().req)).toBe('anonymous')
  })
})
