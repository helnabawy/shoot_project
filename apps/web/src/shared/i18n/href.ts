import type { Locale } from '@/shared/lib/locale'

/** Site paths: English unprefixed, Arabic under /ar (matches the next-intl routing). */
export function localizeHref(path: string, locale: Locale | string): string {
  if (!path.startsWith('/')) return path
  if (locale === 'en') return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

/** Removes a locale prefix from a pathname: "/ar/register" → "/register". */
export function stripLocale(pathname: string): string {
  const stripped = pathname.replace(/^\/(ar|en)(?=\/|$)/, '')
  return stripped || '/'
}
