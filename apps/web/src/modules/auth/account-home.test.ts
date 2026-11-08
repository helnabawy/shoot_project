import { describe, expect, it } from 'vitest'
import { pickNextUp, placeStatus, type AccountBooking, type AccountJob } from './account-home'

const today = '2026-11-08'
const job = (over: Partial<AccountJob> = {}): AccountJob => ({ reference: 'S-1', state: 'scheduled', awaitingAnswer: false, date: '2026-11-20', ...over })
const booking = (over: Partial<AccountBooking> = {}): AccountBooking => ({ reference: 'S-2', state: 'confirmed', date: '2026-11-15', ...over })

describe('account home: what comes next', () => {
  it('a creator answers waiting requests before anything else, soonest deadline first', () => {
    const next = pickNextUp({ today, provider: true, profileStatus: 'draft', jobs: [job(), job({ reference: 'S-9', state: 'accepted', awaitingAnswer: true, date: '2026-12-01' })], bookings: [] })
    expect(next).toEqual({ kind: 'answer', count: 1, job: expect.objectContaining({ reference: 'S-9' }) })
  })

  it('then a profile that is not public', () => {
    for (const status of ['draft', 'in-review', 'paused', 'suspended'] as const) {
      expect(pickNextUp({ today, provider: true, profileStatus: status, jobs: [job()], bookings: [] })).toEqual({ kind: 'profile', status })
    }
  })

  it('then the next job on the calendar, ignoring past and finished ones', () => {
    const jobs = [job({ reference: 'past', date: '2026-11-01' }), job({ reference: 'done', state: 'delivered' }), job({ reference: 'later', date: '2026-12-01' }), job({ reference: 'soon', state: 'paid' })]
    expect(pickNextUp({ today, provider: true, profileStatus: 'live', jobs, bookings: [] })).toEqual({ kind: 'job', job: expect.objectContaining({ reference: 'soon' }) })
  })

  it('a live creator with nothing booked is clear', () => {
    expect(pickNextUp({ today, provider: true, profileStatus: 'live-with-changes', jobs: [], bookings: [] })).toEqual({ kind: 'clear' })
  })

  it('a client sees an open quotation first, then the soonest booking', () => {
    const bookings = [booking({ reference: 'later', date: '2026-12-01' }), booking({ reference: 'soon', state: 'scheduled', date: '2026-11-10' }), booking({ reference: 'Q', state: 'quoted', date: '2026-12-05' })]
    expect(pickNextUp({ today, provider: false, profileStatus: null, jobs: [], bookings })).toEqual({ kind: 'quote', booking: expect.objectContaining({ reference: 'Q' }) })
    expect(pickNextUp({ today, provider: false, profileStatus: null, jobs: [], bookings: bookings.slice(0, 2) })).toEqual({ kind: 'booking', booking: expect.objectContaining({ reference: 'soon' }) })
  })

  it('a client with nothing open is invited to brief', () => {
    const bookings = [booking({ state: 'cancelled' }), booking({ state: 'expired' }), booking({ date: '2026-10-01' }), booking({ date: null })]
    expect(pickNextUp({ today, provider: false, profileStatus: null, jobs: [], bookings })).toEqual({ kind: 'brief' })
  })
})

describe('account home: one-line status of each place', () => {
  it('counts what waits, then unread updates, then what is open', () => {
    expect(placeStatus({ today, waiting: 2, unread: 1, jobs: [], bookings: [] })).toEqual({ key: 'waiting', count: 2 })
    expect(placeStatus({ today, waiting: 0, unread: 3, jobs: [], bookings: [] })).toEqual({ key: 'updates', count: 3 })
    expect(placeStatus({ today, waiting: 0, unread: 0, jobs: [job(), job({ state: 'completed' })], bookings: [booking(), booking({ state: 'quoted' }), booking({ date: '2026-01-01' })] })).toEqual({ key: 'open', count: 3 })
    expect(placeStatus({ today, waiting: 0, unread: 0, jobs: [], bookings: [booking({ state: 'cancelled' })] })).toEqual({ key: 'none', count: 0 })
  })
})
