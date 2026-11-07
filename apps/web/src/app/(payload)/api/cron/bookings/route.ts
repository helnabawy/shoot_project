import { runBookingClock } from '@/modules/booking/clock'
import { getPayloadClient } from '@/shared/lib/payload'

export const dynamic = 'force-dynamic'

/** End-to-end runs may move the clock; never in production (env validation refuses E2E_CLOCK there). */
function clockFor(request: Request): Date {
  const testClock = process.env.NODE_ENV === 'test' || process.env.E2E_CLOCK === '1'
  const override = testClock ? request.headers.get('x-test-now') : null
  const parsed = override ? new Date(override) : null
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
}

/**
 * Quick Match clock (research §12): expiries, lapses, shoot days, unconfirmed deliveries.
 * Call every 15 minutes with `Authorization: Bearer $CRON_SECRET`, next to /api/cron/cleanup.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const payload = await getPayloadClient()
  return Response.json(await runBookingClock(payload, clockFor(request)))
}
