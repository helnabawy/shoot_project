import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronIcon, CheckIcon, ClockIcon } from '@/shared/ui/icons'
import type { HomeView } from '../view'
import type { HomeHrefs } from './hrefs'

const top =
  'flex min-h-[50px] items-center gap-3 rounded-[var(--radius-row)] bg-primary px-3 text-[17px] font-semibold text-on-primary transition-colors duration-100 hover:bg-primary-hover active:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]'

/**
 * A creator who cannot receive requests yet (board 67): why, what is missing and the one thing to do. An
 * incomplete profile gets "Finish my profile" as the page's one red action; one in review, or hidden, gets the
 * message and none (the team's review, or the creator's own choice, is the next step).
 */
export function NotLive({ view, hrefs }: { view: HomeView; hrefs: HomeHrefs }) {
  const t = useTranslations('creatorHome')
  if (view.mode === 'incomplete') {
    return (
      <section aria-labelledby="home-steps" data-testid="not-live">
        <div className="flex items-center justify-between px-2 pb-2">
          <h2 id="home-steps" className="group-label">
            {t('doThisFirst')}
          </h2>
          <span className="text-[13px] text-mute tabular-nums">{t('stepsDone', { done: view.stepsDone, total: view.stepsTotal })}</span>
        </div>
        <div className="grid gap-3.5 rounded-[var(--radius-panel)] border border-hair bg-panel-solid px-3 pt-4 pb-3 shadow-[var(--shadow-lift)]">
          <div className="grid gap-1.5 px-1">
            <p className="text-[20px] leading-tight font-semibold tracking-[-0.01em] [&:lang(ar)]:tracking-normal">{t('notLiveTitle')}</p>
            <p className="text-[14px] leading-normal text-mute [&:lang(ar)]:text-[15px]">{t('notLiveBody')}</p>
          </div>
          <div
            role="img"
            aria-label={t('stepsDone', { done: view.stepsDone, total: view.stepsTotal })}
            className="mx-1 h-1.5 overflow-hidden rounded-[3px] bg-ink/[0.08]"
            data-testid="steps-track"
          >
            <span className="block h-full rounded-[3px] bg-accent" style={{ width: `${Math.round((view.stepsDone / view.stepsTotal) * 100)}%` }} />
          </div>
          {view.needs.length ? (
            <ul className="grid px-1" data-testid="needs">
              {view.needs.map((n) => (
                <li key={n.step} className={`flex min-h-10 items-center gap-2.5 border-t border-hair text-[15px] first:border-t-0 ${n.required ? '' : 'text-mute'}`} data-step={n.step}>
                  {n.required ? <span aria-hidden="true" className="size-4 shrink-0 rounded-full border-2 border-ink" /> : <CheckIcon width={16} height={16} className="shrink-0" />}
                  {n.label}
                  {n.required ? <span className="ms-auto rounded-[5px] bg-attention px-1.5 py-px text-[13px] text-on-attention">{t('missing')}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={hrefs.profile} className={top} data-testid="finish-profile">
            <span className="flex-1">{t('finishProfile')}</span>
            <ChevronIcon width={16} height={16} />
          </Link>
        </div>
      </section>
    )
  }
  const review = view.mode === 'review'
  return (
    <section aria-labelledby="home-profile-status" data-testid="not-live">
      <h2 id="home-profile-status" className="group-label px-2 pb-2">
        {t('yourProfile')}
      </h2>
      <div className="flex items-start gap-3 rounded-[var(--radius-panel)] border border-hair bg-panel-solid p-4 shadow-[var(--shadow-lift)]">
        <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-tile)] bg-tile text-tile-ink">
          <ClockIcon width={15} height={15} />
        </span>
        <div className="grid gap-1">
          <p className="text-[17px] leading-snug font-semibold">{t(review ? 'reviewTitle' : 'hiddenTitle')}</p>
          <p className="text-[14px] leading-normal text-mute [&:lang(ar)]:text-[15px]">{t(review ? 'reviewBody' : 'hiddenBody')}</p>
          {review ? null : (
            <Link href={hrefs.profile} className="mt-1 min-h-11 content-center text-[15px] font-medium text-ink underline" data-testid="open-profile">
              {t('openProfile')}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
