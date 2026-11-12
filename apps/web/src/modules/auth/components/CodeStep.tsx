'use client'

import { combinedPersonaValue, MAX_PROVIDER_PERSONAS } from '@shoot/domain/auth'
import { joinList } from '@shoot/domain/personas'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useId, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { BriefBar, cx, ResultGroup, rowClass, TopHit } from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'
import { Field, FormError } from '@/shared/ui/Field'
import { PersonaSelect, type PersonaOption } from '../../personas/components/PersonaSelect'
import { resendCodeAction, verifyCodeAction, type AuthState } from '../actions'
import { LegalCheck, type LegalLinks } from './LegalCheck'

const left = (resendAt: string, now: number) => Math.max(0, Math.ceil((Date.parse(resendAt) - now) / 1000))
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Seconds until a new code may be asked for, ticking once a second (the only client-side clock here). */
function useCountdown(resendAt: string): number {
  const [seconds, setSeconds] = useState(() => left(resendAt, Date.now()))
  useEffect(() => {
    const timer = setInterval(() => setSeconds(left(resendAt, Date.now())), 1000)
    return () => clearInterval(timer)
  }, [resendAt])
  return seconds
}

/**
 * The code step (FR-060, FR-053): one field with `autocomplete="one-time-code"`, the countdown to a
 * new code, and (standalone sign-in only) the role rows: "I need a …" (default) or "I'm a …", which
 * asks for the professions and the acceptance before Continue.
 */
export function CodeStep({
  locale,
  phone,
  channel,
  resendAt,
  mode,
  personas = [],
  legal,
}: {
  locale: string
  /** The person's own number, already grouped for display (`+971 50 123 4567`). */
  phone: string
  channel: 'sms' | 'whatsapp'
  resendAt: string
  mode: 'login' | 'join' | 'link'
  personas?: PersonaOption[]
  legal?: LegalLinks
}) {
  const t = useTranslations()
  const id = useId()
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyCodeAction, undefined)
  const [resent, resend, resending] = useActionState<AuthState, FormData>(resendCodeAction, undefined)
  const current = { channel: resent?.channel ?? channel, resendAt: resent?.resendAt ?? resendAt }
  const seconds = useCountdown(current.resendAt)
  const [role, setRole] = useState<'seeker' | 'provider'>(state?.values?.role === 'provider' ? 'provider' : 'seeker')
  const err = (key: string) => (state?.errors?.[key] ? t(state.errors[key]) : undefined)
  const other = current.channel === 'sms' ? 'whatsapp' : 'sms'
  const showRoles = mode === 'login' && personas.length > 0
  const list = (kind: 'or' | 'and') => joinList(personas.map((p) => p.label), kind, locale)
  const combined =
    personas.length > 1 && personas.length <= MAX_PROVIDER_PERSONAS
      ? { slug: combinedPersonaValue(personas.map((p) => p.slug)), label: t('auth.personaCombined', { count: personas.length, list: list('and') }) }
      : null
  const problem = state?.formError ? t(state.formError, state.formValues ?? {}) : resent?.formError ? t(resent.formError, resent.formValues ?? {}) : null

  return (
    <div className="grid gap-3">
      <p className="px-1 text-[15px] text-mute" data-testid="sent-to">
        {t.rich('auth.otp.sentTo', { channel: t(`auth.otp.channels.${current.channel}`), phone, num: (chunks) => <Bidi>{chunks}</Bidi> })}{' '}
        <Link href="/login" className="font-medium text-ink underline">
          {t('auth.otp.changeNumber')}
        </Link>
      </p>
      <BriefBar as="form" action={action} noValidate data-testid="code-step" aria-label={t('auth.otp.codeTitle')}>
        <input type="hidden" name="locale" value={locale} />
        <div className="py-2">
          <Field
            id={`${id}-code`}
            name="code"
            dir="ltr"
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            label={t('auth.otp.code')}
            className="[&_input]:font-mono [&_input]:tracking-[0.4em] [&_input]:text-[22px]"
            error={err('code')}
          />
        </div>
        {showRoles ? (
          <ResultGroup as="fieldset" label={t('auth.otp.role')} className="border-t border-hair">
            <div className="grid gap-0.5 px-1 pb-1" role="radiogroup">
              {(['seeker', 'provider'] as const).map((value) => (
                <label key={value} className={cx(rowClass(role === value ? 'set' : 'open'), 'cursor-pointer')}>
                  <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                  <span className="min-w-0 text-[16px] leading-[1.375]">
                    {t(value === 'seeker' ? 'auth.otp.roleSeeker' : 'auth.otp.roleProvider', { list: list('or') })}
                  </span>
                </label>
              ))}
            </div>
          </ResultGroup>
        ) : null}
        {showRoles && role === 'provider' ? (
          <div className="border-t border-hair">
            <PersonaSelect
              id={`${id}-persona`}
              label={t('auth.persona')}
              placeholder={t('auth.personaPlaceholder')}
              emptyMessage={t('auth.noPersonas')}
              options={personas}
              combined={combined}
              defaultValue={state?.values?.persona}
              error={err('persona')}
            />
            <LegalCheck id={id} legal={legal} professional error={err('acceptTerms')} />
          </div>
        ) : null}
        {problem ? <FormError>{problem}</FormError> : null}
        <div className="border-t border-hair py-2">
          <TopHit label={pending ? t('auth.pending') : t('auth.otp.continue')} pending={pending} testId="verify-code" />
        </div>
      </BriefBar>
      <form action={resend} className="px-1 text-[14px] text-mute" data-testid="resend">
        <input type="hidden" name="locale" value={locale} />
        {seconds > 0 ? (
          <p aria-live="polite">{t('auth.otp.resendIn', { time: mmss(seconds) })}</p>
        ) : (
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="submit" name="channel" value={current.channel} disabled={resending} className="min-h-11 font-medium text-ink underline">
              {t('auth.otp.resendSame')}
            </button>
            <button type="submit" name="channel" value={other} disabled={resending} className="min-h-11 font-medium text-ink underline">
              {t('auth.otp.resendOther', { channel: t(`auth.otp.channels.${other}`) })}
            </button>
          </p>
        )}
        {resent?.resendAt ? <p aria-live="polite">{t('auth.otp.resent', { channel: t(`auth.otp.channels.${current.channel}`) })}</p> : null}
      </form>
    </div>
  )
}
