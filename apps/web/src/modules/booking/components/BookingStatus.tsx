import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { useTranslations } from 'next-intl'
import { cx, ResultGroup, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { payOnline } from '@/modules/payments/actions'
import { AlertIcon, CloseIcon, LockIcon, WhatsAppIcon } from '@/shared/ui/icons'
import { acceptQuotation, cancelByClient, confirmDelivery, pickAnotherCreator, reportProblem, requestFreshQuotation } from '../actions'
import { CreatorPickRow } from './CreatorPickRow'
import { HistoryTimeline } from './HistoryTimeline'
import { PaymentPending } from './PaymentPending'
import { StatusTag } from './StatusTag'
import type { PickRowView } from './types'

export interface BookingStatusProps {
  state: string
  /** Hidden fields every client action needs. */
  access: { ref: string; key: string; locale: string }
  /** Filled-in status sentence for the state. */
  sentence: string
  canAccept: boolean
  canCancel: boolean
  /** `online`: Pay through the provider (feature 020); else the receipt flow with the CMS instructions. */
  payment: { online?: boolean; total?: string; instructions?: SerializedEditorState | null; receiptHref: string } | null
  /** Types whose creator declined or did not answer, with free alternatives at the same price. */
  replacements: { personaId: string; type: string; sentence: string; creators: PickRowView[] }[]
  history: { label: string; at: string }[]
  /** Back from the payment page (feature 020): `done` paid there, `cancelled` left it. */
  paymentReturn?: 'done' | 'cancelled' | null
  /** 021 amendment: nobody is signed in, so Accept goes through sign-in first (BS-US7-S1). */
  guest?: boolean
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
export function BookingStatus({ state, access, sentence, canAccept, payment, replacements, history, paymentReturn, guest = false, offersHref }: BookingStatusProps & { offersHref?: string }) {
  const t = useTranslations('quote')
  const waitingForPayment = Boolean(payment?.online) && paymentReturn === 'done'
  return (
    <div data-testid="booking-status" data-state={state}>
      {/* The state as a tag, then what it means (the owner, 2026-11-18). */}
      <div className="px-4 pt-2.5 pb-1">
        <StatusTag state={state} label={t(`state.${state}` as never)} />
      </div>
      {waitingForPayment ? (
        // Paid on the provider's page; "paid" shows as soon as its notice is recorded (FR-011).
        <PaymentPending pending={t('paymentPending')} late={t('paymentLate')} />
      ) : (
        <p className="px-4 pt-1 pb-2 text-[15px] text-ink" role="status" dir="auto">
          {sentence}
        </p>
      )}

      {canAccept ? (
        <form action={acceptQuotation} className="pb-2">
          <Hidden access={access} />
          <TopHit label={t('accept')} testId="quote-accept" />
          {guest ? (
            <p data-testid="quote-sign-in-next" className="px-4 pt-1 text-[13px] text-mute">
              {t('signInNext')}
            </p>
          ) : null}
        </form>
      ) : null}

      {state === 'expired' ? (
        <form action={requestFreshQuotation} className="pb-2">
          <Hidden access={access} />
          <TopHit label={t('fresh')} testId="quote-fresh" />
        </form>
      ) : null}

      {payment?.online ? (
        waitingForPayment ? null : (
          <ResultGroup label={t('payOnlineGroup')}>
            {paymentReturn === 'cancelled' ? (
              <p role="status" className="px-4 pb-2 text-[15px] text-ink">
                {t('paymentCancelled')}
              </p>
            ) : null}
            <form action={payOnline} className="pb-1">
              <Hidden access={access} />
              <TopHit label={t('pay', { total: payment.total ?? '' })} glyph={<LockIcon width={16} height={16} />} testId="quote-pay" />
            </form>
            <p className="px-4 pb-2 text-[13px] text-mute">{t('paySecure')}</p>
          </ResultGroup>
        )
      ) : payment ? (
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

      {offersHref && replacements.length ? (
        <div className="px-3 pb-2">
          <a href={offersHref} className={cx(rowClass('open'), 'w-[calc(100%-12px)] justify-center border border-control-border font-semibold')} data-testid="quote-choose-offer">
            {t('chooseAnotherOffer')}
          </a>
        </div>
      ) : null}
      {(offersHref ? [] : replacements).map((r) => (
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
          <HistoryTimeline events={history} />
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
