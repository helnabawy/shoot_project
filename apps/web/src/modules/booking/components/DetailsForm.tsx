'use client'

import { useActionState, useId } from 'react'
import { Bidi } from '@/shared/ui/Bidi'
import { BriefBar, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { Field, FieldError } from '@/shared/ui/Field'
import { CheckIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { requestQuotation, type QuoteState } from '../actions'

export interface DetailsLabels {
  title: string
  step: string
  summary: string
  name: string
  whatsapp: string
  whatsappHint: string
  date: string
  dateHint: string
  extras: string
  codeToggle: string
  code: string
  submit: string
  change: string
  total: string
}

export interface DetailsFormProps {
  labels: DetailsLabels
  /** The secondary action on every step (Principle IX). */
  whatsapp: { href: string; label: string; actions: string }
  /** A nearby date picked in step 2: sent with the form. */
  presetDate?: string
  briefRef: string
  briefKey: string
  pick: string
  locale: string
  /** The brief said "any date": ask for it here (US1-S3). */
  needsDate: boolean
  minDate: string
  defaults: { name?: string; whatsapp?: string }
  /** Set rows above the fields: the brief and the chosen creator per type. */
  summary: { label: string; trailing?: string }[]
  changeHref: string
  addOns: { id: string; title: string; price: string }[]
  total: string
  /** Message key → text for errors the server returns (from booking.errors.* / contact.errors.*). */
  errorText: Record<string, string>
}

/** Step 3 "Your details": name, WhatsApp, the date only when missing, extras, a code; one Top Hit (US2). */
export function DetailsForm(props: DetailsFormProps) {
  const l = props.labels
  const id = useId()
  const [state, action, pending] = useActionState<QuoteState, FormData>(requestQuotation, { status: 'idle' })
  const errors = state.status === 'error' ? state.errors : {}
  const message = (key?: string) => (key ? (props.errorText[key] ?? props.errorText['booking.errors.generic']) : undefined)
  const formError = state.status === 'error' ? message(state.formError) : undefined

  return (
    <BriefBar as="form" action={action} noValidate aria-labelledby="details-heading" data-floating-hide>
      <input type="hidden" name="ref" value={props.briefRef} />
      <input type="hidden" name="key" value={props.briefKey} />
      <input type="hidden" name="pick" value={props.pick} />
      <input type="hidden" name="locale" value={props.locale} />
      {props.presetDate ? <input type="hidden" name="date" value={props.presetDate} /> : null}

      <ResultGroup label={l.summary}>
        {props.summary.map((row, i) => (
          <div key={i} className={rowClass('set', false)}>
            <RowContent state="set" glyph={<CheckIcon width={15} height={15} />} label={row.label} trailing={i === props.summary.length - 1 ? <a href={props.changeHref}>{l.change}</a> : row.trailing} />
          </div>
        ))}
      </ResultGroup>

      {formError ? (
        <div role="alert" className="px-4 pt-1">
          <FieldError id={`${id}-form`}>{formError}</FieldError>
        </div>
      ) : null}

      <Field id={`${id}-name`} name="name" label={l.name} autoComplete="name" required minLength={2} maxLength={80} defaultValue={props.defaults.name} error={message(errors.name)} />
      <Field
        id={`${id}-whatsapp`}
        name="whatsapp"
        type="tel"
        dir="ltr"
        inputMode="tel"
        autoComplete="tel"
        required
        label={l.whatsapp}
        hint={l.whatsappHint}
        defaultValue={props.defaults.whatsapp}
        error={message(errors.whatsapp)}
      />
      {props.needsDate ? (
        <Field id={`${id}-date`} name="date" type="date" required min={props.minDate} label={l.date} hint={l.dateHint} error={message(errors.date)} />
      ) : null}

      {props.addOns.length ? (
        <ResultGroup as="fieldset" label={l.extras}>
          {props.addOns.map((a) => (
            <label key={a.id} className={rowClass('open')}>
              <input type="checkbox" name="addOn" value={a.id} className="size-5 accent-[var(--accent)]" />
              <span>{a.title}</span>
              <span className="text-[13px] text-mute">
                <Bidi>+{a.price}</Bidi>
              </span>
            </label>
          ))}
        </ResultGroup>
      ) : null}

      <details className="px-4 py-2">
        <summary className="min-h-11 cursor-pointer content-center text-[15px] text-ink">{l.codeToggle}</summary>
        <Field id={`${id}-promo`} name="promo" label={l.code} autoComplete="off" maxLength={20} className="px-0" error={message(errors.promo)} />
      </details>

      <p className="px-4 pb-2 text-[13px] text-mute">
        <Bidi>{l.total.replace('{price}', props.total)}</Bidi>
      </p>
      <TopHit label={l.submit} pending={pending} testId="details-submit" className="mb-2" />
      <ResultGroup label={props.whatsapp.actions} className="border-t border-hair pt-1">
        <a href={props.whatsapp.href} target="_blank" rel="noopener noreferrer" className={rowClass('open')}>
          <RowContent glyph={<WhatsAppIcon width={15} height={15} />} label={props.whatsapp.label} />
        </a>
      </ResultGroup>
    </BriefBar>
  )
}
