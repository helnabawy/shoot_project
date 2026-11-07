import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import { LocaleSwitcher } from '@/shared/i18n/LocaleSwitcher'
import { chromeLabels } from '@/shared/i18n/server-labels'
import type { Locale } from '@/shared/lib/locale'
import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { Bidi } from '@/shared/ui/Bidi'

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
  const [t, chrome] = await Promise.all([getTranslations({ locale }), chromeLabels(locale)])
  const year = new Date().getFullYear()
  return (
    <footer className="mx-auto mt-16 max-w-[680px] border-t border-hair px-4 pt-8 pb-28 text-[14px] text-mute md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="font-semibold text-ink">{siteName}</span>
        <div className="flex items-center gap-2">
          <LocaleSwitcher {...chrome.locale} />
          <ThemeToggle labels={chrome.theme} />
        </div>
      </div>
      {groups.length ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2" data-testid="footer-groups">
          {groups.map((group) => (
            <nav key={group.key} aria-labelledby={`footer-${group.key}`}>
              <h2 id={`footer-${group.key}`} className="text-[13px] font-semibold text-ink">
                {group.label}
              </h2>
              <ul className="mt-2 space-y-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={localizeHref(link.href, locale)} className="inline-flex min-h-8 items-center hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {contactEmail ? (
          <a href={`mailto:${contactEmail}`} className="hover:text-ink">
            <Bidi>{contactEmail}</Bidi>
          </a>
        ) : null}
        {phoneNumber ? (
          <a href={`tel:${phoneNumber}`} className="hover:text-ink">
            <Bidi>{phoneNumber}</Bidi>
          </a>
        ) : null}
        {social.length ? (
          <nav aria-label={t('footer.social')} className="flex gap-4">
            {social.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-ink">
                {s.platform}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
      {legal.length ? (
        <nav aria-label={t('footer.legal')} className="mt-4 flex flex-wrap gap-x-5 gap-y-2" data-testid="footer-legal">
          {legal.map((link) => (
            <Link key={link.href} href={localizeHref(link.href, locale)} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <p className="mt-6 text-[13px]">
        © {year} {siteName}. {t('footer.rights')}
      </p>
    </footer>
  )
}
