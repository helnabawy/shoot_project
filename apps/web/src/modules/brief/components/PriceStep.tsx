'use client'

import { useEffect, useState } from 'react'
import { previewPrices, type PricePreview } from '@/modules/booking/preview-action'
import { Bidi } from '@/shared/ui/Bidi'
import { cx } from '@/shared/ui/bar'

export interface PriceStepLabels {
  /** "Your price for the {type}". */
  label: string
  /** "Usual price {price}. You can offer {min} to {max}." */
  range: string
  /** "Any price from {min}." (no usual price). */
  rangeOpen: string
  /** "If a {type} accepts your price: {total}" with the fee; "{percent}" in the hint. */
  total: string
  totalHint: string
  lower: string
  raise: string
  loading: string
  currency: string
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''))
const aed = (fils: number, locale: string) => new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', { maximumFractionDigits: 0, numberingSystem: 'latn' }).format(fils / 100)
const STEP = 50

/**
 * 022 (US1, board 44): the client's price per professional type, the last step of the brief bar. Pre-filled with
 * the usual price, limited to the range, posted as `budget.<slug>` in whole AED. The server checks it again.
 */
export function PriceStep({
  locale,
  answers,
  labels,
  feePercent,
  errors,
}: {
  locale: string
  answers: { values: Record<string, string>; custom: Record<string, boolean> } | null
  labels: PriceStepLabels
  feePercent: number
  /** Field errors from the last send, keyed `budget.<slug>`, already in words. */
  errors: Record<string, string>
}) {
  const key = answers ? JSON.stringify(answers) : ''
  const [state, setState] = useState<{ key: string; preview: PricePreview | null } | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!answers) return
    let live = true
    previewPrices({ locale, ...answers })
      .then((preview) => {
        if (!live) return
        setState({ key, preview })
        setAmounts((current) => {
          const next = { ...current }
          for (const p of preview?.prices ?? []) if (next[p.persona] === undefined && p.suggestedFils) next[p.persona] = String(p.suggestedFils / 100)
          return next
        })
      })
      .catch(() => live && setState({ key, preview: null }))
    return () => {
      live = false
    }
    // `key` stands for the answers' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale])

  if (!answers) return null
  if (!state || state.key !== key) {
    return (
      <p role="status" className="px-4 pb-2 text-[13px] text-mute" data-testid="price-step-loading">
        {labels.loading}
      </p>
    )
  }
  if (!state.preview?.prices.length) return null

  return (
    <div data-testid="price-step" className="flex flex-col gap-4 px-3 pb-3">
      {state.preview.prices.map((p) => {
        const id = `budget-${p.persona}`
        const raw = amounts[p.persona] ?? ''
        const value = Number(raw.replace(/[^\d]/g, ''))
        const clamp = (n: number) => Math.max(p.minFils / 100, p.maxFils ? Math.min(p.maxFils / 100, n) : n)
        const set = (n: number) => setAmounts((a) => ({ ...a, [p.persona]: String(clamp(n)) }))
        const error = errors[`budget.${p.persona}`]
        const total = value > 0 ? Math.round(value + (value * feePercent) / 100) : null
        const hint = p.suggestedFils
          ? fill(labels.range, { price: aed(p.suggestedFils, locale), min: aed(p.minFils, locale), max: aed(p.maxFils ?? p.minFils, locale) })
          : fill(labels.rangeOpen, { min: aed(p.minFils, locale) })
        return (
          <div key={p.persona} className="flex flex-col gap-2">
            <label htmlFor={id} className="group-label block px-1">
              {fill(labels.label, { type: p.label })}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={labels.lower} onClick={() => set((value || p.minFils / 100) - STEP)} className="inline-flex h-14 w-12 shrink-0 items-center justify-center rounded-[9px] border border-control-border text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
              </button>
              <div className={cx('flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-[9px] border bg-panel-solid px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus', error ? 'border-danger' : 'border-control-border')}>
                <span className="text-[15px] font-medium text-mute">{labels.currency}</span>
                <input
                  id={id}
                  name={`budget.${p.persona}`}
                  inputMode="numeric"
                  autoComplete="off"
                  value={raw}
                  onChange={(e) => setAmounts((a) => ({ ...a, [p.persona]: e.target.value.replace(/[^\d]/g, '').slice(0, 7) }))}
                  aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                  aria-invalid={error ? true : undefined}
                  className="w-28 bg-transparent text-[30px] font-bold tracking-[-0.03em] tabular-nums text-ink outline-none"
                  dir="ltr"
                />
              </div>
              <button type="button" aria-label={labels.raise} onClick={() => set((value || p.minFils / 100) + STEP)} className="inline-flex h-14 w-12 shrink-0 items-center justify-center rounded-[9px] border border-control-border text-ink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <p id={`${id}-hint`} className="px-1 text-[13px] text-mute tabular-nums">
              <Bidi>{hint}</Bidi>
            </p>
            {error ? (
              <p id={`${id}-error`} role="alert" className="rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">
                {error}
              </p>
            ) : null}
            {total ? (
              <p className="flex items-baseline justify-between gap-2 border-t border-hair px-1 pt-2.5 text-[15px]" data-testid={`price-total-${p.persona}`}>
                <span>
                  {fill(labels.total, { type: p.label.toLowerCase() })}
                  <span className="block text-[13px] text-mute">{fill(labels.totalHint, { percent: feePercent })}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  <Bidi>{`${labels.currency} ${aed(total * 100, locale)}`}</Bidi>
                </span>
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
