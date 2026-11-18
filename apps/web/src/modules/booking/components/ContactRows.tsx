import { useTranslations } from 'next-intl'
import { cx } from '@/shared/ui/bar'
import { PhoneIcon, WhatsAppIcon } from '@/shared/ui/icons'

/** Feature 025: the other side of a paid booking, as the server allows it to be read. */
export interface ContactView {
  /** The creator profile, for the client's view; absent for the client. */
  creatorId?: number
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

const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-row)] border border-control-border px-3.5 text-[15px] font-medium text-ink transition-colors duration-100 hover:bg-ink/[0.045] active:bg-ink/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]'

/**
 * Call and WhatsApp side by side (the owner, 2026-11-18): two quiet outlined buttons, never the red Top Hit, so
 * the booking's one action stays its own. `who` names the person for screen readers ("Call Hosam").
 */
export function ContactButtons({ contact, who, className }: { contact: ContactView; who: string; className?: string }) {
  const t = useTranslations('booking.contact')
  return (
    <div data-testid="booking-contact" className={cx('grid grid-cols-2 gap-2 print:hidden', className)}>
      <a href={contact.telHref} className={button} aria-label={`${t('call')} ${who}`} data-testid="contact-call">
        <PhoneIcon width={16} height={16} aria-hidden="true" />
        {t('call')}
      </a>
      <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={button} aria-label={`${t('whatsappShort')} ${who}`} data-testid="contact-whatsapp">
        <WhatsAppIcon width={16} height={16} aria-hidden="true" />
        {t('whatsappShort')}
      </a>
    </div>
  )
}
