import { localizeHref } from '@/shared/i18n/href'

/**
 * The canonical public path of a creator: lower-case code, no brand prefix (research §8). 022 (FR-016d): opened
 * from the offers page, it carries that page as `back` so the profile can lead the client back to it.
 */
export const creatorPath = (code: string, locale: string, back?: string): string => {
  const path = localizeHref(`/creators/${code.toLowerCase()}`, locale)
  return back ? `${path}?back=${encodeURIComponent(back)}` : path
}

/** Only a same-site Quick Match step-2 path, with or without its picks: anything else is dropped (no open redirect). */
const STEP_TWO = /^\/(?:ar\/)?match\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+(?:\?pick=[A-Za-z0-9%._:,~-]*)?$/

/** 022 (FR-016d): the offers page a profile was opened from, or `null`. */
export function backToOffers(raw: unknown): string | null {
  return typeof raw === 'string' && STEP_TWO.test(raw) ? raw : null
}
