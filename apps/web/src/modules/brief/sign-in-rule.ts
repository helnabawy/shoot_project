import type { SiteSetting } from '@/payload-types'

/**
 * Feature 021: recording a brief needs a signed-in member while the owner's switch is on. Off by default
 * since the 2026-11-15 amendment (sign-in moved to accepting the quotation); a missing value is off.
 */
export const briefNeedsSignIn = (settings: Pick<SiteSetting, 'briefNeedsSignIn'>) => settings.briefNeedsSignIn === true
