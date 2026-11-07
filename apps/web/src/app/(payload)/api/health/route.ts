import { sql } from '@payloadcms/db-postgres'
import { getPayloadClient } from '@/shared/lib/payload'

export const dynamic = 'force-dynamic'

/** Load-balancer health check: the app is up and the database answers. */
export async function GET() {
  try {
    const payload = await getPayloadClient()
    await (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle.execute(sql`select 1`)
    return Response.json({ status: 'ok', db: 'ok' })
  } catch {
    return Response.json({ status: 'error', db: 'unreachable' }, { status: 503 })
  }
}
