import type { BriefItemV1 } from '@shoot/domain/api/v1'
import { useTranslations } from 'next-intl'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, GlyphTile, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CalendarIcon, CheckIcon, CloseIcon } from '@/shared/ui/icons'
import { answerBriefAction } from '../actions'

export interface BriefCardView extends BriefItemV1 {
  /** "Fri 20 Nov" in the page language, or empty for "date to agree". */
  dateLabel: string
  sentLabel: string
}

/** Hidden fields every inbox form carries. */
export function BriefFields({ item, locale }: { item: Pick<BriefItemV1, 'ref' | 'persona'>; locale: string }) {
  return (
    <>
      <input type="hidden" name="ref" value={item.ref} />
      <input type="hidden" name="persona" value={item.persona} />
      <input type="hidden" name="locale" value={locale} />
    </>
  )
}

/**
 * One open brief as a creator sees it (US1-S3): when, where, what, and when it was sent; never who the client
 * is. "I can do this" is the panel's one red row only on the first card; "Not for me" opens an optional reason.
 */
export function BriefCard({ item, locale, primary, reasons }: { item: BriefCardView; locale: string; primary: boolean; reasons: { value: string; label: string }[] }) {
  const t = useTranslations('inbox')
  const key = `${item.ref}-${item.persona}`
  return (
    <div className="border-b border-hair pb-2 last:border-b-0" data-testid="inbox-brief" data-ref={item.ref}>
      <div className={rowClass('open', false)}>
        <RowContent
          glyph={item.date ? <span className="tabular-nums">{item.date.slice(8, 10)}</span> : <CalendarIcon width={15} height={15} />}
          label={
            <>
              <span className="block font-semibold text-ink">{[item.dateLabel || t('anyDate'), item.emirate].filter(Boolean).join(' · ')}</span>
              <span dir="auto" className="block text-[13px] text-mute">
                {[item.profession, item.occasion].filter(Boolean).join(' · ')}
              </span>
              <span className="block text-[13px] text-mute">
                {t('sent', { date: item.sentLabel })} · <Bidi>{item.ref}</Bidi>
              </span>
            </>
          }
        />
      </div>
      <form action={answerBriefAction}>
        <BriefFields item={item} locale={locale} />
        <input type="hidden" name="decision" value="accept" />
        {primary ? (
          <TopHit label={t('accept')} testId="inbox-accept" />
        ) : (
          <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="inbox-accept">
            <RowContent glyph={<CheckIcon width={15} height={15} />} label={t('accept')} />
          </button>
        )}
      </form>
      <details className="px-4 pt-1">
        <summary className="min-h-11 cursor-pointer content-center text-[15px] text-ink">{t('reject')}</summary>
        <form action={answerBriefAction} className="grid gap-3 pb-2" data-testid="inbox-reject-form">
          <BriefFields item={item} locale={locale} />
          <input type="hidden" name="decision" value="reject" />
          <p className="text-[13px] text-mute">{t('rejectHelp')}</p>
          {reasons.length ? (
            <fieldset className="grid gap-1">
              <legend className="pb-1 text-[13px] font-medium text-mute">{t('reasonLabel')}</legend>
              {reasons.map((r) => (
                <label key={r.value} className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
                  <input type="radio" name="reason" value={r.value} className="size-4 accent-[var(--color-selected)]" />
                  {r.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          <label htmlFor={`note-${key}`} className="text-[13px] font-medium text-mute">
            {t('noteLabel')}
          </label>
          <textarea id={`note-${key}`} name="note" maxLength={300} rows={2} className="rounded-[var(--radius-row)] border border-hair bg-transparent px-3 py-2 text-[16px] text-ink" />
          <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="inbox-reject">
            <span className="contents">
              <GlyphTile>
                <CloseIcon width={15} height={15} />
              </GlyphTile>
              <span>{t('reject')}</span>
              <span />
            </span>
          </button>
        </form>
      </details>
    </div>
  )
}
