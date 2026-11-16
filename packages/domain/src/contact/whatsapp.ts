import { z } from 'zod'

const E164 = /^\+[1-9]\d{7,14}$/

/**
 * Normalises a phone number typed by an editor into E.164 ("+971581234567").
 * Accepts spaces, dashes, dots and parentheses, and a leading "00" instead of "+".
 * Returns null when the result is not an international number (8–15 digits after "+").
 */
export function normaliseE164(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().]/g, '')
  const withPlus = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  return E164.test(withPlus) ? withPlus : null
}

/**
 * Phone fields show a fixed `+971` before the input, so a number typed there without its own
 * country code is a UAE number: `50 123 4567` and `050 123 4567` become `+971501234567`, and so
 * does `971501234567`. A number that starts with `+` or `00` keeps its own country code.
 */
export function withUaeCode(input: string): string {
  const compact = input.trim().replace(/[\s\-().]/g, '')
  if (!compact || compact.startsWith('+') || compact.startsWith('00')) return input
  if (compact.startsWith('971') && compact.length >= 12) return `+${compact}`
  return `+971${compact.replace(/^0+/, '')}`
}

/** The part of a stored number shown after the fixed `+971`; another country's number stays whole. */
export function nationalUae(e164: string): string {
  return e164.startsWith('+971') ? e164.slice(4) : e164
}

export function isE164(value: unknown): boolean {
  return typeof value === 'string' && normaliseE164(value) !== null
}

/** Validates and normalises in one step; used by forms and CMS validation alike. */
export const whatsappNumberSchema = z
  .string()
  .transform((value, ctx) => {
    const normalised = normaliseE164(value)
    if (!normalised) {
      ctx.addIssue({ code: 'custom', message: 'contact.errors.whatsappFormat' })
      return z.NEVER
    }
    return normalised
  })

/** wa.me deep link with digits only and an optional pre-filled, URL-encoded message. */
export function buildWhatsAppLink(number: string, message?: string): string {
  const normalised = normaliseE164(number)
  if (!normalised) throw new Error(`Invalid WhatsApp number: ${number}`)
  const base = `https://wa.me/${normalised.slice(1)}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
