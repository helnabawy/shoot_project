import { generateQuoteReference } from '@shoot/domain/booking'
import type { PriceLine } from '@shoot/domain/pricing'
import type { Payload, PayloadRequest } from 'payload'
import type { Quotation } from '@/payload-types'

export interface FrozenQuote {
  lines: PriceLine[]
  subtotal: number
  discount: number
  total: number
  promoCode?: string | null
}

const DAY = 24 * 60 * 60 * 1000

export function validUntilFrom(now: Date, validDays: number): string {
  return new Date(now.getTime() + validDays * DAY).toISOString()
}

/** Price lines as stored: both languages frozen at issue time (FR-010). */
export function toLineRows(lines: readonly PriceLine[]) {
  return lines.map((l) => ({
    kind: l.kind,
    labelEn: l.label.en,
    labelAr: l.label.ar || l.label.en,
    amountFils: l.amount,
    persona: l.personaId ? Number(l.personaId) : null,
    deliverables: (l.deliverables ?? null) as Record<string, unknown> | null,
  }))
}

/** Stored rows back to domain lines (for a new version built on the current one). */
export function fromLineRows(rows: Quotation['lines']): PriceLine[] {
  return (rows ?? []).map((r) => ({
    kind: r.kind,
    label: { en: r.labelEn, ar: r.labelAr },
    amount: r.amountFils,
    personaId: r.persona == null ? undefined : String(typeof r.persona === 'object' ? r.persona.id : r.persona),
    deliverables: (r.deliverables as PriceLine['deliverables']) ?? undefined,
  }))
}

async function uniqueReference(payload: Payload, req?: PayloadRequest): Promise<string> {
  let reference = generateQuoteReference()
  for (let i = 0; i < 5; i += 1) {
    const clash = await payload.count({ collection: 'quotations', where: { reference: { equals: reference } }, overrideAccess: true, req })
    const bookingClash = await payload.count({ collection: 'bookings', where: { reference: { equals: reference } }, overrideAccess: true, req })
    if (!clash.totalDocs && !bookingClash.totalDocs) break
    reference = generateQuoteReference()
  }
  return reference
}

/** Issues one quotation version with a unique `Q-` reference (FR-004). */
export async function createQuotation(
  payload: Payload,
  input: { bookingId: number; briefId: number; quote: FrozenQuote; version: number; validUntil: string; now: Date; reference?: string; req?: PayloadRequest },
): Promise<Quotation> {
  return (await payload.create({
    collection: 'quotations',
    data: {
      reference: input.reference ?? (await uniqueReference(payload, input.req)),
      booking: input.bookingId,
      brief: input.briefId,
      version: input.version,
      lines: toLineRows(input.quote.lines),
      subtotalFils: input.quote.subtotal,
      discountFils: input.quote.discount,
      totalFils: input.quote.total,
      promoCode: input.quote.promoCode ?? null,
      validUntil: input.validUntil,
      issuedAt: input.now.toISOString(),
    },
    overrideAccess: true,
    req: input.req,
  })) as Quotation
}

export { uniqueReference }
