export const BOOKING_STATES = ['quoted', 'accepted', 'confirmed', 'paid', 'scheduled', 'delivered', 'completed', 'cancelled', 'expired', 'on-hold'] as const
export type BookingState = (typeof BOOKING_STATES)[number]

export type Actor = 'client' | 'creator' | 'admin' | 'system'
export type BookingEvent = 'accept' | 'expire' | 'confirm' | 'pay' | 'schedule' | 'deliver' | 'complete' | 'hold' | 'cancel'

export const TERMINAL_STATES: readonly BookingState[] = ['completed', 'cancelled', 'expired']

interface Rule {
  event: BookingEvent
  from: readonly BookingState[]
  to: BookingState
  actors: readonly Actor[]
}

/** The one transition table (research §7). UI buttons, server actions, admin edits and the clock all ask it. */
export const TRANSITIONS: readonly Rule[] = [
  { event: 'accept', from: ['quoted'], to: 'accepted', actors: ['client'] },
  { event: 'expire', from: ['quoted'], to: 'expired', actors: ['system'] },
  { event: 'confirm', from: ['accepted'], to: 'confirmed', actors: ['creator', 'admin'] },
  { event: 'pay', from: ['confirmed'], to: 'paid', actors: ['admin'] },
  { event: 'schedule', from: ['paid'], to: 'scheduled', actors: ['system', 'admin'] },
  { event: 'schedule', from: ['on-hold'], to: 'scheduled', actors: ['admin'] },
  { event: 'deliver', from: ['scheduled'], to: 'delivered', actors: ['creator', 'admin'] },
  { event: 'deliver', from: ['on-hold'], to: 'delivered', actors: ['admin'] },
  { event: 'complete', from: ['delivered'], to: 'completed', actors: ['client', 'admin'] },
  { event: 'complete', from: ['on-hold'], to: 'completed', actors: ['admin'] },
  { event: 'hold', from: ['paid', 'scheduled', 'delivered'], to: 'on-hold', actors: ['client', 'admin'] },
  { event: 'cancel', from: ['quoted', 'accepted', 'confirmed'], to: 'cancelled', actors: ['client', 'admin'] },
  { event: 'cancel', from: ['paid', 'scheduled', 'on-hold'], to: 'cancelled', actors: ['admin'] },
]

/** The booking field stamped when it enters a state. */
export const STATE_TIMESTAMP: Readonly<Record<Exclude<BookingState, 'quoted'>, string>> = {
  accepted: 'acceptedAt',
  confirmed: 'confirmedAt',
  paid: 'paidAt',
  scheduled: 'scheduledAt',
  delivered: 'deliveredAt',
  completed: 'completedAt',
  cancelled: 'cancelledAt',
  expired: 'expiredAt',
  'on-hold': 'onHoldAt',
}

export type TransitionRefusal = 'terminal' | 'not-allowed' | 'expired-quotation'

export interface TransitionSubject {
  state: BookingState
  /** ISO time the current quotation stops being acceptable. */
  validUntil?: string | null
}

export function isTerminal(state: BookingState): boolean {
  return TERMINAL_STATES.includes(state)
}

function ruleFor(state: BookingState, event: BookingEvent, actor: Actor): Rule | undefined {
  return TRANSITIONS.find((r) => r.event === event && r.from.includes(state) && r.actors.includes(actor))
}

export function transition(
  booking: TransitionSubject,
  event: BookingEvent,
  actor: Actor,
  now: Date,
): { ok: true; to: BookingState; timestamps: Record<string, string> } | { ok: false; reason: TransitionRefusal } {
  if (isTerminal(booking.state)) return { ok: false, reason: 'terminal' }
  const rule = ruleFor(booking.state, event, actor)
  if (!rule) return { ok: false, reason: 'not-allowed' }
  if (event === 'accept' && booking.validUntil && new Date(booking.validUntil).getTime() < now.getTime()) {
    return { ok: false, reason: 'expired-quotation' }
  }
  const field = STATE_TIMESTAMP[rule.to as Exclude<BookingState, 'quoted'>]
  return { ok: true, to: rule.to, timestamps: { [field]: now.toISOString() } }
}

/** Every event this actor may apply now, in table order without repeats. */
export function allowedEvents(state: BookingState, actor: Actor): BookingEvent[] {
  return [...new Set(TRANSITIONS.filter((r) => r.from.includes(state) && r.actors.includes(actor)).map((r) => r.event))]
}

/** The event behind an admin's direct state change in the content area, or null when the table forbids it. */
export function eventFor(from: BookingState, to: BookingState, actor: Actor): BookingEvent | null {
  return TRANSITIONS.find((r) => r.to === to && r.from.includes(from) && r.actors.includes(actor))?.event ?? null
}

/** A quoted booking whose quotation has run out is shown and treated as expired before the clock runs. */
export function effectiveState(booking: TransitionSubject, now: Date): BookingState {
  if (booking.state === 'quoted' && booking.validUntil && new Date(booking.validUntil).getTime() < now.getTime()) return 'expired'
  return booking.state
}
