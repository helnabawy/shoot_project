import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronIcon } from '@/shared/ui/icons'
import type { HomeView } from '../view'
import type { HomeHrefs } from './hrefs'

/** The following requests as plain rows, no buttons: they become the card when the one above is answered. */
export function NextRows({ view, hrefs }: { view: HomeView; hrefs: HomeHrefs }) {
  const t = useTranslations('creatorHome')
  if (!view.rest.length) return null
  return (
    <ul aria-label={t('nextInLine')} className="mx-2 mt-3 border-t border-hair" data-testid="next-rows">
      {view.rest.map((item) => (
        <li key={`${item.ref}-${item.persona ?? ''}`} className="flex min-h-[60px] items-center gap-3 border-b border-hair py-1" data-testid="next-row" data-ref={item.ref}>
          <span className="min-w-0 flex-1">
            <span dir="auto" className="block text-[16px] leading-snug text-ink">
              {item.title}
            </span>
            <span className="block text-[13px] text-mute tabular-nums [&:lang(ar)]:text-[14px]">
              {t(item.kind === 'booking' ? 'kindBooking' : 'kindBrief')} · {item.sub}
            </span>
          </span>
          <span className="shrink-0 text-[13px] text-mute">{t('next')}</span>
        </li>
      ))}
      {view.hiddenCount > 0 ? (
        <li className="border-b border-hair" data-testid="see-all">
          <Link href={view.seeAllTo === 'inbox' ? hrefs.inbox : hrefs.bookings} className="flex min-h-11 items-center justify-between gap-3 py-1 text-[15px] font-medium text-ink">
            <span>{t('seeAll')}</span>
            <span className="flex items-center gap-1 text-[13px] font-normal text-mute tabular-nums">
              +{view.hiddenCount}
              <ChevronIcon width={16} height={16} />
            </span>
          </Link>
        </li>
      ) : null}
    </ul>
  )
}
