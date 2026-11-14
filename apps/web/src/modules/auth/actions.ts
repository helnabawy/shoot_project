'use server'

import { otpRequestV1 } from '@shoot/domain/api/v1'
import { cookies } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import type { User } from '@/payload-types'
import type { Problem } from '@/shared/api/problem'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { endSession } from './commands/end-session'
import { linkNumber } from './commands/link-number'
import { channelLabel } from './otp/message'
import { requestCode } from './commands/request-code'
import { verifyCode } from './commands/verify-code'
import { clearPending, readPending, writePending, type PendingChallenge } from './pending'
import { safeNext } from './safe-next'
import { getCurrentUser } from './session'
import { webActor } from './web-actor'

export type AuthState =
  | {
      errors?: Record<string, string>
      formError?: string
      /** Values for the form error's placeholders ({minutes}, {time}, {otherChannel}). */
      formValues?: Record<string, string | number>
      values?: Record<string, string>
      /** The code step after a resend: when the next code may be asked for, and by which channel. */
      resendAt?: string
      channel?: 'sms' | 'whatsapp'
      /** The code was right but the number is new: ask the role, keeping the typed code. */
      needsRole?: boolean
    }
  | undefined

const localeOf = (form: FormData): Locale => {
  const value = String(form.get('locale') ?? 'en')
  return isLocale(value) ? value : 'en'
}

export async function setSessionCookie(token: string, exp: number | undefined) {
  const payload = await getPayloadClient()
  ;(await cookies()).set(`${payload.config.cookiePrefix}-token`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: exp ? new Date(exp * 1000) : undefined,
  })
}

/** FR-062: logging out ends the session on the server (the old cookie stops working), then clears it. */
export async function logout(form: FormData): Promise<void> {
  const payload = await getPayloadClient()
  const user = await getCurrentUser()
  if (user) await endSession(payload, user).catch(() => payload.logger.error('logout: could not end the session'))
  ;(await cookies()).delete(`${payload.config.cookiePrefix}-token`)
  redirect({ href: '/', locale: localeOf(form) })
}

// ---- Sign-in by one-time code (feature 009, User Story 5). Thin adapters over the commands the API runs.

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** A command's problem as form state: field codes on their field, everything else as the form's message. */
function stateOf(problem: Problem, values: Record<string, string>, otherChannel: string): AuthState {
  if (problem.fields?.length) {
    const errors: Record<string, string> = {}
    for (const f of problem.fields) {
      const field = f.path.split('.').at(-1) as string
      errors[field === 'personas' ? 'persona' : field] ??= f.code
    }
    return { errors, values }
  }
  const retry = problem.retryAfter ?? 60
  const formValues: Record<string, string | number> = { minutes: Math.max(1, Math.ceil(retry / 60)), time: mmss(retry), otherChannel }
  return { formError: problem.code, formValues, values }
}

const isProblemValue = (v: unknown): v is Problem => typeof v === 'object' && v !== null && 'status' in v && 'code' in v

/**
 * The number step of `/login`, `/register` (Join as a creator) and "Add your mobile number":
 * validates, sends the code through `request-code`, keeps the challenge in the HTTP-only pending
 * cookie and opens the code step.
 */
export async function requestCodeAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form)
  const mode = (['join', 'link'].includes(String(form.get('mode'))) ? String(form.get('mode')) : 'login') as PendingChallenge['mode']
  const values = { phone: String(form.get('phone') ?? ''), channel: String(form.get('channel') ?? 'sms'), persona: String(form.get('persona') ?? '') }
  const parsed = otpRequestV1.safeParse({ phone: values.phone, channel: values.channel })
  const errors: Record<string, string> = {}
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message.startsWith('auth.') ? i.message : 'auth.errors.phoneInvalid'
  const personas = [...new Set(values.persona.split(',').map((p) => p.trim()).filter(Boolean))]
  if (mode === 'join') {
    // OT-US4-S4: nothing is sent without a profession and the acceptance.
    if (personas.length === 0) errors.persona = 'auth.errors.personaRequired'
    if (form.get('acceptTerms') !== 'on') errors.acceptTerms = 'auth.errors.acceptTerms'
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { errors, values }

  const user = mode === 'link' ? await getCurrentUser() : null
  if (mode === 'link' && !user) redirect({ href: { pathname: '/login', query: { next: '/account' } }, locale })
  const ctx = await webActor(locale, user)
  const result = await requestCode(ctx, parsed.data)
  const other = channelLabel(locale, parsed.data.channel === 'sms' ? 'whatsapp' : 'sms')
  if (isProblemValue(result)) return stateOf(result, values, other)

  await writePending({
    challengeId: result.challengeId,
    phone: result.phone,
    channel: result.channel,
    resendAt: result.resendAt,
    mode,
    next: safeNext(form.get('next')),
    personas: mode === 'join' ? personas : [],
  })
  redirect({ href: '/login/code', locale })
}

