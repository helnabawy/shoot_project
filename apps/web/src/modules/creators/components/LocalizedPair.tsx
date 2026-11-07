import type { ReactNode } from 'react'
import { cx } from '@/shared/ui/bar'
import { FieldError } from '@/shared/ui/Field'

const control =
  'mt-1 block w-full rounded-[var(--radius-row)] border bg-transparent px-3 text-[16px] text-ink outline-none transition-colors placeholder:text-mute focus-visible:border-[var(--focus)]'

/**
 * One localised text field as an English and an Arabic input side by side from 640 px, the page's
 * language first. Each carries its own `lang` and `dir`, whatever the page direction.
 */
export function LocalizedPair({
  id,
  name,
  label,
  form,
  locale,
  multiline,
  values,
  errors,
  labels,
  help,
  showArabicHelp,
  maxLength,
}: {
  id: string
  /** The form field name prefix (`caption` gives `caption_en`, `caption_ar`); defaults to the id. */
  name?: string
  label: string
  /** The id of the form the inputs belong to, when the form element is elsewhere on the page. */
  form?: string
  locale: string
  multiline?: boolean
  values: { en: string; ar: string }
  errors?: { en?: string; ar?: string }
  labels: { en: string; ar: string; arabicHelp: string }
  help?: ReactNode
  /** Say once, under the legend, that Arabic is optional (the profile's own fields; sample rows rely on the section). */
  showArabicHelp?: boolean
  maxLength?: number
}) {
  const order = locale === 'ar' ? (['ar', 'en'] as const) : (['en', 'ar'] as const)
  return (
    <fieldset className="px-4 py-2.5">
      <legend className="text-[13px] font-medium text-mute">{label}</legend>
      {help ? <p className="mt-0.5 text-[13px] text-mute">{help}</p> : null}
      {showArabicHelp ? <p id={`${id}-ar-help`} className="mt-0.5 text-[13px] text-mute">{labels.arabicHelp}</p> : null}
      <div className="mt-1 grid gap-3 sm:grid-cols-2">
        {order.map((code) => {
          const fieldId = `${id}-${code}`
          const error = errors?.[code]
          const common = {
            id: fieldId,
            name: `${name ?? id}_${code}`,
            form,
            lang: code,
            dir: code === 'ar' ? 'rtl' : 'ltr',
            defaultValue: values[code],
            maxLength,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': [error ? `${fieldId}-error` : null, code === 'ar' && showArabicHelp ? `${id}-ar-help` : null].filter(Boolean).join(' ') || undefined,
            className: cx(control, error ? 'border-on-attention/50' : 'border-hair', multiline ? 'min-h-24 py-2 leading-relaxed' : 'min-h-11'),
          }
          return (
            <div key={code}>
              <label htmlFor={fieldId} className="block text-[13px] text-mute">
                <span lang={code}>{labels[code]}</span>
              </label>
              {multiline ? <textarea rows={4} {...common} /> : <input type="text" {...common} />}
              {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
