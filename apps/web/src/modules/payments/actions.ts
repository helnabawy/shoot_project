'use server'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/modules/auth/session'
import { getQuotationAccess, quotePath } from '@/modules/booking'
import { localizeHref } from '@/shared/i18n/href'
import { getPayloadClient } from '@/shared/lib/payload'
import { startCheckout } from './commands/start-checkout'

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim()

/** "Pay" on the quotation (FR-001 to FR-005): to the provider's secure page, or back with a message key. */
export async function payOnline(form: FormData): Promise<void> {
  const locale = str(form, 'locale') === 'ar' ? 'ar' : 'en'
  const ref = str(form, 'ref')
  const key = str(form, 'key')
  const user = await getCurrentUser()
  const path = key ? quotePath(ref, key, locale) : localizeHref(`/account/bookings/${ref}`, locale)
  const access = await getQuotationAccess(ref, key || null, user?.id, locale)
  if (!access) redirect(`${path}?error=booking.errors.not-found`)
  const result = await startCheckout(await getPayloadClient(), access, { locale, now: new Date(), returnPath: path })
  if (!result.ok) redirect(`${path}?error=${result.reason === 'not-allowed' ? 'booking.errors.not-allowed' : `payment.errors.${result.reason}`}`)
  redirect(result.url)
}
