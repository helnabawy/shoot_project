'use client'

import { useTranslations } from 'next-intl'
import { useActionState, useId, useState, type ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { CheckIcon, SearchIcon, UserIcon } from '@/shared/ui/icons'
import { BriefBar, ResultGroup, rowClass, RowContent, TopHit } from '@/shared/ui/bar'
import { Field, FieldError, FormError } from '@/shared/ui/Field'
import { PersonaSelect, type PersonaOption } from '../../personas/components/PersonaSelect'
import { register, type AuthState } from '../actions'

/** FR-060: only name, email, password, account type (and profession for providers). */
export function RegisterForm({
  locale,
  next,
  personas,
  initialType = 'seeker',
  initialPersona,
  legal,
}: {
  locale: string
  next?: string
  personas: PersonaOption[]
  initialType?: 'seeker' | 'provider'
  initialPersona?: string
  /** Links to the documents in force, per kind; null where none is published yet. */
  legal?: Partial<Record<'terms' | 'professional-terms' | 'privacy', { label: string; href: string } | null>>
}) {
  const t = useTranslations()
  const id = useId()
  const [state, action, pending] = useActionState<AuthState, FormData>(register, undefined)
  const [type, setType] = useState<'seeker' | 'provider'>(() => (state?.values?.accountType as 'seeker' | 'provider') ?? initialType)
  const err = (key: string) => (state?.errors?.[key] ? t(state.errors[key]) : undefined)
  const canOffer = personas.length > 0

  const typeRow = (value: 'seeker' | 'provider', label: string) => {
    const checked = type === value
    return (
      <label className={rowClass(checked ? 'set' : 'open')}>
        <input type="radio" name="accountType" value={value} checked={checked} onChange={() => setType(value)} className="sr-only" />
        <RowContent glyph={checked ? <CheckIcon width={15} height={15} /> : value === 'seeker' ? <SearchIcon width={15} height={15} /> : <UserIcon width={15} height={15} />} label={label} state={checked ? 'set' : 'open'} />
      </label>
    )
  }

  return (
    <BriefBar>
      <form action={action} noValidate data-testid="register-form" aria-label={t('auth.registerTitle')}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next ?? '/account'} />
        <div className="py-2">
          <Field id={`${id}-name`} name="name" autoComplete="name" required label={t('auth.name')} defaultValue={state?.values?.name} error={err('name')} />
          <Field id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" required label={t('auth.email')} defaultValue={state?.values?.email} error={err('email')} />
          <Field id={`${id}-password`} name="password" type="password" autoComplete="new-password" required minLength={8} label={t('auth.password')} hint={t('auth.passwordHint')} error={err('password')} />
        </div>
        <ResultGroup as="fieldset" label={t('auth.accountType')} className="border-t border-hair">
          {typeRow('seeker', t('auth.seeker'))}
          {canOffer ? typeRow('provider', t('auth.provider')) : null}
        </ResultGroup>
        {canOffer ? (
          <div className={type === 'provider' ? 'border-t border-hair' : 'hidden'}>
            <PersonaSelect
              id={`${id}-persona`}
              label={t('auth.persona')}
              placeholder={t('auth.personaPlaceholder')}
              emptyMessage={t('auth.noPersonas')}
              options={personas}
              defaultValue={state?.values?.persona || initialPersona}
              error={err('persona')}
            />
          </div>
        ) : null}
        <div className="border-t border-hair px-4 py-3" data-testid="accept-terms">
          <label className="flex min-h-11 items-start gap-3 text-[14px] text-ink">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              aria-invalid={err('acceptTerms') ? true : undefined}
              aria-describedby={err('acceptTerms') ? `${id}-accept-error` : undefined}
              className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
            />
            <span>
              {t.rich(type === 'provider' ? 'auth.acceptTermsWithProfessional' : 'auth.acceptTerms', {
                terms: (chunks) => <LegalLink doc={legal?.terms}>{chunks}</LegalLink>,
                privacy: (chunks) => <LegalLink doc={legal?.privacy}>{chunks}</LegalLink>,
                professional: (chunks) => <LegalLink doc={legal?.['professional-terms']}>{chunks}</LegalLink>,
              })}
            </span>
          </label>
          {err('acceptTerms') ? <FieldError id={`${id}-accept-error`}>{err('acceptTerms')}</FieldError> : null}
        </div>
        {state?.formError ? <FormError>{t(state.formError)}</FormError> : null}
        <div className="border-t border-hair py-2">
          <TopHit label={pending ? t('auth.pending') : t('auth.submitRegister')} pending={pending} testId="register-submit" />
        </div>
        <p className="border-t border-hair px-4 py-3 text-[14px] text-mute">
          {t('auth.haveAccount')}{' '}
          <Link href={{ pathname: '/login', query: next ? { next } : {} }} className="font-medium text-ink underline">
            {t('nav.login')}
          </Link>
        </p>
      </form>
    </BriefBar>
  )
}

/** A link to a legal document, or the plain words when it is not published yet. */
function LegalLink({ doc, children }: { doc: { href: string } | null | undefined; children: ReactNode }) {
  if (!doc) return <>{children}</>
  return (
    <Link href={doc.href} target="_blank" className="font-medium underline">
      {children}
    </Link>
  )
}
