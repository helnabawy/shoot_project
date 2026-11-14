/** Push text is short and never carries a phone number or an email address (FR-019), whatever a template says. */
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const PHONE = /\+?\d[\d\s().-]{6,}\d/g
const MAX = { title: 65, body: 178 }

export function pushText(text: string, kind: keyof typeof MAX): string {
  const clean = text.replace(EMAIL, '').replace(PHONE, '').replace(/\s{2,}/g, ' ').trim()
  return clean.length > MAX[kind] ? `${clean.slice(0, MAX[kind] - 1).trimEnd()}…` : clean
}
