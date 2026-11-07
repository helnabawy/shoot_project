import { useTranslations } from 'next-intl'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, GlyphTile, RowContent, rowClass, TopHit } from '@/shared/ui/bar'
import { CheckIcon, CloseIcon } from '@/shared/ui/icons'
import { markDelivered, respondToAssignment } from '../actions'

export interface CreatorBookingView {
  bookingId: number
  personaId: string
  reference: string
  state: string
  /** "Pending" when this creator's answer is awaited. */
  awaitingAnswer: boolean
  date: string
  /** "Wed 18 Nov" in the page language. */
  dateLabel: string
  place: string
  sentence: string
  price: string
  clientFirstName: string
  respondBy: string | null
}

/**
 * A booking request as the creator sees it (surface brief account-bookings): date, place, brief, price and the
 * client's first name, never their phone. Pending: Confirm is the one action, Decline secondary.
 */
export function CreatorBookingRow({ view, locale, primary = true }: { view: CreatorBookingView; locale: string; primary?: boolean }) {
  const t = useTranslations('booking')
  const hidden = (
    <>
      <input type="hidden" name="booking" value={view.bookingId} />
      <input type="hidden" name="persona" value={view.personaId} />
      <input type="hidden" name="locale" value={locale} />
    </>
  )
  return (
    <div className="border-b border-hair pb-2 last:border-b-0" data-testid="creator-booking" data-reference={view.reference}>
      <div className={rowClass('open', false)}>
        <RowContent
          glyph={<span className="tabular-nums">{view.date.slice(8, 10)}</span>}
          label={
            <>
              <span className="block font-semibold text-ink">
                {view.dateLabel} · {view.place}
              </span>
              <span dir="auto" className="block text-[13px] text-mute">
                {view.sentence}
              </span>
              <span className="block text-[13px] text-mute">
                {t('client', { name: view.clientFirstName })} · <Bidi>{view.price}</Bidi>
              </span>
              {view.awaitingAnswer && view.respondBy ? <span className="block text-[13px] font-medium text-ink">{t('respondBy', { time: view.respondBy })}</span> : null}
            </>
          }
          trailing={view.awaitingAnswer ? null : t(`state.${view.state}` as never)}
        />
      </div>
      {view.awaitingAnswer ? (
        <>
          <form action={respondToAssignment}>
            {hidden}
            <input type="hidden" name="decision" value="confirm" />
            {/* One blue row per panel: only the first request waiting for an answer gets the Top Hit. */}
            {primary ? (
              <TopHit label={t('confirm')} testId="creator-confirm" />
            ) : (
              <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="creator-confirm">
                <RowContent glyph={<CheckIcon width={15} height={15} />} label={t('confirm')} />
              </button>
            )}
          </form>
          <details className="px-4 pt-1">
            <summary className="min-h-11 cursor-pointer content-center text-[15px] text-ink">{t('decline')}</summary>
            <form action={respondToAssignment} className="grid gap-2 pb-2">
              {hidden}
              <input type="hidden" name="decision" value="decline" />
              <label htmlFor={`reason-${view.bookingId}-${view.personaId}`} className="text-[13px] font-medium text-mute">
                {t('declineReason')}
              </label>
              <input id={`reason-${view.bookingId}-${view.personaId}`} name="reason" maxLength={200} className="min-h-11 rounded-[var(--radius-row)] border border-hair bg-transparent px-3 text-[16px] text-ink" />
              <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="creator-decline">
                <span className="contents">
                  <GlyphTile><CloseIcon width={15} height={15} /></GlyphTile>
                  <span>{t('decline')}</span>
                  <span />
                </span>
              </button>
            </form>
          </details>
        </>
      ) : null}
      {view.state === 'scheduled' ? (
        <form action={markDelivered}>
          {hidden}
          {primary ? (
            <TopHit label={t('markDelivered')} testId="creator-delivered" />
          ) : (
            <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')} data-testid="creator-delivered">
              <RowContent glyph={<CheckIcon width={15} height={15} />} label={t('markDelivered')} />
            </button>
          )}
        </form>
      ) : null}
    </div>
  )
}
