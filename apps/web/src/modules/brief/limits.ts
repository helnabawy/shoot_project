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
 * Counts an anonymous brief against the visitor's hourly allowance and refuses it past the limit
 * (FR-050). Shared by every write path because it runs in the `briefs` beforeChange hook.
 */
export async function consumeBriefAllowance(req: PayloadRequest, limit: number, now = Date.now()): Promise<void> {
  const key = `brief:${visitorKey(req)}`
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
    throw new APIError('brief.errors.tooMany', 429, undefined, true)
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
