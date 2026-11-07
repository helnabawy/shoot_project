import { dubaiToday, lapseOverdue } from '@shoot/domain/booking'
import type { Payload } from 'payload'
import type { Booking } from '@/payload-types'
import { notify } from './notify'
import { toAssignments, toRows } from './rows'
import { readQuickMatch } from './settings'
import { applyChange, applyTransition } from './transitions'

const DAY = 24 * 60 * 60 * 1000

export interface ClockResult {
  expired: number
  lapsed: number
  scheduled: number
  overdueDeliveries: number
}

async function all(payload: Payload, where: Parameters<Payload['find']>[0]['where']): Promise<Booking[]> {
  const { docs } = await payload.find({ collection: 'bookings', where, depth: 0, pagination: false, overrideAccess: true })
  return docs as Booking[]
}

/**
 * Time-based changes (research §12), safe to run any number of times: quotations past validity expire,
 * unanswered requests lapse, paid bookings become scheduled on the shoot day, and admins hear about
 * deliveries the client has not confirmed. `now` is an argument so tests are deterministic.
 */
export async function runBookingClock(payload: Payload, now: Date): Promise<ClockResult> {
  const settings = await readQuickMatch(payload)
  const result: ClockResult = { expired: 0, lapsed: 0, scheduled: 0, overdueDeliveries: 0 }

  for (const b of await all(payload, { and: [{ state: { equals: 'quoted' } }, { quoteValidUntil: { less_than: now.toISOString() } }] })) {
    if ((await applyTransition(payload, b.id, 'expire', { actor: 'system', now })).ok) result.expired += 1
  }

  for (const b of await all(payload, { and: [{ state: { equals: 'accepted' } }, { 'assignments.status': { equals: 'pending' } }, { 'assignments.respondBy': { less_than: now.toISOString() } }] })) {
    const changed = await applyChange(
      payload,
      b.id,
      (current) => {
        const { assignments, lapsed } = lapseOverdue(toAssignments(current.assignments), now)
        return lapsed.length ? { ok: true, data: { assignments: toRows(assignments) }, event: 'lapse' } : { ok: false, reason: 'not-allowed' }
      },
      { actor: 'system', now, notifyAs: 'lapsed' },
    )
    if (changed.ok) result.lapsed += 1
  }

  for (const b of await all(payload, { and: [{ state: { equals: 'paid' } }, { date: { less_than_equal: dubaiToday(now) } }] })) {
    if ((await applyTransition(payload, b.id, 'schedule', { actor: 'system', now })).ok) result.scheduled += 1
  }

  const overdueBefore = new Date(now.getTime() - settings.deliveryConfirmDays * DAY).toISOString()
  for (const b of await all(payload, { and: [{ state: { equals: 'delivered' } }, { deliveredAt: { less_than: overdueBefore } }, { overdueNotifiedAt: { exists: false } }] })) {
    const changed = await applyChange(payload, b.id, () => ({ ok: true, data: { overdueNotifiedAt: now.toISOString() }, event: 'delivery-overdue' }), { actor: 'system', now })
    if (changed.ok) {
      await notify(payload, changed.booking, 'delivery-overdue')
      result.overdueDeliveries += 1
    }
  }
  return result
}
