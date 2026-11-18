import { useTranslations } from 'next-intl'
import { Bidi } from '@/shared/ui/Bidi'
import { RowContent, rowClass } from '@/shared/ui/bar'
import { PhoneIcon, WhatsAppIcon } from '@/shared/ui/icons'

/** Feature 025: the other side of a paid booking, as the server allows it to be read. */
export interface ContactView {
  name: string
  /** The professional type for a creator; empty for the client. */
  role: string
  /** E.164. */
  phone: string
  /** Grouped for reading, shown left-to-right. */
  display: string
  telHref: string
  whatsappHref: string
}

/** "Contact Hosam" for a creator, "Contact Layla" (or "your client") for a client. */
export function contactLabel(t: (key: string, values?: Record<string, string>) => string, contact: ContactView, side: 'creator' | 'client'): string {
  if (side === 'creator') return t('creator', { name: contact.name })
  return contact.name ? t('client', { name: contact.name }) : t('clientNoName')
}

/**
 * Call and WhatsApp for one person (025 FR-004): two ordinary rows, the number at the end of the Call row,
 * left-to-right in both languages. Never the Top Hit: the booking's one action stays its own.
 */
export function ContactRows({ contact, side }: { contact: ContactView; side: 'creator' | 'client' }) {
  const t = useTranslations('booking.contact')
  const who = contactLabel(t as never, contact, side)
  return (
    <div data-testid="booking-contact" data-side={side}>
      <a href={contact.telHref} className={rowClass('open')} aria-label={`${t('call')}: ${who}`} data-testid="contact-call">
        <RowContent
          glyph={<PhoneIcon width={15} height={15} />}
          label={t('call')}
          trailing={
            <span className="tabular-nums">
              <Bidi>{contact.display}</Bidi>
            </span>
          }
        />
      </a>
      <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={rowClass('open')} aria-label={`${t('whatsapp')}: ${who}`} data-testid="contact-whatsapp">
        <RowContent glyph={<WhatsAppIcon width={15} height={15} />} label={t('whatsapp')} />
      </a>
    </div>
  )
}
