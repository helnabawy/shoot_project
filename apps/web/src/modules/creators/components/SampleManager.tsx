'use client'

import { MAX_SAMPLES } from '@shoot/domain/creators'
import { useTranslations } from 'next-intl'
import { useActionState, useContext, useEffect, useRef, useState } from 'react'
import { cx } from '@/shared/ui/bar'
import { FieldError } from '@/shared/ui/Field'
import { ChevronIcon, CloseIcon } from '@/shared/ui/icons'
import { addSample, moveSample, removeSample, type ProfileState } from '../actions'
import { errorMessageKey } from '../errors'
import type { MySample } from '../my-profile'
import { ActionForm, AnnounceContext, FieldErrorsContext } from './ActionForm'
import { LocalizedPair } from './LocalizedPair'
import { PhotoTile } from './PhotoTile'
import { STEP_NUMBER } from './ProfileSteps'
import { SectionHeading } from './SectionHeading'

const idle: ProfileState = { status: 'idle' }
const iconButton =
  'grid size-11 place-items-center rounded-[var(--radius-row)] text-ink transition-colors duration-100 hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:opacity-40'
const FORM_ID = 'profile-form'
const select = 'mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border border-hair bg-transparent px-2 text-[16px] text-ink'
const primaryButton =
  'inline-flex min-h-11 items-center rounded-[var(--radius-row)] bg-tile px-4 text-[15px] font-semibold text-ink transition-colors duration-100 hover:bg-ink/[0.08] focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:opacity-60'

type Specialty = { id: number; name: string }

function useErrors(state: ProfileState) {
  const te = useTranslations('creators.err')
  const errors = state.status === 'error' ? state.errors : {}
  return (field: string) => (errors[field] ? te(errorMessageKey(errors[field]) as never) : undefined)
}

function SpecialtySelect({ id, name, specialties, defaultValue, form }: { id: string; name: string; specialties: Specialty[]; defaultValue?: number | null; form?: string }) {
  const t = useTranslations('creators.samples')
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] text-mute">{t('category')}</label>
      <select id={id} name={name} form={form} defaultValue={defaultValue ? String(defaultValue) : ''} className={select}>
        <option value="">{t('noCategory')}</option>
        {specialties.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  )
}

function SampleRow({ sample, index, count, specialties, locale }: { sample: MySample; index: number; count: number; specialties: Specialty[]; locale: string }) {
  const t = useTranslations('creators.samples')
  const tf = useTranslations('creators.form')
  const te = useTranslations('creators.err')
  const errors = useContext(FieldErrorsContext)
  const err = (field: string) => (errors[`sample.${index}.${field}`] ? te(errorMessageKey(errors[`sample.${index}.${field}`]) as never) : undefined)
  const labels = { en: tf('english'), ar: tf('arabic'), arabicHelp: tf('arabicHelp') }
  const fields = { locale, index: String(index) }
  return (
    <li className="py-3" data-testid="sample-row" data-index={index}>
      <div className="flex items-center gap-3 px-4">
        <PhotoTile photo={sample.image ? { url: sample.image.url, alt: sample.image.alt } : null} initials={String(index + 1)} />
        <p className="min-w-0 flex-1 text-[16px] font-semibold text-ink">
          {t('sample', { n: index + 1 })}
          <span className="block text-[13px] font-normal text-mute">{sample.kind === 'video' ? t('video') : t('kindImage')}</span>
        </p>
        <ActionForm action={moveSample} fields={{ ...fields, direction: 'up' }} buttonClass={cx(iconButton, index === 0 && 'invisible')} label={t('up')} announce={t('moved', { n: index })} testId={`sample-up-${index}`}>
          <ChevronIcon width={18} height={18} className="-rotate-90 rtl:rotate-90" />
        </ActionForm>
        <ActionForm action={moveSample} fields={{ ...fields, direction: 'down' }} buttonClass={cx(iconButton, index === count - 1 && 'invisible')} label={t('down')} announce={t('moved', { n: index + 2 })} testId={`sample-down-${index}`}>
          <ChevronIcon width={18} height={18} className="rotate-90 rtl:-rotate-90" />
        </ActionForm>
        <ActionForm action={removeSample} fields={fields} buttonClass={iconButton} label={t('remove')} announce={t('removed')} testId={`sample-remove-${index}`}>
          <CloseIcon width={18} height={18} />
        </ActionForm>
      </div>
      {/* The captions and specialty belong to the profile form: the closing action saves them with everything else. */}
      <LocalizedPair id={`caption-${index}`} name={`sample.${index}.caption`} form={FORM_ID} label={t('caption')} locale={locale} values={sample.caption} errors={{ en: err('caption_en'), ar: err('caption_ar') }} labels={labels} maxLength={140} />
      <div className="px-4 pb-1">
        <SpecialtySelect id={`category-${index}`} name={`sample.${index}.category`} form={FORM_ID} specialties={specialties} defaultValue={sample.category} />
        {err('category') ? <FieldError id={`category-${index}-error`}>{err('category')}</FieldError> : null}
      </div>
    </li>
  )
}

