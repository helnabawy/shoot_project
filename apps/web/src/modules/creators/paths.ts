import { localizeHref } from '@/shared/i18n/href'

/** The canonical public path of a creator: lower-case code, no brand prefix (research §8). */
export const creatorPath = (code: string, locale: string): string => localizeHref(`/creators/${code.toLowerCase()}`, locale)
