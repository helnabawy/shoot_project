'use server'

import { answerV1, briefAnswerRequestV1 } from '@shoot/domain/api/v1'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/modules/auth/session'
import { webActor } from '@/modules/auth/web-actor'
import { answerRequest } from '@/modules/booking'
import { answerBrief, onAccepted } from '@/modules/inbox'
import { isProblem } from '@/shared/api/problem'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale, type Locale } from '@/shared/lib/locale'

/**
 * The creator home's two answers (feature 023): a form in, the home out, so they work without JavaScript.
 * Each is a thin adapter over the command the creator's own pages use (`answerRequest`, `answerBrief`), so a
 * request is answered with the same checks, the same writes and the same notifications wherever it is
 * answered from. The home is dynamic and read again after the redirect; only the account pages are revalidated.
 */

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const localeOf = (form: FormData): Locale => {
  const value = str(form, 'locale')
  return isLocale(value) ? value : 'en'
}

/** Back to the creator home, with the problem's message key when there is one. */
function backHome(locale: Locale, error?: string): never {
  const home = localizeHref('/', locale)
  redirect(error ? `${home}?error=${encodeURIComponent(error)}` : home)
}

function revalidateAccount(locale: Locale) {
  for (const path of ['/account', '/account/bookings', '/account/inbox']) revalidatePath(localizeHref(path, locale))
}

async function signedIn(locale: Locale) {
  const user = await getCurrentUser()
  if (!user) redirect(localizeHref('/login', locale))
  return user
}

/** Accept ("confirm") or decline a booking request, with the optional reason. */
export async function answerBookingFromHome(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const user = await signedIn(locale)
  const parsed = answerV1.safeParse({ decision: str(form, 'decision'), reason: str(form, 'reason') || undefined })
  if (!parsed.success) backHome(locale, 'booking.errors.generic')
  const result = await answerRequest(await webActor(locale, user), str(form, 'ref'), parsed.data)
  revalidateAccount(locale)
  backHome(locale, isProblem(result) ? result.code : undefined)
}

/** Accept ("I can do this") or decline a matching brief for one professional type, with the optional reason. */
export async function answerBriefFromHome(form: FormData): Promise<void> {
  const locale = localeOf(form)
  const user = await signedIn(locale)
  const parsed = briefAnswerRequestV1.safeParse({
    persona: str(form, 'persona'),
    decision: str(form, 'decision'),
    reason: str(form, 'reason') || undefined,
    note: str(form, 'note') || undefined,
  })
  if (!parsed.success) backHome(locale, 'inbox.errors.reasonUnknown')
  const result = await answerBrief({ payload: (await webActor(locale, user)).payload, user, locale, now: new Date() }, str(form, 'ref'), parsed.data, onAccepted)
  revalidateAccount(locale)
  backHome(locale, isProblem(result) ? result.code : undefined)
}
