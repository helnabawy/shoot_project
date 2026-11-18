import { useTranslations } from 'next-intl'
import Link from 'next/link'
import type { HomeView } from '../view'
import { Bidi } from '@/shared/ui/Bidi'
import { UserIcon } from '@/shared/ui/icons'
import type { HomeHrefs } from './hrefs'

const BADGE: Record<HomeView['mode'], string> = {
  live: 'bg-success text-on-success',
  incomplete: 'bg-attention text-on-attention',
  review: 'bg-tile text-tile-ink',
  paused: 'bg-tile text-tile-ink',
}

/** Who is signed in and where they stand: the identity row, then the three counts as links (board 64). */
export function HomeSummary({ view, hrefs }: { view: HomeView; hrefs: HomeHrefs }) {
  const t = useTranslations('creatorHome')
  const image = view.photo?.sizes[0]
  return (
    <section aria-label={t('identityLabel')} className="grid gap-[18px]" data-testid="home-summary">
      <div className="flex items-center gap-3 px-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={view.photo?.alt ?? ''} width={44} height={44} className="size-11 shrink-0 rounded-[var(--radius-photo-tile)] object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-photo-tile)] bg-tile text-tile-ink">
            <UserIcon width={20} height={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink [&:lang(ar)]:tracking-normal">{view.name}</h1>
          <p className="text-[13px] text-mute [&:lang(ar)]:text-[14px]">
            {view.professions}
            {view.code ? (
              <>
                {' · '}
                <Bidi>{view.code}</Bidi>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap before:size-1.5 before:rounded-full before:bg-current ${BADGE[view.mode]}`}
          data-testid="home-status"
        >
          {t(view.mode)}
        </span>
      </div>
      {view.counts ? (
        <nav aria-label={t('countsLabel')} className="mx-2 grid grid-cols-3 border-y border-hair" data-testid="home-counts">
          {(
            [
              ['toAnswer', view.counts.toAnswer, '#answer'],
              ['comingUp', view.counts.comingUp, hrefs.bookings],
              ['completed', view.counts.completed, hrefs.bookings],
            ] as const
          ).map(([key, value, href], i) => (
            <Link key={key} href={href} data-testid={`count-${key}`} className={`flex min-h-11 flex-col gap-0.5 py-3 ${i === 0 ? 'pe-3' : 'border-s border-hair px-3'}`}>
              <b className="text-[26px] leading-[1.1] font-bold tracking-[-0.03em] tabular-nums [&:lang(ar)]:tracking-normal">{value}</b>
              <span className="text-[13px] text-mute [&:lang(ar)]:text-[14px]">{t(key)}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </section>
  )
}
