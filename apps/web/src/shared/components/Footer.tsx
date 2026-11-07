import { getTranslations } from 'next-intl/server'
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
}: {
  siteName: string
  social: { platform: string; url: string }[]
  contactEmail?: string | null
  phoneNumber?: string | null
  locale: Locale
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
      <p className="mt-6 text-[13px]">
        © {year} {siteName}. {t('footer.rights')}
      </p>
    </footer>
  )
}
