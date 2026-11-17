import type { BriefItemV1 } from '@shoot/domain/api/v1'
import { formatMoney } from '@shoot/domain/pricing'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { localizeHref } from '@/shared/i18n/href'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, rowClass } from '@/shared/ui/bar'
import { answerBriefAction } from '../actions'
import { BriefFields } from './BriefCard'

/**
 * 022 (boards 51–52): the client's price and the place on a creator's brief card, and the offer form. The creator
 * sees their own amount only, never the service fee (FR-012), and the area only, never the pin (FR-005b).
 */
export function OfferPriceRow({ item, locale }: { item: BriefItemV1; locale: string }) {
  const t = useTranslations('inbox.offer')
  if (!item.budgetFils) return null
  return (
    <>
      {item.place ? (
        <div className="flex items-center gap-2.5 px-4 pt-2" data-testid="inbox-place">
          {item.place.mapUrl ? (
            // A small static map of the public point with a rough circle; never the pin.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.place.mapUrl} alt="" width={84} height={64} className="h-16 w-[84px] shrink-0 rounded-[10px] border border-hair object-cover" />
          ) : null}
          <span className="min-w-0 text-[15px] leading-snug">
            <span className="block">{[item.place.area, item.place.emirate].filter(Boolean).join(', ')}</span>
            <span className="block text-[13px] text-mute">
              {item.place.distanceKm !== null ? (
                t('distance', { km: item.place.distanceKm })
              ) : (
                <Link href={localizeHref('/account/profile', locale) + '#base'} className="font-medium text-link">
                  {t('setBase')}
                </Link>
              )}
            </span>
          </span>
        </div>
      ) : null}
      <p className="mx-4 mt-2 flex items-baseline justify-between gap-2 border-t border-hair pt-2.5" data-testid="inbox-client-price">
        <span className="text-[13px] text-mute">{t('clientPrice')}</span>
        <span className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">
          <Bidi>{formatMoney(item.budgetFils, locale)}</Bidi>
        </span>
      </p>
    </>
  )
}

/** "Offer another price" (board 52): a whole-AED field within the range, sent as `amount` (fils on the server). */
export function OfferForm({ item, locale, change = false }: { item: BriefItemV1; locale: string; change?: boolean }) {
  const t = useTranslations('inbox.offer')
  if (!item.budgetFils || !item.range) return null
  const id = `offer-${item.ref}-${item.persona}`
  const start = (item.offerFils ?? item.budgetFils) / 100
  const min = item.range.minFils / 100
  const max = item.range.maxFils ? item.range.maxFils / 100 : undefined
  return (
    <details className="px-4 pt-1" data-testid={change ? 'inbox-offer-change' : 'inbox-offer'}>
      <summary className="min-h-11 cursor-pointer content-center text-[15px] font-medium text-ink">{change ? t('change') : t('another')}</summary>
      <form action={answerBriefAction} className="grid gap-2 pb-3" data-testid="inbox-offer-form">
        <BriefFields item={item} locale={locale} />
        <input type="hidden" name="decision" value="accept" />
        <label htmlFor={id} className="text-[13px] font-medium text-mute">
          {t('yourPrice')}
        </label>
        <div className="flex h-14 items-center gap-2 rounded-[9px] border border-control-border bg-panel-solid px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
          <span className="text-[15px] font-medium text-mute">AED</span>
          <input id={id} name="amount" type="number" inputMode="numeric" min={min} max={max} step={1} defaultValue={start} required dir="ltr" className="w-full bg-transparent text-[26px] font-bold tabular-nums text-ink outline-none" aria-describedby={`${id}-hint`} />
        </div>
        <p id={`${id}-hint`} className="text-[13px] text-mute tabular-nums">
          <Bidi>{t('rangeHint', { min: formatMoney(item.range.minFils, locale), max: item.range.maxFils ? formatMoney(item.range.maxFils, locale) : '—', left: item.revisionsLeft ?? 3 })}</Bidi>
        </p>
        <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] justify-center border border-control-border font-semibold')} data-testid="inbox-offer-send">
          {t('send')}
        </button>
      </form>
    </details>
  )
}
