import { getPaymentProvider, recordPaymentEvent } from '@/modules/payments'
import { env } from '@/shared/lib/env'
import { getPayloadClient } from '@/shared/lib/payload'

export const dynamic = 'force-dynamic'

/**
 * Stripe's payment notices (feature 020, research R3). Only a notice signed with STRIPE_WEBHOOK_SECRET is
 * read; a paid checkout is recorded once. Answers 400 for a bad signature, 500 when recording failed so
 * Stripe retries, else 200.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const event = getPaymentProvider(env()).readEvent(raw, request.headers.get('stripe-signature'), new Date())
  if (!event) return Response.json({ error: 'invalid signature' }, { status: 400 })
  try {
    const result = await recordPaymentEvent(await getPayloadClient(), event)
    return Response.json({ received: true, result })
  } catch (error) {
    console.error(`[payments] could not record a notice: ${(error as Error).message.slice(0, 120)}`)
    return Response.json({ error: 'not recorded' }, { status: 500 })
  }
}
