// No 0/O, 1/I/L: references are read aloud and typed on phones.
export const REFERENCE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const ALPHABET = REFERENCE_ALPHABET
const PATTERN = new RegExp(`^B-[${ALPHABET}]{5}$`)

/** A short reference shown to the client, e.g. "B-7K4Q2" (FR-055, FR-059). */
export function generateBriefReference(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < 5; i += 1) code += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length]
  return `B-${code}`
}

export function isBriefReference(value: string): boolean {
  return PATTERN.test(value)
}
