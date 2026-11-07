'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { cx } from '@/shared/ui/bar'
import { stripLocale } from './href'

export interface LocaleSwitcherProps {
  target: 'en' | 'ar'
  label: string
  ariaLabel: string
  className?: string
  /** Drawn before the label (decorative). */
  icon?: ReactNode
}

/**
 * Same page in the other language, keeping the section and query (FR-036). The link carries an
 * explicit prefix (/en/…, /ar/…) so the locale proxy updates the remembered language even
 * without JavaScript; with JavaScript the switch happens without a full reload.
 */
export function LocaleSwitcher(props: LocaleSwitcherProps) {
  return (
    <Suspense fallback={<Switch {...props} query="" />}>
      <WithQuery {...props} />
    </Suspense>
  )
}

function WithQuery(props: LocaleSwitcherProps) {
  return <Switch {...props} query={useSearchParams().toString()} />
}

function Switch({
  target,
  label,
  ariaLabel,
  className,
  icon,
  query,
}: LocaleSwitcherProps & { query: string }) {
  const router = useRouter()
  const path = stripLocale(usePathname() || '/')
  const suffix = query ? `?${query}` : ''
  const href = `/${target}${path === '/' ? '' : path}${suffix}`
  return (
    <a
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      data-testid="locale-switcher"
      className={cx(
        'rounded-md px-2 py-1.5 text-[14px] font-medium text-mute hover:text-ink',
        className,
      )}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=31536000; samesite=lax`
        const visible =
          target === 'en' ? `${path}${suffix}` : `/${target}${path === '/' ? '' : path}${suffix}`
        router.replace(`${visible}${window.location.hash}`, { scroll: false })
      }}
    >
      {icon ? (
        <span aria-hidden="true" className="contents">
          {icon}
        </span>
      ) : null}
      {label}
    </a>
  )
}
