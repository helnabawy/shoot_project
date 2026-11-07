import { REFERENCE_ALPHABET } from '../brief/reference'

const PATTERN = new RegExp(`^Q-[${REFERENCE_ALPHABET}]{5}$`)

/** A quotation reference the client can read aloud, e.g. "Q-7K4Q2". */
export function generateQuoteReference(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < 5; i += 1) code += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length) % REFERENCE_ALPHABET.length]
  return `Q-${code}`
}

/** Any case spelling → the stored form, or null. */
export function normaliseQuoteReference(value: string): string | null {
  const upper = value.trim().toUpperCase()
  return PATTERN.test(upper) ? upper : null
}

export function isQuoteReference(value: string): boolean {
  return normaliseQuoteReference(value) !== null
}
