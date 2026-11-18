import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronIcon } from '@/shared/ui/icons'
import type { HomeView } from '../view'
import type { HomeHrefs } from './hrefs'

/** The nearest confirmed booking, as one row that opens it; nothing at all when there is none. */
export function NextShoot({ view, hrefs }: { view: HomeView; hrefs: HomeHrefs }) {
  const t = useTranslations('creatorHome')
  const next = view.next
  if (!next) return null
  return (
    <section aria-labelledby="home-next-shoot" data-testid="next-shoot">
      <h2 id="home-next-shoot" className="group-label px-2 pb-2">
        {t('nextShoot')}
      </h2>
      <Link href={hrefs.booking(next.ref)} className="mx-2 flex min-h-[72px] items-center gap-3 border-y border-hair py-2" data-testid="next-shoot-link">
        <span aria-hidden="true" className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-photo-tile)] bg-tile text-tile-ink leading-none">
          <b className="text-[18px] font-bold text-ink tabular-nums">{next.day}</b>
          <span className="mt-[3px] text-[10px] font-semibold tracking-[0.06em] uppercase [&:lang(ar)]:tracking-normal [&:lang(ar)]:normal-case">{next.month}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span dir="auto" className="block text-[16px] leading-snug font-medium text-ink">
            {next.title}
          </span>
          <span className="block text-[13px] text-mute tabular-nums [&:lang(ar)]:text-[14px]">{next.when}</span>
        </span>
        {next.paid ? <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-success px-2.5 text-[13px] font-medium text-on-success before:size-1.5 before:rounded-full before:bg-current">{t('paid')}</span> : null}
        <ChevronIcon width={16} height={16} className="shrink-0 text-mute" />
      </Link>
    </section>
  )
}