function AddSample({ locale, specialties, disabled }: { locale: string; specialties: Specialty[]; disabled: boolean }) {
  const t = useTranslations('creators.samples')
  const tf = useTranslations('creators.form')
  const [state, add, pending] = useActionState(addSample, idle)
  const err = useErrors(state)
  const te = useTranslations('creators.err')
  // A failure that is not about one field (for instance no profile saved yet).
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state.status === 'error') formRef.current?.querySelector<HTMLElement>('[id$="-error"], [role="alert"]')?.scrollIntoView({ block: 'center' })
  }, [state])
  const generalError = state.status === 'error' && state.formError && !Object.keys(state.errors).length ? te(errorMessageKey(state.formError) as never) : null
  const labels = { en: tf('english'), ar: tf('arabic'), arabicHelp: tf('arabicHelp') }
  return (
    <form ref={formRef} action={add} className="group mt-4 -mx-3 border-y border-hair py-2" data-testid="sample-add" aria-labelledby="add-sample-title">
      <input type="hidden" name="locale" value={locale} />
      <h3 id="add-sample-title" className="px-4 pt-2 text-[17px] font-semibold text-ink">{t('add')}</h3>
      <fieldset className="px-4 py-2" disabled={disabled}>
        <legend className="sr-only">{t('add')}</legend>
        <div className="flex gap-4 text-[16px] text-ink">
          <label className="inline-flex min-h-11 items-center gap-2">
            <input type="radio" name="kind" value="image" defaultChecked /> {t('kindImage')}
          </label>
          <label className="inline-flex min-h-11 items-center gap-2">
            <input type="radio" name="kind" value="video" /> {t('kindVideo')}
          </label>
        </div>
        <div className="mt-1 group-has-[input[value=video]:checked]:hidden">
          <label htmlFor="sample-image" className="block text-[13px] text-mute">{t('image')}</label>
          <input id="sample-image" type="file" name="image" accept="image/jpeg,image/png,image/webp" className="mt-1 block min-h-11 w-full text-[15px] text-ink file:me-3 file:min-h-11 file:rounded-[var(--radius-row)] file:border-0 file:bg-tile file:px-4 file:text-[15px] file:text-ink" />
          {err('image') ? <FieldError id="sample-image-error">{err('image')}</FieldError> : null}
        </div>
        <div className="mt-2 hidden group-has-[input[value=video]:checked]:block">
          <label htmlFor="sample-video" className="block text-[13px] text-mute">{t('videoUrl')}</label>
          <input id="sample-video" type="url" inputMode="url" dir="ltr" name="videoUrl" placeholder="https://" className="mt-1 block min-h-11 w-full rounded-[var(--radius-row)] border border-hair bg-transparent px-3 text-[16px] text-ink" />
          {err('videoUrl') ? <FieldError id="sample-video-error">{err('videoUrl')}</FieldError> : null}
        </div>
        <div className="mt-2 hidden group-has-[input[value=video]:checked]:block">
          <label htmlFor="sample-poster" className="block text-[13px] text-mute">{t('poster')}</label>
          <input id="sample-poster" type="file" name="poster" accept="image/jpeg,image/png,image/webp" className="mt-1 block min-h-11 w-full text-[15px] text-ink file:me-3 file:min-h-11 file:rounded-[var(--radius-row)] file:border-0 file:bg-tile file:px-4 file:text-[15px] file:text-ink" />
          <p className="mt-1 text-[13px] text-mute">{t('posterHelp')}</p>
          {err('poster') ? <FieldError id="sample-poster-error">{err('poster')}</FieldError> : null}
        </div>
      </fieldset>
      <LocalizedPair id="add-caption" name="caption" label={t('caption')} locale={locale} values={{ en: '', ar: '' }} errors={{ en: err('caption_en'), ar: err('caption_ar') }} labels={labels} maxLength={140} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-4 pb-2">
        <SpecialtySelect id="add-category" name="category" specialties={specialties} />
        <button type="submit" disabled={pending || disabled} className={primaryButton} data-testid="sample-add-submit">{t('add')}</button>
      </div>
      {err('category') ? <div className="px-4"><FieldError id="add-category-error">{err('category')}</FieldError></div> : null}
      {err('sample') ? <div className="px-4"><FieldError id="add-sample-error">{err('sample')}</FieldError></div> : null}
      {generalError ? <p role="alert" className="mx-4 mb-2 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">{generalError}</p> : null}
    </form>
  )
}

