import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'

export const matchPath = (ref: string, key: string, locale: Locale | string) => localizeHref(`/match/${ref}/${key}`, locale)
export const detailsPath = (ref: string, key: string, locale: Locale | string, picks: string) =>
  `${localizeHref(`/match/${ref}/${key}/details`, locale)}?pick=${encodeURIComponent(picks)}`
export const quotePath = (ref: string, key: string, locale: Locale | string) => localizeHref(`/q/${ref}/${key}`, locale)
export const memberBookingPath = (ref: string, locale: Locale | string) => localizeHref(`/account/bookings/${ref}`, locale)

/** Absolute URL for links inside notifications. */
export function absolute(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return `${base}${path}`
}
