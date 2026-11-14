import { useTranslations } from 'next-intl'
import { Bidi } from '@/shared/ui/Bidi'
import { ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { CalendarIcon, MinusIcon } from '@/shared/ui/icons'
import { withdrawBriefAction } from '../actions'
import { BriefCard, BriefFields, type BriefCardView } from './BriefCard'

export interface InboxListView {
  open: BriefCardView[]
  accepted: BriefCardView[]
  rejected: BriefCardView[]
  reasons: { value: string; label: string }[]
}

/** Waiting briefs, then the ones the creator said yes to, then "Not for you" with Undo (US1–US3). */
export function InboxList({ inbox, locale }: { inbox: InboxListView; locale: string }) {
  const t = useTranslations('inbox')
  const reasonLabel = (value: string | null) => inbox.reasons.find((r) => r.value === value)?.label ?? ''
  const where = (i: BriefCardView) => [i.dateLabel || t('anyDate'), i.emirate].filter(Boolean).join(' · ')
  return (
    <>
      <ResultGroup label={t('waiting')}>
        {inbox.open.length ? (
          inbox.open.map((item, i) => <BriefCard key={`${item.ref}-${item.persona}`} item={item} locale={locale} primary={i === 0} reasons={inbox.reasons} />)
        ) : (
          <div className={rowClass('open', false)} data-testid="inbox-empty">
            <RowContent glyph={<MinusIcon width={15} height={15} />} label={t('empty')} />
          </div>
        )}
      </ResultGroup>
      {inbox.accepted.length ? (
        <ResultGroup label={t('saidYes')}>
          {inbox.accepted.map((item) => (
            <div key={`${item.ref}-${item.persona}`} className="border-b border-hair last:border-b-0" data-testid="inbox-accepted" data-ref={item.ref}>
              <div className={rowClass('open', false)}>
                <RowContent
                  glyph={<CalendarIcon width={15} height={15} />}
                  label={
                    <>
                      <span className="block text-ink">{where(item)}</span>
                      <span dir="auto" className="block text-[13px] text-mute">
                        {item.occasion} · <Bidi>{item.ref}</Bidi>
                      </span>
                    </>
                  }
                  trailing={t(`outcome.${item.outcome}`)}
                />
              </div>
              {item.outcome === 'open' ? (
                <form action={withdrawBriefAction} className="px-4 pb-2">
                  <BriefFields item={item} locale={locale} />
                  <button type="submit" className="min-h-11 text-[15px] text-link underline-offset-4 hover:underline" data-testid="inbox-withdraw">
                    {t('withdraw')}
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </ResultGroup>
      ) : null}
      {inbox.rejected.length ? (
        <ResultGroup label={t('notForYou')}>
          {inbox.rejected.map((item) => (
            <div key={`${item.ref}-${item.persona}`} className="flex items-center justify-between border-b border-hair last:border-b-0" data-testid="inbox-rejected" data-ref={item.ref}>
              <div className={rowClass('open', false)}>
                <RowContent
                  glyph={<CalendarIcon width={15} height={15} />}
                  label={
                    <>
                      <span className="block text-ink">{where(item)}</span>
                      <span className="block text-[13px] text-mute">{reasonLabel(item.reason) || item.occasion}</span>
                    </>
                  }
                />
              </div>
              {item.outcome === 'open' ? (
                <form action={withdrawBriefAction} className="pe-4">
                  <BriefFields item={item} locale={locale} />
                  <button type="submit" className="min-h-11 text-[15px] text-link underline-offset-4 hover:underline" data-testid="inbox-undo">
                    {t('undo')}
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </ResultGroup>
      ) : null}
    </>
  )
}
