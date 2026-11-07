const DAY = 24 * 60 * 60 * 1000
const DUBAI_OFFSET = 4 * 60 * 60 * 1000
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** Today's calendar day in the UAE (UTC+4, no daylight saving) as YYYY-MM-DD. */
export function dubaiToday(now: Date): string {
  return new Date(now.getTime() + DUBAI_OFFSET).toISOString().slice(0, 10)
}

export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const m = ISO_DAY.exec(value)
  if (!m) return false
  const d = new Date(`${value}T00:00:00Z`)
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() + 1 === Number(m[2]) && d.getUTCDate() === Number(m[3])
}

export function addDays(day: string, days: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY).toISOString().slice(0, 10)
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY)
}

/** A stored date value (ISO time or YYYY-MM-DD) as a UAE calendar day. */
export function toDubaiDay(value: string): string {
  return isIsoDay(value) ? value : dubaiToday(new Date(value))
}
