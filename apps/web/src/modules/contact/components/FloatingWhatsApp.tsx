import { whatsappHref } from '../whatsapp'
import { FloatingWhatsAppLink } from './FloatingWhatsAppLink'

/** Always-reachable WhatsApp on phones (FR-011): bottom end, above the safe area. */
export function FloatingWhatsApp({ number, message, label }: { number: string | null | undefined; message?: string | null; label: string }) {
  const href = whatsappHref(number, message)
  if (!href) return null
  return <FloatingWhatsAppLink href={href} label={label} />
}
