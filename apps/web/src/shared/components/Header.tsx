import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import { chromeLabels } from '@/shared/i18n/server-labels'
import type { Locale } from '@/shared/lib/locale'
import type { Media } from '@/payload-types'
import { LocaleSwitcher } from '@/shared/i18n/LocaleSwitcher'
import { ThemeToggle } from '@/shared/theme/ThemeToggle'
import { GlobeIcon, UserIcon } from '@/shared/ui/icons'
import { BriefBar, rowClass, RowContent } from '@/shared/ui/bar'
import { CmsImage } from './CmsImage'
import { MobileMenu } from './MobileMenu'
import { SectionNav } from './SectionNav'

export interface NavItem {
  label: string
  target: string
}

function NavLink({
  item,
  className,
  row,
  locale,
}: {
  item: NavItem
  className?: string
  row?: boolean
  locale: Locale
}) {
  const content = row ? (
    <RowContent glyph={item.label.slice(0, 1)} label={item.label} />
  ) : (
    item.label
  )
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

/**
 * The window toolbar: wordmark at the start, section links centred, language, appearance and
 * account at the end. It sticks as the page scrolls under its frosted ground (`.toolbar`).
 */
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
  const accountLabel = accountHref === '/account' ? t('nav.account') : t('nav.login')
  const initial = Array.from(siteName.trim())[0] ?? ''
  return (
    <header className="toolbar relative">
      <div className="mx-auto grid h-[59px] max-w-[1080px] grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 md:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]">
        <Link
          href={home}
          className="flex min-h-10 items-center gap-2.5 justify-self-start rounded-[9px] text-[15px] whitespace-nowrap font-semibold tracking-[-0.015em] text-ink"
          aria-label={siteName}
        >
          {logo && typeof logo === 'object' ? (
            <CmsImage
              media={logo}
              dark={logoDark}
              size="thumbnail"
              sizes="160px"
              className="h-7 w-auto"
              priority
            />
          ) : (
            <>
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-[8px] bg-ink text-[14px] font-bold text-ground"
              >
                {initial}
              </span>
              <span aria-hidden="true">{siteName}</span>
            </>
          )}
        </Link>

        <SectionNav label={t('a11y.mainNav')} className="hidden items-center gap-0.5 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.target}
              item={item}
              locale={locale}
              className="flex h-9 items-center rounded-[9px] px-3 text-[14px] whitespace-nowrap font-medium text-mute transition-colors hover:bg-ink/[0.045] hover:text-ink active:bg-ink/[0.08] [&[aria-current]]:bg-ink/[0.06] [&[aria-current]]:text-ink"
            />
          ))}
        </SectionNav>

        <div className="flex items-center gap-1 justify-self-end">
          <LocaleSwitcher
            {...chrome.locale}
            icon={<GlobeIcon width={16} height={16} className="hidden sm:block" />}
            className="flex h-9 items-center gap-1.5 rounded-[9px] px-2.5 whitespace-nowrap transition-colors hover:bg-ink/[0.045] active:bg-ink/[0.08]"
          />
          <ThemeToggle labels={chrome.theme} className="hidden md:inline-flex" />
          <span aria-hidden="true" className="mx-1.5 hidden h-5 w-px bg-hair md:block" />
          <Link
            href={account}
            className="hidden h-9 items-center gap-1.5 rounded-[9px] border whitespace-nowrap border-hair bg-panel-solid ps-2.5 pe-3 text-[14px] font-medium text-ink transition-colors hover:border-ink/15 active:bg-tile md:inline-flex"
          >
            <UserIcon width={16} height={16} />
            {accountLabel}
          </Link>
          <MobileMenu {...chrome.menu}>
            <BriefBar size="sm" className="py-1.5">
              <nav aria-label={t('a11y.mainNav')}>
                {navigation.map((item) => (
                  <NavLink
                    key={item.target}
                    item={item}
                    locale={locale}
                    className={rowClass('open')}
                    row
                  />
                ))}
              </nav>
              <div className="border-t border-hair pt-1">
                <Link href={account} className={rowClass('open')}>
                  <RowContent glyph={<UserIcon width={16} height={16} />} label={accountLabel} />
                </Link>
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="group-label">{t('theme.label')}</span>
                  <ThemeToggle labels={chrome.theme} />
                </div>
              </div>
            </BriefBar>
          </MobileMenu>
        </div>
      </div>
    </header>
  )
}
