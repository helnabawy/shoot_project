/** Supported languages. English is the default and the fallback for missing translations. */
export const LOCALES = ['en', 'ar'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

const RTL_LOCALES: readonly Locale[] = ['ar']

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** Text direction for a locale; anything unknown is treated as left-to-right. */
export function dirFor(locale: string): 'ltr' | 'rtl' {
  return isLocale(locale) && RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

/** Returns the other supported locale (used by the language switcher). */
export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'ar' : 'en'
}
