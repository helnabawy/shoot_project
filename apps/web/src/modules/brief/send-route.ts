import 'server-only'
import { encodeKeptBrief, KEPT_BRIEF_COOKIE } from '@shoot/domain/brief/kept'
import { NextResponse } from 'next/server'
import type { User } from '@/payload-types'
import { localizeHref } from '@/shared/i18n/href'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getCurrentUser } from '../auth/session'
import { prepareBrief, recordPrepared, visitorId } from './commands/send-brief'
import { keptCookieOptions, readKept } from './kept-cookie'
import { briefLoginUrl } from './paths'

/** Where the person goes, and what becomes of the kept brief's cookie. */
export interface KeptOutcome {
  location: string
  /** `null` clears the cookie; a string rewrites it (the brief with its error). */
  cookie: string | null
}

/**
 * Sends the kept brief as [user] (feature 021, contracts/web-flow.md) through the same core as the brief
 * action: recorded → where a member's brief continues (step 2, the details step, or WhatsApp); nothing kept
 * (or too old) → the account; cannot be sent now → back to its page with the reason (BS-US3-S2).
 */
export async function sendKept(user: User, locale: Locale): Promise<KeptOutcome> {
  const kept = await readKept(new Date())
  if (!kept) return { location: localizeHref('/account', locale), cookie: null }
  const form = new FormData()
  for (const [name, v] of kept.entries) form.append(name, v)
  form.set('locale', kept.locale)
  form.set('sourcePath', kept.path)
  form.set('js', '1')
  const ready = await prepareBrief(form, kept.locale as Locale)
  const result = ready.ok ? await recordPrepared(ready.prepared, user, await visitorId()) : ready.state
  if (result.status === 'ok') return { location: result.matchUrl ?? result.whatsappUrl, cookie: null }
  const failed = result as Extract<typeof result, { status: 'error' }>
  const encoded = encodeKeptBrief({ ...kept, error: { errors: failed.errors, ...(failed.formError ? { formError: failed.formError } : {}) } })
  return { location: kept.path, cookie: encoded }
}

/**
 * `GET /brief/send`: for a member who is already signed in when they reach sign-in for a brief (the login
 * page sends them on here). Sign-in by code sends the brief in the code step itself. The cookie change
 * rides on the redirect response (cookies changed before `redirect()` in a route handler are lost).
 */
export async function sendKeptBrief(_request: Request, { params }: { params: Promise<{ locale: string }> }): Promise<Response> {
  const { locale: value } = await params
  const locale: Locale = isLocale(value) ? value : 'en'
  const user = await getCurrentUser()
  const outcome: { location: string; cookie?: string | null } = user ? await sendKept(user, locale) : { location: briefLoginUrl(locale) }
  const res = new NextResponse(null, { status: 303, headers: { Location: outcome.location, 'Cache-Control': 'no-store' } })
  if (outcome.cookie === null) res.cookies.delete(KEPT_BRIEF_COOKIE)
  else if (outcome.cookie) res.cookies.set(KEPT_BRIEF_COOKIE, outcome.cookie, keptCookieOptions())
  return res
}
