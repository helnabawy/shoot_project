import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import { chromeLabels } from '@/shared/i18n/server-labels'
import type { Locale } from '@/shared/lib/locale'
import type { Media } from '@/payload-types'
import { LocaleSwitcher } from '@/shared/i18n/LocaleSwitcher'
import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { UserIcon } from '@/shared/ui/icons'
import { BriefBar, rowClass, RowContent } from '@/shared/ui/bar'
import { CmsImage } from './CmsImage'
import { MobileMenu } from './MobileMenu'

export interface NavItem {
  label: string
  target: string
}

function NavLink({ item, className, row, locale }: { item: NavItem; className?: string; row?: boolean; locale: Locale }) {
  const content = row ? <RowContent glyph={item.label.slice(0, 1)} label={item.label} /> : item.label
  return item.target.startsWith('/') ? (
    <Link href={localizeHref(item.target, locale)} className={className}>
      {content}
    </Link>
  ) : (
    <a href={item.target} className={className}>
      {content}
    </a>
  )
}

/** Quiet top bar: wordmark, section links, language, appearance, account. */
export async function Header({
  siteName,
  logo,
  logoDark,
  navigation,
  accountHref = '/login',
  locale,
}: {
  siteName: string
  logo?: Media | number | null
  logoDark?: Media | number | null
  navigation: NavItem[]
  accountHref?: '/login' | '/account'
  locale: Locale
}) {
  const [t, chrome] = await Promise.all([getTranslations({ locale }), chromeLabels(locale)])
  const home = localizeHref('/', locale)
  const account = localizeHref(accountHref, locale)
  return (
    <header className="relative mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-4 pt-3 pb-2 sm:px-6">
      <Link href={home} className="flex min-h-10 items-center text-[15px] font-semibold tracking-[-0.01em] text-ink" aria-label={siteName}>
        {logo && typeof logo === 'object' ? (
          <CmsImage media={logo} dark={logoDark} size="thumbnail" sizes="160px" className="h-7 w-auto" priority />
        ) : (
          siteName
        )}
      </Link>

      <nav aria-label={t('a11y.mainNav')} className="hidden items-center gap-1 md:flex">
        {navigation.map((item) => (
          <NavLink key={item.target} item={item} locale={locale} className="rounded-md px-2.5 py-1.5 text-[14px] text-mute hover:text-ink" />
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <LocaleSwitcher {...chrome.locale} />
        <ThemeToggle labels={chrome.theme} className="hidden md:inline-flex" />
        <Link
          href={account}
          className="hidden min-h-10 items-center gap-1.5 rounded-md px-2.5 text-[14px] font-medium text-ink hover:bg-ink/5 md:inline-flex"
        >
          <UserIcon width={17} height={17} />
          {accountHref === '/account' ? t('nav.account') : t('nav.login')}
        </Link>
        <MobileMenu {...chrome.menu}>
          <BriefBar size="sm" className="py-1.5">
            <nav aria-label={t('a11y.mainNav')}>
              {navigation.map((item) => (
                <NavLink key={item.target} item={item} locale={locale} className={rowClass('open')} row />
              ))}
            </nav>
            <div className="border-t border-hair pt-1">
              <Link href={account} className={rowClass('open')}>
                <RowContent glyph={<UserIcon width={16} height={16} />} label={accountHref === '/account' ? t('nav.account') : t('nav.login')} />
              </Link>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="group-label">{t('theme.label')}</span>
                <ThemeToggle labels={chrome.theme} />
              </div>
            </div>
          </BriefBar>
        </MobileMenu>
      </div>
    </header>
  )
}
