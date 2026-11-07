'use server'

import { isProviderRegistrationValid, loginSchema, registerSchema } from '@shoot/domain/auth'
import { cookies } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { isPayloadError } from '@/shared/payload/errors'
import { getActivePersonas } from '../personas/queries'
import { safeNext } from './safe-next'

export type AuthState = { errors?: Record<string, string>; formError?: string; values?: Record<string, string> } | undefined

const localeOf = (form: FormData): Locale => {
  const value = String(form.get('locale') ?? 'en')
  return isLocale(value) ? value : 'en'
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of issues) errors[String(issue.path[0])] ??= issue.message
  return errors
}

async function setSessionCookie(token: string, exp: number | undefined) {
  const payload = await getPayloadClient()
  ;(await cookies()).set(`${payload.config.cookiePrefix}-token`, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: exp ? new Date(exp * 1000) : undefined,
  })
}

/** FR-022 / FR-023: log in; wrong credentials and locked accounts get distinct, safe messages. */
export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form)
  const values = { email: String(form.get('email') ?? '') }
  const parsed = loginSchema.safeParse({ email: form.get('email'), password: form.get('password') })
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values }
  const payload = await getPayloadClient()
  try {
    const result = await payload.login({ collection: 'users', data: parsed.data })
    if (!result.token) return { formError: 'auth.errors.generic', values }
    await setSessionCookie(result.token, result.exp)
  } catch (error) {
    if (isPayloadError(error, 'LockedAuth')) return { formError: 'auth.errors.locked', values }
    if (isPayloadError(error, 'AuthenticationError')) return { formError: 'auth.errors.invalid', values }
    return { formError: 'auth.errors.generic', values }
  }
  redirect({ href: safeNext(form.get('next')), locale })
}

/** FR-019 / FR-020: create an account, sign in, land on the account page (or `next`). */
export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const locale = localeOf(form)
  const raw = {
    name: form.get('name') ?? '',
    email: form.get('email') ?? '',
    password: form.get('password') ?? '',
    accountType: form.get('accountType') ?? '',
    persona: form.get('accountType') === 'provider' ? (form.get('persona') ?? '') : '',
    categories: form.getAll('categories').map(String),
  }
  const values = { name: String(raw.name), email: String(raw.email), accountType: String(raw.accountType), persona: String(raw.persona) }
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) return { errors: fieldErrors(parsed.error.issues), values }

  const personas = await getActivePersonas(locale)
  if (!isProviderRegistrationValid(parsed.data, personas.map((p) => p.slug))) {
    return { errors: { persona: 'auth.errors.personaInactive' }, values }
  }
  const persona = personas.find((p) => p.slug === parsed.data.persona)
  const payload = await getPayloadClient()
  try {
    // overrideAccess:false keeps field access in force: a "roles" value in the form is ignored (US4-S7).
    await payload.create({
      collection: 'users',
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        accountType: parsed.data.accountType,
        persona: persona ? Number(persona.id) : null,
      },
      overrideAccess: false,
    })
    const result = await payload.login({ collection: 'users', data: { email: parsed.data.email, password: parsed.data.password } })
    if (result.token) await setSessionCookie(result.token, result.exp)
  } catch (error) {
    if (isPayloadError(error, 'ValidationError') && JSON.stringify(error.data).includes('email')) {
      return { errors: { email: 'auth.errors.emailTaken' }, values }
    }
    return { formError: 'auth.errors.generic', values }
  }
  redirect({ href: safeNext(form.get('next')), locale })
}

export async function logout(form: FormData): Promise<void> {
  const payload = await getPayloadClient()
  ;(await cookies()).delete(`${payload.config.cookiePrefix}-token`)
  redirect({ href: '/', locale: localeOf(form) })
}
