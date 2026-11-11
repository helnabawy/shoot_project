import { APIError, type PayloadRequest } from 'payload'

export const RATE_WINDOW_MS = 60 * 60 * 1000

/** Identifies an anonymous visitor: the visitor cookie set by the site, else the client IP. */
export function visitorKey(req: PayloadRequest): string {
  const fromContext = req.context?.visitorId
  if (typeof fromContext === 'string' && fromContext) return fromContext
  const forwarded = req.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers?.get?.('x-real-ip') || 'anonymous'
}

/**
 * Counts one action against `key`'s hourly allowance and refuses it past `limit` with a 429 that
 * carries `messageKey` and, in `data.retryAfter`, the seconds to the end of the window. The counters live in the `rate-limits` collection so the limit holds across
 * instances (Principle V). Used by the brief hook and by provider uploads.
 */
export async function consumeAllowance(
  req: PayloadRequest,
  key: string,
  limit: number,
  messageKey: string,
  now = Date.now(),
): Promise<void> {
  const found = await req.payload.find({
    collection: 'rate-limits',
    where: { key: { equals: key } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const row = found.docs[0]
  const windowOpen = row && now - Date.parse(row.windowStart) < RATE_WINDOW_MS
  if (row && windowOpen && row.count >= limit) {
    // Seconds until the window ends, so an API client can say when to try again (008 research R5).
    const retryAfter = Math.max(1, Math.ceil((Date.parse(row.windowStart) + RATE_WINDOW_MS - now) / 1000))
    throw new APIError(messageKey, 429, { retryAfter }, true)
  }
  if (!row) {
    await req.payload.create({
      collection: 'rate-limits',
      data: { key, count: 1, windowStart: new Date(now).toISOString() },
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.update({
      collection: 'rate-limits',
      id: row.id,
      data: windowOpen ? { count: row.count + 1 } : { count: 1, windowStart: new Date(now).toISOString() },
      overrideAccess: true,
      req,
    })
  }
}
