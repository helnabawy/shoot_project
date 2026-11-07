import { sql } from '@payloadcms/db-postgres'
import { transition, type Actor, type BookingEvent, type BookingState, type NotificationEvent, type TransitionRefusal } from '@shoot/domain/booking'
import { commitTransaction, createLocalReq, initTransaction, killTransaction, type Payload, type PayloadRequest } from 'payload'
import type { Booking } from '@/payload-types'
import { notify } from './notify'

export const NOTIFY_ON: Partial<Record<BookingState, NotificationEvent>> = {
  accepted: 'accepted',
  confirmed: 'confirmed',
  paid: 'paid',
  scheduled: 'scheduled',
  delivered: 'delivered',
  completed: 'completed',
  'on-hold': 'on-hold',
  cancelled: 'cancelled',
  expired: 'expired',
}

export const TRANSITION_CONTEXT = { bookingTransition: true, disableRevalidate: true }

interface Drizzle {
  execute: (query: unknown) => Promise<{ rows: unknown[] }>
}

/**
 * Runs `work` while holding the booking's row lock (research §8): a second change to the same booking waits
 * until the first one is committed, then reads the new state, so a double tap or two concurrent answers can
 * never apply the same transition twice or overwrite each other. Joins the caller's transaction when there is one.
 */
export async function withBookingLock<T>(payload: Payload, id: number, work: (req: PayloadRequest) => Promise<T>, outer?: PayloadRequest): Promise<T> {
  const req = outer ?? (await createLocalReq({ context: {} }, payload))
  const own = !outer && (await initTransaction(req))
  try {
    const adapter = payload.db as unknown as { drizzle: Drizzle; sessions?: Record<string, { db: Drizzle }> }
    const id_ = req.transactionID ? await req.transactionID : null
    const db = (id_ != null && adapter.sessions?.[String(id_)]?.db) || adapter.drizzle
    await db.execute(sql`SELECT "id" FROM "bookings" WHERE "id" = ${id} FOR UPDATE`)
    const result = await work(req)
    if (own) await commitTransaction(req)
    return result
  } catch (error) {
    if (own) await killTransaction(req)
    throw error
  }
}

export async function recordEvent(
  payload: Payload,
  data: { booking: number; event: string; from?: BookingState | 'assignment' | null; to?: BookingState | 'assignment' | null; actorRole: Actor; actor?: number | null; note?: string | null; at: Date },
  req?: PayloadRequest,
) {
  await payload.create({
    collection: 'booking-events',
    data: { ...data, note: data.note?.slice(0, 500) ?? null, at: data.at.toISOString() },
    overrideAccess: true,
    req,
  })
}

export type ApplyResult = { ok: true; booking: Booking } | { ok: false; reason: TransitionRefusal | 'not-found'; booking?: Booking }

export interface ChangeOptions {
  actor: Actor
  actorUser?: number | null
  now: Date
  note?: string | null
  /** Extra fields written with the change (assignments, payoutDueAt…). */
  data?: Partial<Booking>
  /** Creators told about this change (default: every assigned creator). */
  creatorIds?: number[]
  notifyAs?: NotificationEvent | null
  req?: PayloadRequest
}

async function load(payload: Payload, id: number, req?: PayloadRequest): Promise<Booking | null> {
  try {
    return (await payload.findByID({ collection: 'bookings', id, depth: 0, overrideAccess: true, req, showHiddenFields: true })) as Booking
  } catch {
    return null
  }
}

async function write(payload: Payload, booking: Booking, data: Partial<Booking>, req?: PayloadRequest): Promise<Booking> {
  return (await payload.update({
    collection: 'bookings',
    id: booking.id,
    data: { ...data, revision: (booking.revision ?? 0) + 1 } as never,
    depth: 1,
    overrideAccess: true,
    showHiddenFields: true,
    context: TRANSITION_CONTEXT,
    req,
  })) as Booking
}

/** Applies one state transition from the domain table, with audit row and notifications (FR-005, FR-006). */
export async function applyTransition(payload: Payload, bookingId: number, event: BookingEvent, options: ChangeOptions): Promise<ApplyResult> {
  const result = await withBookingLock(
    payload,
    bookingId,
    async (req): Promise<ApplyResult & { notice?: NotificationEvent | null }> => {
      const booking = await load(payload, bookingId, req)
      if (!booking) return { ok: false, reason: 'not-found' }
      const next = transition({ state: booking.state as BookingState, validUntil: booking.quoteValidUntil ?? null }, event, options.actor, options.now)
      if (!next.ok) return { ok: false, reason: next.reason, booking }
      const updated = await write(payload, booking, { ...options.data, state: next.to, ...next.timestamps } as Partial<Booking>, req)
      await recordEvent(payload, { booking: booking.id, event, from: booking.state as BookingState, to: next.to, actorRole: options.actor, actor: options.actorUser ?? null, note: options.note, at: options.now }, req)
      return { ok: true, booking: updated, notice: options.notifyAs === undefined ? NOTIFY_ON[next.to] : options.notifyAs }
    },
    options.req,
  )
  // Notifications after the commit: they read settings and profiles and never block the booking row.
  if (result.ok && result.notice) await notify(payload, result.booking, result.notice, { req: options.req, creatorIds: options.creatorIds })
  return result.ok ? { ok: true, booking: result.booking } : result
}

/**
 * A change that keeps the booking's state (an assignment answer, a reassignment, a lapse), under the same lock
 * so two answers never overwrite each other.
 */
export async function applyChange(
  payload: Payload,
  bookingId: number,
  build: (booking: Booking) => { ok: true; data: Partial<Booking>; event: string } | { ok: false; reason: TransitionRefusal },
  options: ChangeOptions,
): Promise<ApplyResult> {
  const result = await withBookingLock(
    payload,
    bookingId,
    async (req): Promise<ApplyResult> => {
      const booking = await load(payload, bookingId, req)
      if (!booking) return { ok: false, reason: 'not-found' }
      const plan = build(booking)
      if (!plan.ok) return { ok: false, reason: plan.reason, booking }
      const updated = await write(payload, booking, plan.data, req)
      await recordEvent(payload, { booking: booking.id, event: plan.event, from: 'assignment', to: 'assignment', actorRole: options.actor, actor: options.actorUser ?? null, note: options.note, at: options.now }, req)
      return { ok: true, booking: updated }
    },
    options.req,
  )
  if (result.ok && options.notifyAs) await notify(payload, result.booking, options.notifyAs, { req: options.req, creatorIds: options.creatorIds })
  return result
}