/**
 * The portfolio: each sample a row with its captions in both languages, its specialty and its
 * order, then "Add a sample". Samples are saved as they are added; an upload note and the limits
 * are said plainly where they matter (surface brief provider-profile).
 */
export function SampleManager({ locale, samples, specialties, hasProfile }: { locale: string; samples: MySample[]; specialties: Specialty[]; hasProfile: boolean }) {
  const t = useTranslations('creators.samples')
  const tf = useTranslations('creators.form')
  const full = samples.length >= MAX_SAMPLES
  const [announcement, setAnnouncement] = useState('')
  return (
    <AnnounceContext.Provider value={setAnnouncement}>
    <section className="mt-12" aria-labelledby="sec-samples" data-testid="section-samples">
      <p role="status" aria-live="polite" className="sr-only" data-testid="sample-announce">{announcement}</p>
      <SectionHeading id="sec-samples" step={STEP_NUMBER.samples}>{t('title')}</SectionHeading>
      <p className="mt-1 px-1 text-[15px] text-mute">{tf('sampleOrderHint')}</p>
      <p className="mt-1 px-1 text-[13px] text-mute tabular-nums" data-testid="sample-count">{t('count', { count: samples.length, max: MAX_SAMPLES })}</p>
      {samples.length ? (
        <ul className="-mx-3 mt-3 divide-y divide-hair border-y border-hair">
          {samples.map((sample, i) => (
            <SampleRow key={sample.id} sample={sample} index={i} count={samples.length} specialties={specialties} locale={locale} />
          ))}
        </ul>
      ) : (
        <p className="-mx-3 mt-3 border-y border-hair px-4 py-3 text-[15px] text-mute" data-testid="sample-empty">{t('empty')}</p>
      )}
      {full ? <p className="mt-3 px-1 text-[15px] text-ink" data-testid="sample-full">{t('full', { max: MAX_SAMPLES })}</p> : null}
      <AddSample locale={locale} specialties={specialties} disabled={full || !hasProfile} />
      <p className="mt-2 px-1 text-[13px] text-mute">{t('uploadNote')} {t('limits')}</p>
    </section>
    </AnnounceContext.Provider>
  )
}
