import { localizeHref } from '@/shared/i18n/href'

/** Where sign-in ends for a kept brief (feature 021): the route that sends it. */
export const BRIEF_SEND_PATH = '/brief/send'

/** The sign-in screen for a guest's brief: `/login?next=/brief/send&for=brief` in the page language. */
export const briefLoginUrl = (locale: string) => `${localizeHref('/login', locale)}?next=${encodeURIComponent(BRIEF_SEND_PATH)}&for=brief`
