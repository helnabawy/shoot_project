import type { Metadata } from 'next'
import { type Locale } from './locale'

const prefixed = (path: string, locale: Locale) => (locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`)

/** hreflang alternates for a path in both languages (FR-035). */
export function alternates(path: string, locale: Locale): Metadata['alternates'] {
  return {
    canonical: prefixed(path, locale),
    languages: { en: prefixed(path, 'en'), ar: prefixed(path, 'ar'), 'x-default': prefixed(path, 'en') },
  }
}
