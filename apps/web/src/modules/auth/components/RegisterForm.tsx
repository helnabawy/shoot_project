'use client'

import { combinedPersonaValue, MAX_PROVIDER_PERSONAS } from '@shoot/domain/auth'
import { joinList } from '@shoot/domain/personas'
import { useTranslations } from 'next-intl'
import { useActionState, useId, useState, type ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { CheckIcon, SearchIcon, UserIcon } from '@/shared/ui/icons'
import { BriefBar, cx, ResultGroup, TopHit } from '@/shared/ui/bar'
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
  // "Both (A and B)" / "All (A, B and C)": offered whenever several personas are active and a
  // profile can hold them all. Built from the CMS personas, never from named professions.
  const combined =
    personas.length > 1 && personas.length <= MAX_PROVIDER_PERSONAS
      ? {
          slug: combinedPersonaValue(personas.map((p) => p.slug)),
          label: t('auth.personaCombined', { count: personas.length, list: joinList(personas.map((p) => p.label), 'and', locale) }),
        }
      : null

  /**
   * The account type as a pair of choice tiles, side by side even on a 360 px phone: the type's glyph in a
   * tile at the top, its name below, and a radio mark at the top end. A chosen tile wears the set tint and
   * its glyph tile turns selection blue, as a set row does. The radio itself stays native (keyboard, no JS).
   */
  const typeTile = (value: 'seeker' | 'provider', label: string) => {
    const checked = type === value
    const Glyph = value === 'seeker' ? SearchIcon : UserIcon
    return (
      <label
        className={cx(
          'relative grid min-h-[104px] cursor-pointer content-between gap-3 rounded-[var(--radius-row)] border p-3 transition-colors duration-100',
          'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]',
          checked
            ? 'border-transparent bg-selected hover:bg-selected-hover'
            : 'border-hair hover:bg-ink/[0.045] active:bg-ink/[0.08]',
        )}
      >
        <input type="radio" name="accountType" value={value} checked={checked} onChange={() => setType(value)} className="sr-only" />
        <span aria-hidden="true" className="flex items-start justify-between">
          <span
            className={cx(
              'grid size-9 place-items-center rounded-[var(--radius-tile)] transition-colors duration-100',
              checked ? 'bg-accent text-on-accent' : 'bg-tile text-tile-ink',
            )}
          >
            <Glyph width={18} height={18} />
          </span>
          <span
            className={cx(
              'grid size-5 place-items-center rounded-full transition-colors duration-100',
              checked ? 'bg-accent text-on-accent' : 'border border-ink/20',
            )}
          >
            {checked ? <CheckIcon width={12} height={12} /> : null}
          </span>
        </span>
        <span className={cx('text-[15px] leading-snug text-balance', checked ? 'font-semibold text-ink' : 'text-ink')}>{label}</span>
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
          <div className={cx('grid gap-2 px-3 pt-1 pb-2', canOffer && 'grid-cols-2')}>
            {typeTile('seeker', t('auth.seeker'))}
            {canOffer ? typeTile('provider', t('auth.provider')) : null}
          </div>
        </ResultGroup>
        {canOffer ? (
          <div className={type === 'provider' ? 'border-t border-hair' : 'hidden'}>
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
