'use client'

import { combinedPersonaValue, MAX_PROVIDER_PERSONAS } from '@shoot/domain/auth'
import { joinList } from '@shoot/domain/personas'
import { useTranslations } from 'next-intl'
import { useActionState, useId } from 'react'
import { Link } from '@/i18n/navigation'
import { BriefBar, TopHit } from '@/shared/ui/bar'
import { Field, FormError } from '@/shared/ui/Field'
import { PersonaSelect, type PersonaOption } from '../../personas/components/PersonaSelect'
import { requestCodeAction, type AuthState } from '../actions'
import { ChannelChoice } from './ChannelChoice'
import { LegalCheck, type LegalLinks } from './LegalCheck'

/**
 * The number step (FR-060): the website's `/login`, `/register` (Join as a creator, with the
 * professions and the acceptance) and "Add your mobile number". One primary action: Send code.
 */
export function PhoneStep({
  locale,
  next,
  mode = 'login',
  personas = [],
  initialPersona,
  legal,
}: {
  locale: string
  next?: string
  mode?: 'login' | 'join' | 'link'
  personas?: PersonaOption[]
  initialPersona?: string
  legal?: LegalLinks
}) {
  const t = useTranslations()
  const id = useId()
  const [state, action, pending] = useActionState<AuthState, FormData>(requestCodeAction, undefined)
  const err = (key: string) => (state?.errors?.[key] ? t(state.errors[key]) : undefined)
  const combined =
    personas.length > 1 && personas.length <= MAX_PROVIDER_PERSONAS
      ? {
          slug: combinedPersonaValue(personas.map((p) => p.slug)),
          label: t('auth.personaCombined', { count: personas.length, list: joinList(personas.map((p) => p.label), 'and', locale) }),
        }
      : null
  const label = mode === 'join' ? t('auth.otp.joinTitle') : mode === 'link' ? t('auth.otp.linkTitle') : t('auth.loginTitle')
  return (
    <BriefBar>
      <form action={action} noValidate data-testid="phone-step" aria-label={label}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next ?? '/account'} />
        {mode === 'join' ? (
          <PersonaSelect
            id={`${id}-persona`}
            label={t('auth.persona')}
            placeholder={t('auth.personaPlaceholder')}
            emptyMessage={t('auth.noPersonas')}
            options={personas}
            combined={combined}
            defaultValue={state?.values?.persona || initialPersona}
            error={err('persona')}
          />
        ) : null}
        <div className={mode === 'join' ? 'border-t border-hair py-2' : 'py-2'}>
          <Field
            id={`${id}-phone`}
            name="phone"
            type="tel"
            dir="ltr"
            autoComplete="tel-national"
            inputMode="tel"
            required
            label={t('auth.otp.phone')}
            hint={t('auth.otp.phoneHint')}
            placeholder="50 123 4567"
            defaultValue={state?.values?.phone}
            error={err('phone')}
          />
        </div>
        <ChannelChoice defaultValue={state?.values?.channel} />
        {mode === 'join' ? <LegalCheck id={id} legal={legal} professional error={err('acceptTerms')} /> : null}
        {state?.formError ? <FormError>{t(state.formError, state.formValues ?? {})}</FormError> : null}
        <div className="border-t border-hair py-2">
          <TopHit label={pending ? t('auth.pending') : t('auth.otp.sendCode')} pending={pending} testId="send-code" />
        </div>
        {mode === 'login' ? (
          <div className="grid gap-1 border-t border-hair px-4 py-3 text-[14px] text-mute">
            <p>
              {t('auth.otp.joinPrompt')}{' '}
              <Link href={{ pathname: '/register', query: next ? { next } : {} }} className="font-medium text-ink underline">
                {t('auth.otp.joinLink')}
              </Link>
            </p>
          </div>
        ) : mode === 'join' ? (
          <p className="border-t border-hair px-4 py-3 text-[14px] text-mute">
            {t('auth.haveAccount')}{' '}
            <Link href={{ pathname: '/login', query: next ? { next } : {} }} className="font-medium text-ink underline">
              {t('nav.login')}
            </Link>
          </p>
        ) : null}
      </form>
    </BriefBar>
  )
}
