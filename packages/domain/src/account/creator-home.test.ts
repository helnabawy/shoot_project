import { describe, expect, it } from 'vitest'
import type { ProfileStatus } from '../creators/types'
import { buildQueue, homeCounts, homeMode, NEXT_LIMIT, todayState, type HomeBookingItem, type HomeBriefItem } from './creator-home'

const booking = (ref: string, respondBy: string): HomeBookingItem => ({ kind: 'booking', ref, respondBy })
const brief = (ref: string, sentAt: string): HomeBriefItem => ({ kind: 'brief', ref, sentAt })

describe('CH-US1-S6 the queue order', () => {
  it('puts booking requests first, nearest answer-by time first', () => {
    const queue = buildQueue(
      [booking('Q-2', '2026-11-20T14:00:00.000Z'), booking('Q-1', '2026-11-19T10:00:00.000Z')],
      [brief('B-1', '2026-11-17T09:00:00.000Z')],
    )
    expect(queue.map((i) => i.ref)).toEqual(['Q-1', 'Q-2', 'B-1'])
  })

  it('orders briefs newest first after every booking request', () => {
    const queue = buildQueue(
      [booking('Q-1', '2026-11-30T10:00:00.000Z')],
      [brief('B-old', '2026-11-15T09:00:00.000Z'), brief('B-new', '2026-11-17T09:00:00.000Z')],
    )
    expect(queue.map((i) => i.ref)).toEqual(['Q-1', 'B-new', 'B-old'])
  })

  it('breaks ties by reference so the order is stable', () => {
    const at = '2026-11-19T10:00:00.000Z'
    expect(buildQueue([booking('Q-B', at), booking('Q-A', at)], [brief('B-B', at), brief('B-A', at)]).map((i) => i.ref)).toEqual(['Q-A', 'Q-B', 'B-A', 'B-B'])
  })

  it('does not change its inputs and keeps extra fields', () => {
    const bookings = [{ ...booking('Q-2', '2026-11-20T14:00:00.000Z'), title: 'two' }, { ...booking('Q-1', '2026-11-19T10:00:00.000Z'), title: 'one' }]
    const queue = buildQueue(bookings, [])
    expect(bookings.map((b) => b.ref)).toEqual(['Q-2', 'Q-1'])
    expect(queue[0]).toMatchObject({ ref: 'Q-1', title: 'one' })
  })

  it('is empty when nothing waits', () => {
    expect(buildQueue([], [])).toEqual([])
  })

  it('shows five following requests under the card', () => {
    expect(NEXT_LIMIT).toBe(5)
  })
})

describe('CH-US3-S2 the counts', () => {
  it('counts the queue, the upcoming and the completed bookings', () => {
    expect(homeCounts([booking('Q-1', '2026-11-19T10:00:00.000Z'), brief('B-1', '2026-11-17T09:00:00.000Z')], 1, 4)).toEqual({ toAnswer: 2, comingUp: 1, completed: 4 })
    expect(homeCounts([], 0, 0)).toEqual({ toAnswer: 0, comingUp: 0, completed: 0 })
  })
})

describe('CH-US4-S1 CH-US4-S2 CH-US4-S5 which home a creator sees', () => {
  const cases: [ProfileStatus | null, string][] = [
    ['live', 'live'],
    ['live-with-changes', 'live'],
    ['in-review', 'review'],
    ['paused', 'paused'],
    ['suspended', 'paused'],
    ['draft', 'incomplete'],
    [null, 'incomplete'],
  ]
  it.each(cases)('%s → %s', (status, mode) => {
    expect(homeMode(status)).toBe(mode)
  })
})

describe('CH-US3-S5 today in the availability row', () => {
  it('reads a blocked day, a booked day and a free day', () => {
    const days = [
      { date: '2026-11-17', state: 'blocked' as const },
      { date: '2026-11-19', state: 'booked' as const },
    ]
    expect(todayState(days, '2026-11-17')).toBe('blocked')
    expect(todayState(days, '2026-11-19')).toBe('booked')
    expect(todayState(days, '2026-11-18')).toBe('free')
  })
})
