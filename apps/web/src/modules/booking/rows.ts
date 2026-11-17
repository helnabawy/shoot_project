import type { Assignment } from '@shoot/domain/booking'
import type { Booking } from '@/payload-types'

type Row = NonNullable<Booking['assignments']>[number]
const idOf = (v: unknown): string | null => (v == null ? null : String(typeof v === 'object' ? (v as { id: unknown }).id : v))

/** Stored assignment rows ↔ the domain's assignments. */
export function toAssignments(rows: Booking['assignments']): Assignment[] {
  return (rows ?? []).map((r) => ({
    personaId: idOf(r.persona) ?? '',
    creatorId: idOf(r.creator),
    status: r.status ?? 'open',
    respondBy: r.respondBy ?? null,
    respondedAt: r.respondedAt ?? null,
    declineReason: r.declineReason ?? null,
  }))
}

export function toRows(list: readonly Assignment[]): Row[] {
  return list.map((a) => ({
    persona: Number(a.personaId),
    creator: a.creatorId ? Number(a.creatorId) : null,
    status: a.status,
    respondBy: a.respondBy ?? null,
    respondedAt: a.respondedAt ?? null,
    declineReason: a.declineReason ?? null,
  }))
}

export { idOf }

/**
 * 022 (FR-012): what a creator is told a booking is worth: their own offer lines (by the types assigned to them)
 * when the quotation is made of offers, never the client's total with the service fee. Null: not an offers
 * booking, so the caller keeps the booking's total as before.
 */
export function creatorAmountFils(
  booking: { quotation?: unknown; assignments?: { persona?: unknown; creator?: unknown }[] | null },
  creatorId: number | string,
): number | null {
  const quotation = booking.quotation && typeof booking.quotation === 'object' ? (booking.quotation as { lines?: { kind?: string; amountFils?: number; persona?: unknown }[] | null }) : null
  const lines = quotation?.lines ?? []
  if (!lines.some((l) => l.kind === 'offer')) return null
  const mine = new Set((booking.assignments ?? []).filter((a) => String(idOf(a.creator)) === String(creatorId)).map((a) => String(idOf(a.persona))))
  return lines.filter((l) => l.kind === 'offer' && mine.has(String(idOf(l.persona)))).reduce((sum, l) => sum + (l.amountFils ?? 0), 0)
}
