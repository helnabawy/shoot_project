import { describe, expect, it } from 'vitest'
import { calendarMonths } from './calendar'

describe('CP-FR-014 profile calendar months', () => {
  const status = new Map([
    ['2026-11-10', 'blocked' as const],
    ['2026-11-12', 'booked' as const],
  ])
  const months = calendarMonths('2026-11-08', 90, status)

  it('covers today to the 90th day, month by month', () => {
    expect(months.map((m) => m.key)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('lays each month out in Monday-first weeks, blanks before the 1st', () => {
    // 1 Nov 2026 is a Sunday: six blanks, then the 1st.
    expect(months[0]!.weeks[0]!.slice(0, 7).map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, null, 1])
    expect(months[0]!.weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('days before today and after the 90th are outside and cannot be changed', () => {
    const nov = months[0]!.weeks.flat().filter((c) => c !== null)
    expect(nov.find((c) => c.date === '2026-11-07')!.status).toBe('outside')
    expect(nov.find((c) => c.date === '2026-11-08')).toMatchObject({ status: 'free', today: true })
    const feb = months[3]!.weeks.flat().filter((c) => c !== null)
    expect(feb.find((c) => c.date === '2027-02-05')!.status).toBe('free')
    expect(feb.find((c) => c.date === '2027-02-06')!.status).toBe('outside')
  })

  it('marks blocked and booked days', () => {
    const nov = months[0]!.weeks.flat()
    expect(nov.find((c) => c?.date === '2026-11-10')!.status).toBe('blocked')
    expect(nov.find((c) => c?.date === '2026-11-12')!.status).toBe('booked')
  })
})
