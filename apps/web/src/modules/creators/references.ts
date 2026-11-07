import type { Payload, PayloadRequest, Where } from 'payload'

/**
 * How many creator profiles match `where` in their published row OR their latest draft, so a
 * pending draft's references count too (delete guards, research §12). Depends on Payload only:
 * collection configs import it directly because the module's index pulls in server-only queries.
 */
export async function countProfileReferences(req: PayloadRequest, where: Where): Promise<number> {
  return countReferences(req.payload, where, req)
}

/** The same count without a request, for jobs that run outside one (the cleanup cron). */
export async function countReferences(payload: Payload, where: Where, req?: PayloadRequest): Promise<number> {
  const published = await payload.count({ collection: 'creator-profiles', where, req, overrideAccess: true })
  const latest = await payload.find({
    collection: 'creator-profiles',
    where,
    draft: true,
    limit: 1,
    depth: 0,
    select: {},
    req,
    overrideAccess: true,
  })
  return Math.max(published.totalDocs, latest.totalDocs)
}

/** A relationship value as Payload returns it (id or populated doc) to a string id. */
export function relId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return relId((value as { id?: unknown }).id)
  return String(value)
}
