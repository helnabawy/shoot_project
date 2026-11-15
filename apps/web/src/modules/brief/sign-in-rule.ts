import type { SiteSetting } from '@/payload-types'

/** Feature 021: recording a brief needs a signed-in member while the owner's switch is on (default on). */
export const briefNeedsSignIn = (settings: Pick<SiteSetting, 'briefNeedsSignIn'>) => settings.briefNeedsSignIn !== false
