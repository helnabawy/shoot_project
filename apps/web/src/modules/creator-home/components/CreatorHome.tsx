import { useTranslations } from 'next-intl'
import { CheckIcon } from '@/shared/ui/icons'
import type { HomeView } from '../view'
import { HomeSummary } from './HomeSummary'
import { declineKey, type HomeHrefs } from './hrefs'
import { ManageRows } from './ManageRows'
import { NextRows } from './NextRows'
import { NextShoot } from './NextShoot'
import { NotLive } from './NotLive'
import { RequestCard } from './RequestCard'

/**
 * The creator home (feature 023, boards 64 to 67): who you are, the one request to answer, the next shoot
 * and the places to manage. A creator who is not live gets their status and what to do instead of a queue.
 */
export function CreatorHome({
  view,
  locale,
  hrefs,
  error,
  declining,
}: {
  view: HomeView
  locale: string
  hrefs: HomeHrefs
  /** A problem's message, already translated. */
  error: string | null
  /** The request whose reason step is open (see `declineKey`). */
  declining: string | null
}) {
  const t = useTranslations('creatorHome')
  const live = view.mode === 'live'
  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-7 px-3 pt-6 pb-24 sm:pt-10 sm:pb-16" data-testid="creator-home">
      <HomeSummary view={view} hrefs={hrefs} />
      {error ? (
        <p role="alert" className="mx-2 rounded-[var(--radius-row)] bg-attention px-3 py-2.5 text-[15px] text-on-attention" data-testid="home-error">
          {error}
        </p>
      ) : null}
      {live ? (
        <section id="answer" aria-labelledby="home-answer" className="scroll-mt-20">
          <div className="flex items-center justify-between px-2 pb-2">
            <h2 id="home-answer" className="group-label">
              {t('answerTitle')}
            </h2>
            {view.card ? <span className="text-[13px] text-mute tabular-nums" data-testid="position">{t('position', { position: 1, total: view.total })}</span> : null}
          </div>
          {view.card ? (
            <>
              <RequestCard item={view.card} locale={locale} hrefs={hrefs} reasons={view.reasons} declining={declining === declineKey(view.card)} />
              <NextRows view={view} hrefs={hrefs} />
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-hair bg-panel-solid p-4 shadow-[var(--shadow-lift)]" data-testid="up-to-date">
              <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-tile)] bg-success text-on-success">
                <CheckIcon width={15} height={15} />
              </span>
              <div className="grid gap-0.5">
                <p className="text-[17px] font-semibold">{t('upToDate')}</p>
                <p className="text-[13px] text-mute [&:lang(ar)]:text-[14px]">{t('upToDateHint')}</p>
              </div>
            </div>
          )}
        </section>
      ) : (
        <NotLive view={view} hrefs={hrefs} />
      )}
      {live ? <NextShoot view={view} hrefs={hrefs} /> : null}
      <ManageRows view={view} hrefs={hrefs} live={live} />
    </div>
  )
}
