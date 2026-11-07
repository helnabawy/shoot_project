import { describe, expect, it } from 'vitest'
import { allowedEvents, BOOKING_STATES, effectiveState, eventFor, isTerminal, transition, TRANSITIONS, type Actor, type BookingEvent } from './states'

const now = new Date('2026-11-07T10:00:00Z')
const ACTORS: Actor[] = ['client', 'creator', 'admin', 'system']
const EVENTS: BookingEvent[] = ['accept', 'expire', 'confirm', 'pay', 'schedule', 'deliver', 'complete', 'hold', 'cancel']

describe('QM-US3-S5 booking state machine', () => {
  it('every table row succeeds for its actors and stamps the target timestamp', () => {
    for (const rule of TRANSITIONS) {
      for (const from of rule.from) {
        for (const actor of rule.actors) {
          const r = transition({ state: from }, rule.event, actor, now)
          expect(r).toEqual({ ok: true, to: rule.to, timestamps: expect.any(Object) })
          if (r.ok) expect(Object.values(r.timestamps)).toEqual([now.toISOString()])
        }
      }
    }
  })

  it('every combination outside the table is refused', () => {
    for (const state of BOOKING_STATES) {
      for (const event of EVENTS) {
        for (const actor of ACTORS) {
          const allowed = TRANSITIONS.some((r) => r.event === event && r.from.includes(state) && r.actors.includes(actor))
          const r = transition({ state }, event, actor, now)
          if (!allowed) expect(r.ok).toBe(false)
        }
      }
    }
  })

  it.each(['completed', 'cancelled', 'expired'] as const)('%s is terminal and accepts no event', (state) => {
    expect(isTerminal(state)).toBe(true)
    expect(transition({ state }, 'cancel', 'admin', now)).toEqual({ ok: false, reason: 'terminal' })
    expect(allowedEvents(state, 'admin')).toEqual([])
  })

  it('a client cannot cancel once paid; an admin can', () => {
    expect(transition({ state: 'paid' }, 'cancel', 'client', now)).toEqual({ ok: false, reason: 'not-allowed' })
    expect(transition({ state: 'paid' }, 'cancel', 'admin', now).ok).toBe(true)
  })

  it('stamps the right field', () => {
    const r = transition({ state: 'paid' }, 'hold', 'client', now)
    expect(r).toEqual({ ok: true, to: 'on-hold', timestamps: { onHoldAt: now.toISOString() } })
  })

  it('allowedEvents lists what the actor can do', () => {
    expect(allowedEvents('quoted', 'client')).toEqual(['accept', 'cancel'])
    expect(allowedEvents('delivered', 'client')).toEqual(['complete', 'hold'])
    expect(allowedEvents('on-hold', 'admin')).toEqual(['schedule', 'deliver', 'complete', 'cancel'])
    expect(allowedEvents('scheduled', 'creator')).toEqual(['deliver'])
  })

  it('eventFor maps an admin state change to its event or null', () => {
    expect(eventFor('on-hold', 'completed', 'admin')).toBe('complete')
    expect(eventFor('paid', 'cancelled', 'admin')).toBe('cancel')
    expect(eventFor('completed', 'cancelled', 'admin')).toBeNull()
    expect(eventFor('quoted', 'paid', 'admin')).toBeNull()
  })
})

describe('QM-US2-S5 an expired quotation cannot be accepted', () => {
  it('refuses accept after validUntil, allows it before', () => {
    expect(transition({ state: 'quoted', validUntil: '2026-11-06T00:00:00Z' }, 'accept', 'client', now)).toEqual({ ok: false, reason: 'expired-quotation' })
    expect(transition({ state: 'quoted', validUntil: '2026-11-08T00:00:00Z' }, 'accept', 'client', now).ok).toBe(true)
    expect(transition({ state: 'quoted', validUntil: null }, 'accept', 'client', now).ok).toBe(true)
  })

  it('effectiveState shows a lapsed quotation as expired', () => {
    expect(effectiveState({ state: 'quoted', validUntil: '2026-11-06T00:00:00Z' }, now)).toBe('expired')
    expect(effectiveState({ state: 'quoted', validUntil: '2026-11-08T00:00:00Z' }, now)).toBe('quoted')
    expect(effectiveState({ state: 'quoted' }, now)).toBe('quoted')
    expect(effectiveState({ state: 'paid', validUntil: '2026-11-06T00:00:00Z' }, now)).toBe('paid')
  })
})
