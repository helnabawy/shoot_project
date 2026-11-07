import { REFERENCE_ALPHABET } from '../brief/reference'

const CODE_LENGTH = 5
const CODE_PATTERN = new RegExp(`^[${REFERENCE_ALPHABET}]{${CODE_LENGTH}}$`)
const PREFIX_PATTERN = /^[A-Za-z]{2,4}$/

/**
 * The stored creator code: 5 characters from the brief-reference alphabet, no prefix. The brand
 * prefix is display-only so a rebrand never leaves stale codes behind (research §8).
 */
export function generateCreatorCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length) % REFERENCE_ALPHABET.length]
  }
  return code
}

/** The code as people see and quote it, e.g. "CR-7K4Q2". The prefix comes from the CMS. */
export function formatCreatorCode(prefix: string, code: string): string {
  if (!PREFIX_PATTERN.test(prefix)) throw new Error('A creator code prefix is 2–4 letters.')
  return `${prefix.toUpperCase()}-${code.toUpperCase()}`
}

/**
 * Any spelling of a code (any case, with or without a prefix, old prefixes included) to the stored
 * form, or null. Characters outside the alphabet are rejected, never swapped for look-alikes.
 */
export function normaliseCode(input: string): string | null {
  const bare = input.trim().toUpperCase().replace(/^[A-Z]+-/, '')
  return CODE_PATTERN.test(bare) ? bare : null
}
