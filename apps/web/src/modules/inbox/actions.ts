'use server'

import { briefAnswerRequestV1 } from '@shoot/domain/api/v1'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/modules/auth/session'
import { isProblem } from '@/shared/api/problem'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { answerBrief } from './commands/answer-brief'
import { onAccepted } from './commands/notify-brief'
import { withdrawAnswer } from './commands/withdraw-answer'

/** The website's adapters for the inbox commands (feature 019): form in, redirect out, so they work without JavaScript. */

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const localeOf = (form: FormData): Locale => {
  const value = str(form, 'locale')
  return isLocale(value) ? value : 'en'
}

function back(path: string, error?: string): never {
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : path)
}

async function actorFor(form: FormData) {
  const locale = localeOf(form)
  const path = localizeHref('/account/inbox', locale)
  const user = await getCurrentUser()
  if (!user) back(localizeHref('/login', locale))
  return { actor: { payload: await getPayloadClient(), user, locale, now: new Date() }, path, locale }
}

function done(path: string, locale: Locale, result: unknown): never {
  revalidatePath(localizeHref('/account', locale))
  revalidatePath(path)
  if (isProblem(result)) back(path, result.code)
  back(path)
}

/** Accept ("I can do this") or reject ("Not for me", optional reason and note) one brief for one type. */
export async function answerBriefAction(form: FormData): Promise<void> {
  const { actor, path, locale } = await actorFor(form)
  const parsed = briefAnswerRequestV1.safeParse({
    persona: str(form, 'persona'),
    decision: str(form, 'decision'),
    reason: str(form, 'reason') || undefined,
    note: str(form, 'note') || undefined,
  })
  if (!parsed.success) back(path, 'inbox.errors.reasonUnknown')
  done(path, locale, await answerBrief(actor, str(form, 'ref'), parsed.data, onAccepted))
}

/** Undo "Not for me", or withdraw "I can do this" before the client picks you. */
export async function withdrawBriefAction(form: FormData): Promise<void> {
  const { actor, path, locale } = await actorFor(form)
  done(path, locale, await withdrawAnswer(actor, str(form, 'ref'), str(form, 'persona')))
}
