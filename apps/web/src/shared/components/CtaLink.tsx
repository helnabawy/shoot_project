import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { PhoneIcon } from '@/shared/ui/icons'
import { rowClass, RowContent, TopHit } from '@/shared/ui/bar'
import { WhatsAppIcon, ForwardIcon } from '@/shared/ui/icons'

export interface Cta {
  label?: string | null
  kind?: 'whatsapp' | 'link' | 'call' | null
  href?: string | null
}

export interface ContactDetails {
  whatsappNumber?: string | null
  whatsappMessage?: string | null
  phoneNumber?: string | null
}

/** Resolves a CMS call to action to a URL; null when it cannot work (no label, no number). */
export function resolveCta(cta: Cta | null | undefined, contact: ContactDetails): { href: string; external: boolean; internal: boolean } | null {
  if (!cta?.label) return null
  if (cta.kind === 'whatsapp') {
    const href = whatsappHref(contact.whatsappNumber, contact.whatsappMessage)
    return href ? { href, external: true, internal: false } : null
  }
  if (cta.kind === 'call') {
    return contact.phoneNumber ? { href: `tel:${contact.phoneNumber}`, external: false, internal: false } : null
  }
  if (!cta.href) return null
  const internal = cta.href.startsWith('/')
  return { href: cta.href, external: /^https?:/.test(cta.href), internal }
}

const glyphFor = (kind: Cta['kind']) =>
  kind === 'whatsapp' ? <WhatsAppIcon width={16} height={16} /> : kind === 'call' ? <PhoneIcon width={16} height={16} /> : <ForwardIcon width={16} height={16} />

/** Primary CTA = the blue Top Hit row; secondary = a plain result row. */
export function CtaLink({
  cta,
  contact,
  locale = 'en',
  variant = 'primary',
}: {
  cta: Cta | null | undefined
  contact: ContactDetails
  locale?: string
  variant?: 'primary' | 'secondary'
}) {
  const resolved = resolveCta(cta, contact)
  if (!resolved || !cta?.label) return null
  const href = resolved.internal ? localizeHref(resolved.href, locale) : resolved.href
  if (variant === 'primary') {
    return <TopHit label={cta.label} href={href} external={resolved.external} glyph={glyphFor(cta.kind)} />
  }
  const content = <RowContent glyph={glyphFor(cta.kind)} label={cta.label} />
  if (resolved.internal) {
    return (
      <Link href={href} className={rowClass('open')}>
        {content}
      </Link>
    )
  }
  return (
    <a href={resolved.href} className={rowClass('open')} {...(resolved.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {content}
    </a>
  )
}
