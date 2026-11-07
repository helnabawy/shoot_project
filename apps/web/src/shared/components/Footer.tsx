import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { Bidi } from '@/shared/ui/Bidi'

// Column links: ink rows on the ground, 44 px tall on phones (the touch target), tighter from 640 px.
const columnLink =
  'inline-flex min-h-11 items-center text-ink decoration-ink/30 underline-offset-4 transition-colors hover:underline sm:min-h-8'
// Bottom-bar links: Meta size, mute, ink on hover.
const metaLink = 'inline-flex min-h-11 items-center transition-colors hover:text-ink sm:min-h-8'

/**
 * Site footer. The language switch and the theme control live in the header only (both widths), and the
 * site name appears once, in the copyright line. Columns: the editor's footer groups, then contact, then
 * social; the bottom bar carries the copyright and the legal documents in force.
 */
export async function Footer({
  siteName,
  social,
  contactEmail,
  phoneNumber,
  locale,
  groups = [],
  legal = [],
}: {
  siteName: string
  social: { platform: string; url: string }[]
  contactEmail?: string | null
  phoneNumber?: string | null
  locale: Locale
  /** Footer groups of editor-placed pages (hrefs without language prefix). */
  groups?: { key: string; label: string; links: { label: string; href: string }[] }[]
  /** Terms, Professional Terms, Privacy: the ones that have a version in force. */
  legal?: { label: string; href: string }[]
}) {
  const t = await getTranslations({ locale })
  const year = new Date().getFullYear()
  const hasContact = Boolean(contactEmail || phoneNumber)
  const hasColumns = groups.length > 0 || hasContact || social.length > 0

  return (
    <footer className="mx-auto mt-16 max-w-[680px] px-4 pb-28 text-[14px] text-mute sm:px-6 md:pb-10 lg:mt-24 lg:max-w-[1080px]">
      <div className="border-t border-hair">
        {hasColumns ? (
          <div
            className="grid grid-cols-2 gap-x-6 gap-y-8 pt-10 pb-10 sm:grid-cols-3 lg:grid-cols-4 lg:pt-12"
            data-testid="footer-groups"
          >
            {groups.map((group) => (
              <FooterColumn key={group.key} id={`footer-${group.key}`} heading={group.label} as="nav">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={localizeHref(link.href, locale)} className={columnLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </FooterColumn>
            ))}
            {hasContact ? (
              <FooterColumn id="footer-contact" heading={t('footer.contact')} className="col-span-2 sm:col-span-1">
                {contactEmail ? (
                  <li>
                    <a href={`mailto:${contactEmail}`} className={`${columnLink} [overflow-wrap:anywhere]`}>
                      <Bidi>{contactEmail}</Bidi>
                    </a>
                  </li>
                ) : null}
                {phoneNumber ? (
                  <li>
                    <a href={`tel:${phoneNumber}`} className={columnLink}>
                      <Bidi>{phoneNumber}</Bidi>
                    </a>
                  </li>
                ) : null}
              </FooterColumn>
            ) : null}
            {social.length ? (
              <FooterColumn id="footer-social" heading={t('footer.social')} as="nav">
                {social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${columnLink} capitalize`}>
                      {s.platform}
                    </a>
                  </li>
                ))}
              </FooterColumn>
            ) : null}
          </div>
        ) : null}

        <div
          className={`flex flex-col-reverse gap-2 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${hasColumns ? 'border-t border-hair' : ''}`}
        >
          <p>
            <Bidi>
              © {year} {siteName}.
            </Bidi>{' '}
            {t('footer.rights')}
          </p>
          {legal.length ? (
            <nav aria-label={t('footer.legal')} data-testid="footer-legal">
              <ul className="flex flex-wrap gap-x-5">
                {legal.map((link) => (
                  <li key={link.href}>
                    <Link href={localizeHref(link.href, locale)} className={metaLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  id,
  heading,
  as: Tag = 'div',
  className = '',
  children,
}: {
  id: string
  heading: string
  as?: 'nav' | 'div'
  /** Contact spans both phone columns so an email address is not broken mid-word. */
  className?: string
  children: ReactNode
}) {
  return (
    <Tag aria-labelledby={Tag === 'nav' ? id : undefined} className={`min-w-0 ${className}`}>
      <h2 id={id} className="group-label">
        {heading}
      </h2>
      <ul className="mt-2 sm:mt-3 sm:space-y-1">{children}</ul>
    </Tag>
  )
}