/** "Send it again" / "send it on WhatsApp" on the code step, once the countdown allows it. */
export async function resendCodeAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form)
  const pending = await readPending()
  if (!pending) redirect({ href: '/login', locale })
  const p = pending as PendingChallenge
  const channel = form.get('channel') === 'whatsapp' ? 'whatsapp' : 'sms'
  const user = p.mode === 'link' ? await getCurrentUser() : null
  const result = await requestCode(await webActor(locale, user), { phone: p.phone, channel })
  if (isProblemValue(result)) return stateOf(result, {}, channelLabel(locale, channel === 'sms' ? 'whatsapp' : 'sms'))
  await writePending({ ...p, challengeId: result.challengeId, channel: result.channel, resendAt: result.resendAt })
  return { resendAt: result.resendAt, channel: result.channel }
}

/**
 * The code step (FR-060): verifies through `verify-code` (or `link-number` for an email member) and
 * sets the same HTTP-only `payload-token` cookie as the email login.
 */
export async function verifyCodeAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form)
  const pending = await readPending()
  if (!pending) redirect({ href: '/login', locale })
  const p = pending as PendingChallenge
  const code = String(form.get('code') ?? '').replace(/\D/g, '')
  const values = { role: String(form.get('role') ?? 'seeker'), persona: String(form.get('persona') ?? '') }
  if (!/^\d{6}$/.test(code)) return { errors: { code: 'auth.errors.codeInvalid' }, values }
  const other = channelLabel(locale, p.channel === 'sms' ? 'whatsapp' : 'sms')

  if (p.mode === 'link') {
    const user = await getCurrentUser()
    if (!user) redirect({ href: { pathname: '/login', query: { next: '/account' } }, locale })
    const linked = await linkNumber({ ...(await webActor(locale, user)), user: user as User }, { challengeId: p.challengeId, phone: p.phone, code })
    if (isProblemValue(linked)) return stateOf(linked, values, other)
    await clearPending()
    redirect({ href: '/account', locale })
  }

  // Standalone sign-in, before the role was asked: a known number signs straight in; a new one
  // comes back to this step with the role rows and the code kept.
  if (p.mode === 'login' && !form.has('role') && form.get('askRole') === '1') {
    const known = await verifyCode(await webActor(locale), { challengeId: p.challengeId, phone: p.phone, code, askIfNew: true })
    if (isProblemValue(known)) {
      if (known.code === 'auth.errors.signupRequired') return { needsRole: true, values: { ...values, code } }
      return stateOf(known, values, other)
    }
    await setSessionCookie(known.token, known.exp)
    await clearPending()
    redirect({ href: p.next, locale })
  }

  const personas = p.mode === 'join' ? p.personas : [...new Set(values.persona.split(',').map((s) => s.trim()).filter(Boolean))]
  const provider = p.mode === 'join' || values.role === 'provider'
  if (p.mode === 'login' && provider) {
    const errors: Record<string, string> = {}
    if (personas.length === 0) errors.persona = 'auth.errors.personaRequired'
    if (form.get('acceptTerms') !== 'on') errors.acceptTerms = 'auth.errors.acceptTerms'
    if (Object.keys(errors).length) return { errors, values: { ...values, code }, needsRole: true }
  }
  const signup = provider ? { accountType: 'provider' as const, personas, acceptTerms: true as const } : { accountType: 'seeker' as const, personas: [] }
  const result = await verifyCode(await webActor(locale), { challengeId: p.challengeId, phone: p.phone, code, signup })
  if (isProblemValue(result)) return stateOf(result, values, other)

  await setSessionCookie(result.token, result.exp)
  await clearPending()
  // A new professional starts on their profile (feature 002); a `next` they came with still wins.
  const next = result.isNew && result.user.accountType === 'provider' && p.next === '/account' ? '/account/profile' : p.next
  redirect({ href: next, locale })
}
