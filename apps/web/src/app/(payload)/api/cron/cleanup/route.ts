import { getPayloadClient } from '@/shared/lib/payload'
import { RATE_WINDOW_MS } from '@/modules/brief/limits'
import { deleteOrphanedUploads } from '@/modules/creators/cleanup'

export const dynamic = 'force-dynamic'

/**
 * Deletes expired rate-limit windows and provider uploads that no profile uses after 24 hours.
 * Call every 15 minutes with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const payload = await getPayloadClient()
  const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString()
  const result = await payload.delete({
    collection: 'rate-limits',
    where: { windowStart: { less_than: cutoff } },
    overrideAccess: true,
  })
  const orphanedUploads = await deleteOrphanedUploads(payload)
  return Response.json({ deleted: result.docs.length, orphanedUploads })
}
