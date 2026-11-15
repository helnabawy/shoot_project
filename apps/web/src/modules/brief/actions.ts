'use server'

import { redirect } from 'next/navigation'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getCurrentUser } from '../auth/session'
import { briefNeedsSignIn, prepareBrief, recordPrepared, visitorId } from './commands/send-brief'
import { clearKept, keepBrief } from './kept-cookie'
import { briefLoginUrl } from './paths'
import type { BriefState } from './types'

/**
 * Records a brief and hands the visitor to Quick Match or WhatsApp (FR-049, FR-050, FR-055). Feature
 * 021: while "Briefs need sign-in" is on, a guest's valid brief is kept on their device instead and
 * they go to sign in; `GET /brief/send` records it once they are in.
 */
export async function submitBrief(_prev: BriefState, form: FormData): Promise<BriefState> {
  const localeValue = String(form.get('locale') ?? 'en')
  const locale: Locale = isLocale(localeValue) ? localeValue : 'en'
  const hasJs = form.get('js') === '1'

  const ready = await prepareBrief(form, locale)
  if (!ready.ok) return ready.state
  const { prepared } = ready

  const user = await getCurrentUser()
  if (!user && briefNeedsSignIn(prepared.settings)) {
    // BS-US1-S1: validated as today, kept, nothing recorded.
    if (!(await keepBrief(prepared, new Date()))) return { status: 'error', errors: {}, formError: 'brief.errors.generic' }
    const loginUrl = briefLoginUrl(locale)
    if (!hasJs) redirect(loginUrl)
    return { status: 'signIn', loginUrl }
  }

  const result = await recordPrepared(prepared, user, await visitorId())
  // A brief kept before (sent another way since) is not offered again (BS-US3-S4).
  if (result.status === 'ok') await clearKept()
  if (result.status === 'ok' && !hasJs) redirect(result.matchUrl ?? result.whatsappUrl)
  return result
}
