'use client'

import { joinList } from '@shoot/domain/personas'
import { PROFILE_LIMITS, SOCIAL_PLATFORMS } from '@shoot/domain/creators'
import { useTranslations } from 'next-intl'
import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { BriefBar, cx, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { FieldError, FormError } from '@/shared/ui/Field'
import { CheckIcon } from '@/shared/ui/icons'
import { submitProfileForm, type ProfileState } from '../actions'
import { errorMessageKey } from '../errors'
import type { MyProfile, SelectableOptions } from '../my-profile'
import { FieldErrorsContext } from './ActionForm'
import { CheckRow } from './CheckRow'
import { LocalizedPair } from './LocalizedPair'

const FORM_ID = 'profile-form'
const idle: ProfileState = { status: 'idle' }
const SOCIAL_SLOTS = 4

const sectionTitle = 'px-1 text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink text-balance sm:text-[30px]'
const block = '-mx-3 mt-4 divide-y divide-hair border-y border-hair'

/**
 * "My profile": basics, specialties and places, links, with the samples between (passed in) and the
 * one closing action at the end. The form element is empty; every field points at it with the HTML
 * `form` attribute, which lets the sample forms sit among the fields without nesting forms. Without
 * JavaScript it is a plain form (surface brief provider-profile).
 */
export function ProfileForm({
  locale,
  profile,
  options,
  defaults,
  samples,
}: {
  locale: string
  profile: MyProfile | null
  options: SelectableOptions
  /** Used before the first save: the name and the choices made at registration. */
  defaults: { name: string; personas: number[]; specialties: number[] }
  samples: ReactNode
}) {
  const t = useTranslations('creators.form')
  const te = useTranslations('creators.err')
  const tp = useTranslations('creators.profile')
  const [state, action, pending] = useActionState(submitProfileForm, idle)
  const errors = state.status === 'error' ? state.errors : {}
  // A failed save moves the reader to the first thing to fix: its field, or its message when it is a group.
  useEffect(() => {
    if (state.status !== 'error') return
    const field = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (field) field.focus()
    else document.querySelector<HTMLElement>('[id$="-error"]')?.scrollIntoView({ block: 'center' })
  }, [state])
  const err = (field: string) => (errors[field] ? te(errorMessageKey(errors[field]) as never) : undefined)

  const personaIds = profile?.personas ?? defaults.personas
  const [chosen, setChosen] = useState(() => new Set(personaIds.map(String)))
  const picked = new Set((profile?.specialties ?? defaults.specialties).map(Number))
  const visible = (personas: number[]) => chosen.size === 0 || personas.some((p) => chosen.has(String(p)))

  const complete = (profile?.missing.length ?? 6) === 0
  const auto = Boolean(profile?.autoPublish && profile.isPublished)
  const needsReview = !auto && complete && (profile?.status === 'draft' || profile?.status === 'live-with-changes')
  const primary = auto ? { intent: 'save', label: t('publish') } : needsReview ? { intent: 'send', label: t('send') } : { intent: 'save', label: t('save') }
  const missingText = (profile?.missing ?? ['displayName', 'personas', 'specialties', 'cities', 'languages', 'gender']).map((f) => t(`incompleteMissing.${f}` as never))

  const feedback =
    state.status === 'saved'
      ? state.submitted
        ? t('sent')
        : state.published
          ? t('savedLive')
          : t('saved')
      : state.status === 'error'
        ? t('fixErrors')
        : !complete
          ? t('incomplete', { missing: joinList(missingText, 'and', locale) })
          : null

  const labels = { en: t('english'), ar: t('arabic'), arabicHelp: t('arabicHelp') }
  const socialRows = Math.min(PROFILE_LIMITS.social, Math.max(SOCIAL_SLOTS, profile?.social.length ?? 0))

  return (
    <>
      <form id={FORM_ID} action={action} />
      <input type="hidden" name="locale" value={locale} form={FORM_ID} />
      {state.status === 'error' && state.formError && !Object.keys(errors).length ? <FormError>{te(errorMessageKey(state.formError) as never)}</FormError> : null}

      <section className="mt-10" aria-labelledby="sec-basics" data-testid="section-basics">
        <h2 id="sec-basics" className={sectionTitle}>{t('basics')}</h2>
        <div className={block}>
          <LocalizedPair id="displayName" label={t('name')} form={FORM_ID} locale={locale} showArabicHelp values={profile?.displayName ?? { en: defaults.name, ar: '' }} errors={{ en: err('displayName_en'), ar: err('displayName_ar') }} labels={labels} maxLength={PROFILE_LIMITS.name.max} />
          <LocalizedPair id="bio" label={t('bio')} help={t('bioHelp')} form={FORM_ID} locale={locale} showArabicHelp multiline values={profile?.bio ?? { en: '', ar: '' }} errors={{ en: err('bio_en'), ar: err('bio_ar') }} labels={labels} maxLength={PROFILE_LIMITS.bio} />
          <div className="px-4 py-2.5">
            <label htmlFor="photo" className="block text-[13px] font-medium text-mute">{t('photo')}</label>
            <input id="photo" type="file" name="photo" form={FORM_ID} accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help" className="mt-1 block min-h-11 w-full text-[15px] text-ink file:me-3 file:min-h-11 file:rounded-[var(--radius-row)] file:border-0 file:bg-tile file:px-4 file:text-[15px] file:text-ink" />
            <p id="photo-help" className="mt-1 text-[13px] text-mute">{profile?.photo ? t('photoSet') : t('photoHelp')}</p>
            {err('photo') ? <FieldError id="photo-error">{err('photo')}</FieldError> : null}
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="sec-about" data-testid="section-about">
        <h2 id="sec-about" className={sectionTitle}>{t('about')}</h2>
        <div className={block}>
          <fieldset className="py-1" data-testid="field-gender" aria-describedby="gender-help">
            <legend className="px-4 pt-2 pb-1 text-[13px] font-medium text-mute">{t('gender')}</legend>
            <CheckRow type="radio" name="gender" value="woman" label={t('female')} form={FORM_ID} defaultChecked={profile?.gender === 'woman'} testId="gender-woman" />
            <CheckRow type="radio" name="gender" value="man" label={t('male')} form={FORM_ID} defaultChecked={profile?.gender === 'man'} testId="gender-man" />
            <p id="gender-help" className="px-4 pb-2 text-[13px] text-mute">{t('genderHelp')}</p>
            {err('gender') ? <div className="px-4 pb-2"><FieldError id="gender-error">{err('gender')}</FieldError></div> : null}
          </fieldset>
          <div className="px-4 py-2.5">
            <label htmlFor="nationality" className="block text-[13px] font-medium text-mute">{t('nationality')}</label>
            <select id="nationality" name="nationality" form={FORM_ID} defaultValue={profile?.nationality ?? ''} aria-invalid={err('nationality') ? true : undefined} aria-describedby={err('nationality') ? 'nationality-error' : undefined} className="mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border border-hair bg-transparent px-3 text-[16px] text-ink">
              <option value="">{t('nationalityNone')}</option>
              {options.countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {err('nationality') ? <FieldError id="nationality-error">{err('nationality')}</FieldError> : null}
          </div>
          <div className="px-4 py-2.5">
            <label htmlFor="yearsExperience" className="block text-[13px] font-medium text-mute">{t('experience')}</label>
            <input id="yearsExperience" name="yearsExperience" type="number" inputMode="numeric" min={0} max={60} step={1} form={FORM_ID} defaultValue={profile?.yearsExperience ?? ''} aria-invalid={err('yearsExperience') ? true : undefined} aria-describedby={err('yearsExperience') ? 'yearsExperience-error' : 'yearsExperience-help'} className="mt-1 block min-h-11 w-32 rounded-[var(--radius-row)] border border-hair bg-transparent px-3 text-[16px] text-ink tabular-nums" />
            <p id="yearsExperience-help" className="mt-1 text-[13px] text-mute">{t('experienceHelp')}</p>
            {err('yearsExperience') ? <FieldError id="yearsExperience-error">{err('yearsExperience')}</FieldError> : null}
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="sec-places" data-testid="section-places">
        <h2 id="sec-places" className={sectionTitle}>{t('places')}</h2>
        <div className={block}>
          <fieldset className="py-1" data-testid="field-personas">
            <legend className="px-4 pt-2 pb-1 text-[13px] font-medium text-mute">{t('personas')}</legend>
            {options.personas.map((p) => (
              <CheckRow key={p.id} name="personas" value={String(p.id)} label={p.name} form={FORM_ID} defaultChecked={personaIds.includes(p.id)} testId={`persona-${p.id}`}
                onChange={(on) => setChosen((prev) => { const next = new Set(prev); if (on) next.add(String(p.id)); else next.delete(String(p.id)); return next })} />
            ))}
            {err('personas') ? <div className="px-4 pb-2"><FieldError id="personas-error">{err('personas')}</FieldError></div> : null}
          </fieldset>
          <fieldset className="py-1" data-testid="field-specialties">
            <legend className="px-4 pt-2 pb-1 text-[13px] font-medium text-mute">{t('specialties')}</legend>
            {options.specialties.map((s) => (
              <CheckRow key={s.id} name="specialties" value={String(s.id)} label={s.name} form={FORM_ID} defaultChecked={picked.has(s.id)} disabled={!visible(s.personaIds)} testId={`specialty-${s.id}`} />
            ))}
            {err('specialties') ? <div className="px-4 pb-2"><FieldError id="specialties-error">{err('specialties')}</FieldError></div> : null}
          </fieldset>
          <fieldset className="py-1" data-testid="field-cities">
            <legend className="px-4 pt-2 pb-1 text-[13px] font-medium text-mute">{t('cities')}</legend>
            {options.emirates.map((e) => (
              <div key={e.id}>
                <CheckRow name="cities" value={String(e.id)} label={e.name} form={FORM_ID} defaultChecked={profile?.cities.includes(e.id)} testId={`city-${e.id}`} />
                {e.cities.map((c) => (
                  <CheckRow key={c.id} name="cities" value={String(c.id)} label={c.name} form={FORM_ID} defaultChecked={profile?.cities.includes(c.id)} indent testId={`city-${c.id}`} />
                ))}
              </div>
            ))}
            {err('cities') ? <div className="px-4 pb-2"><FieldError id="cities-error">{err('cities')}</FieldError></div> : null}
          </fieldset>
          <fieldset className="py-1" data-testid="field-languages">
            <legend className="px-4 pt-2 pb-1 text-[13px] font-medium text-mute">{t('languages')}</legend>
            <div className="grid sm:grid-cols-2">
              {options.languages.map((l) => (
                <CheckRow key={l.code} name="languages" value={l.code} label={l.name} form={FORM_ID} defaultChecked={profile?.languages.includes(l.code)} testId={`language-${l.code}`} />
              ))}
            </div>
            {err('languages') ? <div className="px-4 pb-2"><FieldError id="languages-error">{err('languages')}</FieldError></div> : null}
          </fieldset>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="sec-links" data-testid="section-links">
        <h2 id="sec-links" className={sectionTitle}>{t('links')}</h2>
        <p className="mt-1 px-1 text-[15px] text-mute">{t('linksHelp')}</p>
        <div className={block}>
          {Array.from({ length: socialRows }, (_, i) => {
            const row = profile?.social[i]
            const error = err(`social.${i}.url`) ?? err(`social.${i}.platform`)
            return (
              <div key={i} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 px-4 py-2.5">
                <div>
                  <label htmlFor={`social-${i}-platform`} className="block text-[13px] text-mute">{t('platform')}</label>
                  <select id={`social-${i}-platform`} name={`social.${i}.platform`} form={FORM_ID} defaultValue={row?.platform ?? SOCIAL_PLATFORMS[i % SOCIAL_PLATFORMS.length]} className="mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border border-hair bg-transparent px-2 text-[16px] text-ink">
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p} value={p}>{tp(`social.${p}` as never)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`social-${i}-url`} className="block text-[13px] text-mute">{t('url')}</label>
                  <input id={`social-${i}-url`} type="url" inputMode="url" dir="ltr" name={`social.${i}.url`} form={FORM_ID} defaultValue={row?.url ?? ''} placeholder="https://" aria-invalid={error ? true : undefined} aria-describedby={error ? `social-${i}-error` : undefined} className={cx('mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border bg-transparent px-3 text-[16px] text-ink outline-none focus-visible:border-[var(--focus)]', error ? 'border-on-attention/50' : 'border-hair')} />
                </div>
                {error ? <div className="col-span-2"><FieldError id={`social-${i}-error`}>{error}</FieldError></div> : null}
              </div>
            )
          })}
        </div>
      </section>

      <FieldErrorsContext.Provider value={errors}>{samples}</FieldErrorsContext.Provider>

      <BriefBar size="sm" className="mt-12" data-testid="profile-actions">
        <p aria-live="polite" data-testid="profile-feedback" className={cx('px-4 pt-3 pb-1 text-[14px]', state.status === 'error' ? 'text-on-attention' : 'text-mute')}>
          {feedback}
        </p>
        <ResultGroup label={tp('topHit')} className="pb-2">
          <TopHit label={pending ? t('pending') : primary.label} pending={pending} form={FORM_ID} name="intent" value={primary.intent} testId="profile-save" />
          {primary.intent === 'send' ? (
            <button type="submit" form={FORM_ID} name="intent" value="save" disabled={pending} className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="profile-save-only">
              <RowContent glyph={<CheckIcon width={15} height={15} />} label={t('saveOnly')} />
            </button>
          ) : null}
        </ResultGroup>
      </BriefBar>
    </>
  )
}
