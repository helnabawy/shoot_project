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
