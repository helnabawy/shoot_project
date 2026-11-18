/**
 * Feature 026: the start time step of the brief. Browser-safe and dependency-free (the builder uses it).
 */

const TIME_VALUE = /^([01]\d|2[0-3])[-:]?([0-5]\d)$/

/** The `HH:MM` (24 h) an option value stands for (`16-00`, `16:00`, `1600`), or null (FR-003). */
export function startTimeOf(value: string | null | undefined): string | null {
  const match = TIME_VALUE.exec((value ?? '').trim())
  return match ? `${match[1]}:${match[2]}` : null
}

/**
 * The template with `{time}` right after `{date}`, joined by the owner's words ("on {date} at {time}").
 * A template without the date, or one that already asks the time, is returned as it is (FR-002).
 */
export function withTimeToken(template: string, options: { dateToken: string; timeToken: string; connector: string }): string {
  const date = `{${options.dateToken}}`
  const time = `{${options.timeToken}}`
  if (!template.includes(date) || template.includes(time)) return template
  const connector = options.connector.trim()
  return template.replace(date, `${date} ${connector ? `${connector} ` : ''}${time}`)
}

/** Left-to-right isolate (U+2066 … U+2069): a time reads "4 pm" inside Arabic text too (FR-007). */
export const isolateLtr = (text: string): string => (text ? `\u2066${text}\u2069` : text)
