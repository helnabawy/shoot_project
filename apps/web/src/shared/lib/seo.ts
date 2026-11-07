import type { Metadata } from 'next'
import { type Locale } from './locale'

const prefixed = (path: string, locale: Locale) => (locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`)

/**
 * hreflang alternates (FR-035). One path for both languages, or `{ en, ar }` when the address
 * differs by language (pages with a localised slug).
 */
export function alternates(path: string | { en: string; ar: string }, locale: Locale): Metadata['alternates'] {
  const paths = typeof path === 'string' ? { en: path, ar: path } : path
  return {
    canonical: prefixed(paths[locale], locale),
    languages: { en: prefixed(paths.en, 'en'), ar: prefixed(paths.ar, 'ar'), 'x-default': prefixed(paths.en, 'en') },
  }
}
