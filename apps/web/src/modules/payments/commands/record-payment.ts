import { filsToAed, paymentOutcome } from '@shoot/domain/payments'
import { formatMoney } from '@shoot/domain/pricing'
import type { Payload } from 'payload'
import { notify } from '@/modules/booking'
import type { Booking } from '@/payload-types'
import type { PaymentEvent } from '@/shared/payments'

export type RecordResult = 'recorded' | 'duplicate' | 'expired' | 'ignored' | 'unknown'

/** The reason in the team's alert, in plain words (the admin template's {reason}). */
const REASON: Record<string, string> = {
  state: 'the booking was not waiting for a payment',
  amount: 'the amount differs from the booking total',
  currency: 'it was not paid in AED',
}

/**
 * Acts on a provider notice whose signature checked out (FR-006 to FR-010). A paid checkout becomes exactly one
 * "Received from client" payment: the expected one pays the booking (the hooks apply `pay` as `system`), any
 * other is kept as held money and the team is alerted. Repeats record nothing new (FR-008).
 */
export async function recordPaymentEvent(payload: Payload, event: PaymentEvent): Promise<RecordResult> {
  if (event.type === 'ignored') return 'ignored'
  const sessions = await payload.find({
    collection: 'payment-sessions',
    where: { providerSessionId: { equals: event.sessionId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const session = sessions.docs[0]
  if (event.type === 'expired') {
    if (session?.status === 'open') await payload.update({ collection: 'payment-sessions', id: session.id, data: { status: 'expired' }, overrideAccess: true })
    return 'expired'
  }

  const already = await payload.count({ collection: 'payments', where: { providerRef: { equals: event.paymentRef } }, overrideAccess: true })
  if (already.totalDocs) return 'duplicate'
  const bookingId = session ? Number(typeof session.booking === 'object' ? session.booking.id : session.booking) : event.bookingId
  if (!bookingId) {
    console.warn('[payments] a paid checkout matches no booking')
    return 'unknown'
  }
  const booking = (await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1, overrideAccess: true })) as Booking
  const quotation = typeof booking.quotation === 'object' && booking.quotation ? booking.quotation : null
  const outcome = paymentOutcome({ state: booking.state, totalFils: quotation?.totalFils ?? booking.totalFils }, { amountFils: event.amountFils, currency: event.currency })
  try {
    await payload.create({
      collection: 'payments',
      data: {
        booking: bookingId,
        kind: 'received',
        amount: filsToAed(event.amountFils),
        method: 'card-online',
        providerRef: event.paymentRef,
        note: `Online payment ${event.paymentRef}`.slice(0, 200),
      },
      context: { online: outcome.outcome === 'apply' ? { outcome: 'apply' } : { outcome: 'attention', reason: outcome.reason } },
      overrideAccess: true,
    })
  } catch (error) {
    // The same notice arriving twice at once: the unique reference keeps one row.
    if ((error as Error).name === 'ValidationError') return 'duplicate'
    throw error
  }
  if (session) await payload.update({ collection: 'payment-sessions', id: session.id, data: { status: 'paid', paymentRef: event.paymentRef }, overrideAccess: true })

  // The transition may not have applied (a race with an admin's own record): alert unless the booking is paid now.
  const after = (await payload.findByID({ collection: 'bookings', id: bookingId, depth: 1, overrideAccess: true })) as Booking
  if (outcome.outcome === 'attention' || after.state === booking.state) {
    const reason = outcome.outcome === 'attention' ? REASON[outcome.reason] : REASON.state
    await notify(payload, after, 'payment-attention', { vars: { reason: reason ?? '', total: formatMoney(event.amountFils, 'en') } })
  }
  return 'recorded'
}
