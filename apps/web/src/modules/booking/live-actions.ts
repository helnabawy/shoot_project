'use server'

import { getCurrentUser } from '@/modules/auth/session'
import { isLocale } from '@/shared/lib/locale'
import { matchStamp } from './match'

/**
 * 022 (research R9): the step-2 fingerprint for the website's live offers list. The brief's private key
 * authorises it, as for the page itself; an unknown reference or wrong key answers null.
 */
export async function liveMatchStamp(ref: string, key: string, locale: string): Promise<string | null> {
  const user = await getCurrentUser()
  return matchStamp(String(ref).slice(0, 32), String(key).slice(0, 64), isLocale(locale) ? locale : 'en', new Date(), user?.id)
}
