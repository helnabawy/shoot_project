import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LOCALE, LOCALES } from '@/shared/lib/locale'

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  // English at "/", Arabic at "/ar"
  localePrefix: 'as-needed',
  // Remember the visitor's choice for a year (FR-036); next-intl's default is a session cookie.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
})
