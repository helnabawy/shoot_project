import { addDays } from '@shoot/domain/booking'

export type CalendarStatus = 'free' | 'blocked' | 'booked' | 'outside'

export interface CalendarDay {
  date: string
  day: number
  status: CalendarStatus
  today: boolean
}

export interface CalendarMonth {
  /** `YYYY-MM`. */
  key: string
  /** Monday-first weeks of seven; `null` pads before the 1st and after the last day. */
  weeks: (CalendarDay | null)[][]
}

/**
 * The months from `today` to the last day a provider can block (CP-FR-014, the window of FR-002), as
 * Monday-first weeks. Days before today and after the window are `outside` and cannot be changed.
 */
export function calendarMonths(today: string, days: number, status: ReadonlyMap<string, 'blocked' | 'booked'>): CalendarMonth[] {
  const last = addDays(today, days - 1)
  const months: CalendarMonth[] = []
  let first = `${today.slice(0, 7)}-01`
  while (first <= last) {
    const key = first.slice(0, 7)
    const cells: (CalendarDay | null)[] = []
    // getUTCDay: Sunday 0. Monday-first: Monday 0 … Sunday 6.
    const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7
    for (let i = 0; i < lead; i += 1) cells.push(null)
    for (let date = first; date.slice(0, 7) === key; date = addDays(date, 1)) {
      const inside = date >= today && date <= last
      cells.push({ date, day: Number(date.slice(8, 10)), status: inside ? (status.get(date) ?? 'free') : 'outside', today: date === today })
    }
    while (cells.length % 7) cells.push(null)
    const weeks: (CalendarDay | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
    months.push({ key, weeks })
    first = addDays(`${key}-01`, 32).slice(0, 7) + '-01'
  }
  return months
}
