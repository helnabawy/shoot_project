import { onlinePaymentAllowed } from '@shoot/domain/payments'
import type { Payload } from 'payload'
import { absolute, type QuotationAccess } from '@/modules/booking'
import { env } from '@/shared/lib/env'
import { getPaymentProvider, PaymentProviderError, type PaymentProvider } from '@/shared/payments'

export type StartCheckoutResult = { ok: true; url: string } | { ok: false; reason: 'not-allowed' | 'unavailable' | 'provider' }

/** A checkout stays open an hour; one that closes within five minutes is not handed out again (research R9). */
const OPEN_FOR_MS = 60 * 60 * 1000
const REUSE_MARGIN_MS = 5 * 60 * 1000

/**
 * Starts (or reuses) the provider's secure payment page for a confirmed booking (FR-002 to FR-005, FR-012).
 * The amount is the current quotation's total as stored; nothing the client sends can change it.
 */
export async function startCheckout(
  payload: Payload,
  access: QuotationAccess,
  options: { locale: 'en' | 'ar'; now: Date; returnPath: string; provider?: PaymentProvider },
): Promise<StartCheckoutResult> {
  const { booking, quotation, current } = access
  if (quotation.id !== current.id) return { ok: false, reason: 'not-allowed' }
  const total = current.totalFils
  if (!onlinePaymentAllowed({ state: booking.state, totalFils: total })) return { ok: false, reason: 'not-allowed' }
  const provider = options.provider ?? getPaymentProvider(env())
  if (provider.name === 'off') return { ok: false, reason: 'unavailable' }

  const revision = booking.revision ?? 0
  const { now } = options
  const open = await payload.find({
    collection: 'payment-sessions',
    where: {
      and: [
        { booking: { equals: booking.id } },
        { status: { equals: 'open' } },
        { revision: { equals: revision } },
        { amountFils: { equals: total } },
        { expiresAt: { greater_than: new Date(now.getTime() + REUSE_MARGIN_MS).toISOString() } },
      ],
    },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (open.docs[0]) return { ok: true, url: open.docs[0].url }

  const attempt = (await payload.count({ collection: 'payment-sessions', where: { booking: { equals: booking.id } }, overrideAccess: true })).totalDocs + 1
  const back = (outcome: 'done' | 'cancelled') => absolute(`${options.returnPath}${options.returnPath.includes('?') ? '&' : '?'}payment=${outcome}`)
  let session
  try {
    session = await provider.createCheckout({
      bookingId: booking.id,
      reference: current.reference,
      revision,
      amountFils: total,
      locale: options.locale,
      successUrl: back('done'),
      cancelUrl: back('cancelled'),
      expiresAt: new Date(now.getTime() + OPEN_FOR_MS),
      idempotencyKey: `checkout-${booking.id}-${revision}-${total}-${attempt}`,
    })
  } catch (error) {
    if (error instanceof PaymentProviderError) return { ok: false, reason: 'provider' }
    throw error
  }
  await payload.create({
    collection: 'payment-sessions',
    data: {
      booking: booking.id,
      revision,
      amountFils: total,
      provider: 'stripe',
      providerSessionId: session.id,
      url: session.url,
      status: 'open',
      expiresAt: session.expiresAt.toISOString(),
    },
    overrideAccess: true,
  })
  return { ok: true, url: session.url }
}
