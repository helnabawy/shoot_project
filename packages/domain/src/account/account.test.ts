import { describe, expect, it } from 'vitest'
import { BOOKING_STATES } from '../booking/states'
import { BOOKING_STATUSES, bookingStatus, finishAutoOpen, finishItems, openCount, pickUpNext, splitBookings, upNextKind, waitingCount, type AccountBookingRow } from './index'

const row = (reference: string, status: AccountBookingRow['status'], extra: Partial<AccountBookingRow> = {}): AccountBookingRow => ({ reference, status, validUntil: null, date: '2026-12-01', ...extra })

describe('MK-US2-S1 booking status words', () => {
  it('maps every state to a known status', () => {
    for (const state of BOOKING_STATES) expect(BOOKING_STATUSES).toContain(bookingStatus(state, false))
  })
  it('reads an accepted booking the professional declined as declined', () => {
    expect(bookingStatus('accepted', true)).toBe('declined')
    expect(bookingStatus('accepted', false)).toBe('waitingProfessional')
    expect(bookingStatus('confirmed', true)).toBe('awaitingPayment')
    expect(bookingStatus('on-hold', false)).toBe('onHold')
  })
})

describe('MK-US1-S2 MK-US1-S3 MK-US1-S4 up next', () => {
  it('shows nothing when nothing needs the client', () => {
    expect(pickUpNext([row('A', 'paid'), row('B', 'cancelled')])).toBeNull()
    expect(upNextKind('paid')).toBeNull()
    expect(waitingCount([row('A', 'paid')])).toBe(0)
  })
  it('puts a quotation first, soonest expiry first', () => {
    const rows = [row('P', 'awaitingPayment'), row('Q2', 'awaitingAcceptance', { validUntil: '2026-12-05T00:00:00Z' }), row('Q1', 'awaitingAcceptance', { validUntil: '2026-12-02T00:00:00Z' }), row('Q3', 'awaitingAcceptance')]
    expect(pickUpNext(rows)).toEqual({ kind: 'quote', reference: 'Q1' })
    expect(waitingCount(rows)).toBe(4)
  })
  it('then delivery, payment, declined, each soonest shoot first', () => {
    expect(pickUpNext([row('D', 'declined'), row('P', 'awaitingPayment'), row('V', 'delivered')])).toEqual({ kind: 'delivery', reference: 'V' })
    expect(pickUpNext([row('D', 'declined'), row('P2', 'awaitingPayment', { date: '2026-12-09' }), row('P1', 'awaitingPayment', { date: '2026-12-03' }), row('P0', 'awaitingPayment', { date: null })])).toEqual({ kind: 'payment', reference: 'P1' })
    expect(pickUpNext([row('D', 'declined')])).toEqual({ kind: 'declined', reference: 'D' })
  })
  it('counts open bookings', () => {
    const rows = [row('A', 'paid', { date: '2026-12-01' }), row('B', 'paid', { date: '2026-01-01' }), row('C', 'awaitingAcceptance', { date: '2026-01-01' }), row('D', 'cancelled'), row('E', 'scheduled', { date: null })]
    expect(openCount(rows, '2026-11-12')).toBe(3)
  })
})

describe('MK-US2-S1 upcoming and past', () => {
  it('splits by the business day and orders each group', () => {
    const rows = [{ date: '2026-11-12', id: 'today' }, { date: '2026-11-01', id: 'p1' }, { date: '2026-10-01', id: 'p2' }, { date: '2026-12-01', id: 'u2' }, { date: null, id: 'none' }]
    const { upcoming, past } = splitBookings(rows, '2026-11-12')
    expect(upcoming.map((r) => r.id)).toEqual(['today', 'u2', 'none'])
    expect(past.map((r) => r.id)).toEqual(['p1', 'p2'])
  })
})

describe('MK-US3-S1 MK-US3-S2 MK-US3-S8 finish checklist', () => {
  it('marks number, name and email done by their value', () => {
    expect(finishItems({ phone: '+971501234567', name: null, email: ' ' })).toEqual([
      { key: 'number', done: true, value: '+971501234567' },
      { key: 'name', done: false, value: null },
      { key: 'email', done: false, value: null },
    ])
    expect(finishItems({ phone: '+971501234567', name: 'Sara', email: 's@x.ae' }).every((i) => i.done)).toBe(true)
  })
  it('opens on its own once, after the first booking', () => {
    expect(finishAutoOpen({ bookingCount: 0, dismissedAt: null })).toBe(false)
    expect(finishAutoOpen({ bookingCount: 1, dismissedAt: null })).toBe(true)
    expect(finishAutoOpen({ bookingCount: 1, dismissedAt: '2026-11-12T00:00:00Z' })).toBe(false)
  })
})
