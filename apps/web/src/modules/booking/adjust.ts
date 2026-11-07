import { getTranslations } from 'next-intl/server'
import type { Payload, PayloadRequest } from 'payload'
import type { Booking, Quotation } from '@/payload-types'
import { notify } from './notify'
import { createQuotation, fromLineRows, validUntilFrom } from './quote'
import { readQuickMatch } from './settings'
import { recordEvent, TRANSITION_CONTEXT } from './transitions'

/**
 * An admin price change (QM-US4-S2): a new quotation version with an adjustment line; the old one points to it
 * and the booking now uses it. A quoted booking gets a fresh validity period.
 */
export async function issueAdjustment(
  payload: Payload,
  booking: Booking,
  amountFils: number,
  reason: string,
  options: { now: Date; actorUser?: number | null; req?: PayloadRequest },
): Promise<Quotation> {
  const currentId = typeof booking.quotation === 'object' && booking.quotation ? booking.quotation.id : booking.quotation
  if (!currentId) throw new Error('A booking without a quotation cannot be adjusted.')
  const current = (await payload.findByID({ collection: 'quotations', id: currentId, depth: 0, overrideAccess: true, req: options.req })) as Quotation
  const [en, ar] = await Promise.all([getTranslations({ locale: 'en', namespace: 'quote' }), getTranslations({ locale: 'ar', namespace: 'quote' })])
  const label = { en: reason ? en('adjustmentWithReason', { reason }) : en('adjustment'), ar: reason ? ar('adjustmentWithReason', { reason }) : ar('adjustment') }
  const lines = [...fromLineRows(current.lines), { kind: 'adjustment' as const, label, amount: amountFils }]
  const total = Math.max(0, current.totalFils + amountFils)
  const settings = await readQuickMatch(payload, options.req)
  const validUntil = booking.state === 'quoted' ? validUntilFrom(options.now, settings.quotationValidDays) : current.validUntil
  const next = await createQuotation(payload, {
    bookingId: booking.id,
    briefId: typeof current.brief === 'object' ? current.brief.id : current.brief,
    quote: { lines, subtotal: current.subtotalFils + Math.max(amountFils, 0), discount: (current.discountFils ?? 0) + Math.max(-amountFils, 0), total, promoCode: current.promoCode },
    version: (current.version ?? 1) + 1,
    validUntil,
    now: options.now,
    req: options.req,
  })
  await payload.update({ collection: 'quotations', id: current.id, data: { supersededBy: next.id }, overrideAccess: true, req: options.req })
  const updated = (await payload.update({
    collection: 'bookings',
    id: booking.id,
    data: { quotation: next.id, totalFils: total, quoteValidUntil: validUntil, revision: (booking.revision ?? 0) + 1 } as never,
    depth: 1,
    overrideAccess: true,
    showHiddenFields: true,
    context: TRANSITION_CONTEXT,
    req: options.req,
  })) as Booking
  await recordEvent(payload, { booking: booking.id, event: 'adjust', from: booking.state, to: booking.state, actorRole: 'admin', actor: options.actorUser ?? null, note: reason, at: options.now }, options.req)
  await notify(payload, updated, 'adjusted', { req: options.req })
  return next
}
