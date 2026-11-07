import { buildWhatsAppLink, isE164 } from '@shoot/domain/contact'

/** wa.me link for the configured number, or null when no valid number is set. */
export function whatsappHref(number: string | null | undefined, message?: string | null): string | null {
  if (!number || !isE164(number)) return null
  return buildWhatsAppLink(number, message ?? undefined)
}
