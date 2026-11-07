import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { useTranslations } from 'next-intl'
import { cx, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { AlertIcon, CloseIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { acceptQuotation, cancelByClient, confirmDelivery, pickAnotherCreator, reportProblem, requestFreshQuotation } from '../actions'
import { CreatorPickRow } from './CreatorPickRow'
import type { PickRowView } from './types'

export interface BookingStatusProps {
  state: string
  /** Hidden fields every client action needs. */
  access: { ref: string; key: string; locale: string }
  /** Filled-in status sentence for the state. */
  sentence: string
  canAccept: boolean
  canCancel: boolean
  payment: { instructions?: SerializedEditorState | null; receiptHref: string } | null
  /** Types whose creator declined or did not answer, with free alternatives at the same price. */
  replacements: { personaId: string; type: string; sentence: string; creators: PickRowView[] }[]
  history: { label: string; at: string }[]
}

function Hidden({ access }: { access: BookingStatusProps['access'] }) {
  return (
    <>
      <input type="hidden" name="ref" value={access.ref} />
      <input type="hidden" name="key" value={access.key} />
      <input type="hidden" name="locale" value={access.locale} />
    </>
  )
}

/** The one action per state (surface brief quotation): accept, pay and send the receipt, confirm delivery… */
export function BookingStatus({ state, access, sentence, canAccept, payment, replacements, history }: BookingStatusProps) {
  const t = useTranslations('quote')
  return (
    <div data-testid="booking-status" data-state={state}>
      <ResultGroup label={t(`state.${state}` as never)}>
        <p className="px-4 pb-2 text-[15px] text-ink" role="status" dir="auto">
          {sentence}
        </p>
      </ResultGroup>

      {canAccept ? (
        <form action={acceptQuotation} className="pb-2">
          <Hidden access={access} />
          <TopHit label={t('accept')} testId="quote-accept" />
        </form>
      ) : null}

      {state === 'expired' ? (
        <form action={requestFreshQuotation} className="pb-2">
          <Hidden access={access} />
          <TopHit label={t('fresh')} testId="quote-fresh" />
        </form>
      ) : null}

      {payment ? (
        <ResultGroup label={t('payment')}>
          {payment.instructions ? (
            <div className="px-4 pb-2 text-[15px] text-ink">
              <RichText data={payment.instructions} />
            </div>
          ) : null}
          <TopHit href={payment.receiptHref} external label={t('sendReceipt')} glyph={<WhatsAppIcon width={16} height={16} />} testId="quote-receipt" className="mb-2" />
        </ResultGroup>
      ) : null}

      {state === 'delivered' ? (
        <>
          <form action={confirmDelivery} className="pb-1">
            <Hidden access={access} />
            <TopHit label={t('confirmDelivery')} testId="quote-confirm-delivery" />
          </form>
          <details className="px-4 pb-2">
            <summary className="min-h-11 cursor-pointer content-center text-[15px] text-ink">{t('reportProblem')}</summary>
            <form action={reportProblem} className="grid gap-2 pb-2">
              <Hidden access={access} />
              <label htmlFor="report-reason" className="text-[13px] font-medium text-mute">
                {t('reportLabel')}
              </label>
              <textarea id="report-reason" name="reason" required minLength={5} maxLength={500} rows={3} className="rounded-[var(--radius-row)] border border-hair bg-transparent p-2 text-[16px] text-ink" />
              <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')}>
                <RowContent glyph={<AlertIcon width={15} height={15} />} label={t('reportSubmit')} />
              </button>
            </form>
          </details>
        </>
      ) : null}

      {replacements.map((r) => (
        <ResultGroup key={r.personaId} label={t('pickAnother', { type: r.type })}>
          <p className="px-4 pb-1 text-[13px] text-mute">{r.sentence}</p>
          {r.creators.map((row) => (
            <form key={row.id} action={pickAnotherCreator}>
              <Hidden access={access} />
              <input type="hidden" name="persona" value={r.personaId} />
              <input type="hidden" name="code" value={row.code} />
              <CreatorPickRow row={row} chosenLabel="" submit />
            </form>
          ))}
        </ResultGroup>
      ))}


      {history.length ? (
        <ResultGroup label={t('history')}>
          <ol className="px-4 pb-2 text-[13px] text-mute">
            {history.map((h) => (
              <li key={h.label} className="flex justify-between gap-3 py-0.5 tabular-nums">
                <span>{h.label}</span>
                <span>{h.at}</span>
              </li>
            ))}
          </ol>
        </ResultGroup>
      ) : null}
    </div>
  )
}

/** Cancelling is possible but never prominent: a plain row at the end of the document, with the other actions. */
export function CancelBooking({ access, label }: { access: BookingStatusProps['access']; label: string }) {
  return (
    <form action={cancelByClient}>
      <Hidden access={access} />
      <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="quote-cancel">
        <RowContent glyph={<CloseIcon width={15} height={15} />} label={label} />
      </button>
    </form>
  )
}
