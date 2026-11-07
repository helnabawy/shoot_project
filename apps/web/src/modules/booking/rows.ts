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
