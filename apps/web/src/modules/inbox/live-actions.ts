'use server'

import { getCurrentUser } from '@/modules/auth/session'
import { isLocale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { inboxStamp } from './queries'

/** 022 (research R9): the signed-in creator's inbox fingerprint, for the website's live inbox. */
export async function liveInboxStamp(locale: string): Promise<string | null> {
  const user = await getCurrentUser()
  if (user?.accountType !== 'provider') return null
  return inboxStamp({ payload: await getPayloadClient(), locale: isLocale(locale) ? locale : 'en', now: new Date() }, user.id)
}
