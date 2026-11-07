import { paymentAllowed, respondByFrom, transition, type Assignment, type BookingEvent, type BookingState, type PaymentKind } from '@shoot/domain/booking'
import { fils } from '@shoot/domain/pricing'
import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook } from 'payload'
import type { Booking } from '@/payload-types'
import { issueAdjustment } from './adjust'
import { blockDateFor, releaseDates } from './effects'
import { notify } from './notify'
import { payoutDue, readQuickMatch } from './settings'
import { applyTransition, NOTIFY_ON, recordEvent, TRANSITION_CONTEXT } from './transitions'

const refuse = (message: string, status = 400) => new APIError(message, status, undefined, true)
const relId = (v: unknown): number | null => (v == null || v === '' ? null : typeof v === 'object' ? Number((v as { id: unknown }).id) : Number(v))

interface AdminPlan {
  transition?: { event: BookingEvent; from: BookingState; to: BookingState; data: Record<string, unknown> }
  assignments?: Assignment[] | Booking['assignments']
  reassigned: { persona: number; from: number | null; to: number }[]
  adjustment?: { amountFils: number; reason: string }
  now: Date
}

type Plans = Record<string, AdminPlan>
const plans = (context: Record<string, unknown>): Plans => ((context.bookingPlans ??= {}) as Plans)

/**
 * Admin edits in the content area (US4): "Change state", a new creator on an assignment and "Adjust price"
 * are checked against the booking rules here and applied after the save, through the same writes as the site.
 */
export const bookingBeforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, req, operation }) => {
  if (req.context?.bookingTransition || operation !== 'update' || !originalDoc) return data
  const original = originalDoc as Booking
  const now = new Date()
  const plan: AdminPlan = { reassigned: [], now }
  const settings = await readQuickMatch(req.payload, req)

  // Reassignment: the creator column is the only assignment field an admin may change.
  const rows = (data.assignments ?? original.assignments ?? []) as NonNullable<Booking['assignments']>
  const before = original.assignments ?? []
  const nextAssignments = before.map((orig) => {
    const persona = relId(orig.persona)
    const row = rows.find((r) => relId(r.persona) === persona) ?? orig
    const from = relId(orig.creator)
    const to = relId(row.creator)
    if (to === null || to === from) return orig
    plan.reassigned.push({ persona: persona as number, from, to })
    const running = ['accepted'].includes(original.state)
    return { ...orig, creator: to, status: 'pending' as const, respondBy: running ? respondByFrom(now, settings.confirmHours) : null, respondedAt: null, declineReason: null }
  })
  if (plan.reassigned.length) {
    if (!['quoted', 'accepted'].includes(original.state)) throw refuse('booking.errors.reassignState')
    plan.assignments = nextAssignments
  }

  const action = data.adminAction as BookingEvent | undefined
  if (action) {
    let assignments = (plan.assignments ?? before) as NonNullable<Booking['assignments']>
    if (action === 'confirm') {
      if (assignments.some((a) => relId(a.creator) === null)) throw refuse('booking.errors.needsCreator')
      assignments = assignments.map((a) => ({ ...a, status: 'confirmed' as const, respondedAt: now.toISOString() }))
      plan.assignments = assignments
    }
    const result = transition({ state: original.state as BookingState, validUntil: original.quoteValidUntil ?? null }, action, 'admin', now)
    if (!result.ok) throw refuse(`booking.errors.${result.reason}`)
    const extra: Record<string, unknown> = { state: result.to, ...result.timestamps }
    if (result.to === 'completed') extra.payoutDueAt = payoutDue(now, settings.payoutDays)
    plan.transition = { event: action, from: original.state as BookingState, to: result.to, data: extra }
  }

  const adjustment = data.priceAdjustment as { amount?: number | null; reason?: string | null } | undefined
  if (adjustment?.amount) {
    if (['completed', 'cancelled', 'expired'].includes(original.state)) throw refuse('booking.errors.adjustState')
    plan.adjustment = { amountFils: fils(adjustment.amount), reason: (adjustment.reason ?? '').slice(0, 200) }
  }

  if (plan.transition || plan.assignments || plan.adjustment) plans(req.context)[String(original.id)] = plan
  const { adminAction: _a, priceAdjustment: _p, ...rest } = data
  return rest
}

export const bookingAfterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (req.context?.bookingTransition) return doc
  const plan = plans(req.context)[String(doc.id)]
  if (!plan) return doc
  delete plans(req.context)[String(doc.id)]
  const payload = req.payload
  const actor = req.user ? Number(req.user.id) : null
  let booking = doc as Booking

  const write: Record<string, unknown> = { ...(plan.transition?.data ?? {}) }
  if (plan.assignments) write.assignments = plan.assignments
  if (Object.keys(write).length) {
    booking = (await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { ...write, revision: (booking.revision ?? 0) + 1 } as never,
      depth: 1,
      overrideAccess: true,
      showHiddenFields: true,
      context: TRANSITION_CONTEXT,
      req,
    })) as Booking
  }

  for (const change of plan.reassigned) {
    if (change.from) await releaseDates(payload, booking.id, req, change.from)
    await recordEvent(payload, { booking: booking.id, event: 'reassign', from: 'assignment', to: 'assignment', actorRole: 'admin', actor, note: `${change.from ?? '—'} → ${change.to}`, at: plan.now }, req)
    await notify(payload, booking, 'reassigned', { req, creatorIds: [change.to] })
  }

  if (plan.transition) {
    const { event, from, to } = plan.transition
    if (to === 'confirmed') {
      for (const a of booking.assignments ?? []) {
        const creator = relId(a.creator)
        if (creator && !(await blockDateFor(payload, booking, creator, req))) throw refuse('booking.errors.dateTaken', 409)
      }
    }
    if (to === 'cancelled') await releaseDates(payload, booking.id, req)
    await recordEvent(payload, { booking: booking.id, event, from, to, actorRole: 'admin', actor, at: plan.now }, req)
    const notice = NOTIFY_ON[to]
    if (notice) await notify(payload, booking, notice, { req })
  }

  if (plan.adjustment) await issueAdjustment(payload, booking, plan.adjustment.amountFils, plan.adjustment.reason, { now: plan.now, actorUser: actor, req })
  return booking
}

/** A payment may be recorded only in the state it belongs to (FR-007). */
export const paymentBeforeChange: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create') return data
  const bookingId = relId(data.booking)
  if (!bookingId) throw refuse('booking.errors.paymentState')
  const booking = (await req.payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true, req })) as Booking
  if (!paymentAllowed(data.kind as PaymentKind, booking.state)) throw refuse('booking.errors.paymentState')
  return { ...data, recordedBy: req.user?.id ?? null, recordedAt: new Date().toISOString() }
}

/** Money received from the client moves a confirmed booking to "paid" (held until delivery is confirmed). */
export const paymentAfterChange: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return doc
  const bookingId = relId(doc.booking) as number
  const now = new Date()
  const actor = req.user ? Number(req.user.id) : null
  if (doc.kind === 'received') {
    const result = await applyTransition(req.payload, bookingId, 'pay', { actor: 'admin', actorUser: actor, now, note: doc.note ?? null, req })
    if (!result.ok) throw refuse(`booking.errors.${result.reason}`)
  } else {
    await recordEvent(req.payload, { booking: bookingId, event: doc.kind, actorRole: 'admin', actor, note: doc.note ?? null, at: now }, req)
  }
  return doc
}
