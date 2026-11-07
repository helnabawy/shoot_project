import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, dubaiToday, isIsoDay, toDubaiDay } from './dates'

describe('UAE calendar days', () => {
  it('dubaiToday is UTC+4', () => {
    expect(dubaiToday(new Date('2026-12-01T23:30:00Z'))).toBe('2026-12-02')
    expect(dubaiToday(new Date('2026-12-01T19:59:00Z'))).toBe('2026-12-01')
  })

  it.each([
    ['2026-02-28', true],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['26-01-01', false],
    [42, false],
  ])('isIsoDay(%j) → %s', (value, expected) => {
    expect(isIsoDay(value)).toBe(expected)
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })

  it('toDubaiDay keeps a day and converts a time', () => {
    expect(toDubaiDay('2026-12-10')).toBe('2026-12-10')
    expect(toDubaiDay('2026-12-09T22:00:00.000Z')).toBe('2026-12-10')
  })
})
