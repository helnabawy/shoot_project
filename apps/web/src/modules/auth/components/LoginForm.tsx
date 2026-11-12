'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { Link } from '@/i18n/navigation'
import { BriefBar, TopHit } from '@/shared/ui/bar'
import { Field, FormError } from '@/shared/ui/Field'
import { login, type AuthState } from '../actions'

export function LoginForm({ locale, next }: { locale: string; next?: string }) {
  const t = useTranslations()
  const id = useId()
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined)
  const err = (key: string) => (state?.errors?.[key] ? t(state.errors[key]) : undefined)
  return (
    <BriefBar>
      <form action={action} noValidate data-testid="login-form" aria-label={t('auth.loginTitle')}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next ?? '/account'} />
        <div className="py-2">
          <Field id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" required label={t('auth.email')} defaultValue={state?.values?.email} error={err('email')} />
          <Field id={`${id}-password`} name="password" type="password" autoComplete="current-password" required label={t('auth.password')} error={err('password')} />
        </div>
        {state?.formError ? <FormError>{t(state.formError)}</FormError> : null}
        <div className="border-t border-hair py-2">
          <TopHit label={pending ? t('auth.pending') : t('auth.submitLogin')} pending={pending} testId="login-submit" />
        </div>
        <p className="border-t border-hair px-4 py-3 text-[14px] text-mute">
          <Link href={{ pathname: '/login', query: next ? { next } : {} }} className="font-medium text-ink underline">
            {t('auth.otp.codeSignIn')}
          </Link>
        </p>
      </form>
    </BriefBar>
  )
}
