import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Bidi } from '@/shared/ui/Bidi'
import { CheckIcon } from '@/shared/ui/icons'
import { answerBookingFromHome, answerBriefFromHome } from '../actions'
import type { HomeView, ItemView } from '../view'
import { declineKey, type HomeHrefs } from './hrefs'

const primary =
  'inline-flex min-h-[50px] flex-[1.4] items-center justify-center gap-2.5 rounded-[var(--radius-row)] bg-primary px-3 text-[17px] font-semibold text-on-primary transition-colors duration-100 hover:bg-primary-hover active:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]'
const secondary =
  'inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[var(--radius-row)] border border-control-border px-3 text-[16px] font-medium text-ink transition-colors duration-100 hover:bg-ink/[0.045] active:bg-ink/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]'

/** The hidden fields both answers carry. */
function Fields({ item, locale, decision }: { item: ItemView; locale: string; decision: string }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ref" value={item.ref} />
      {item.persona ? <input type="hidden" name="persona" value={item.persona} /> : null}
      <input type="hidden" name="decision" value={decision} />
    </>
  )
}

/**
 * The one request that needs an answer (board 64): its kind and deadline, the title, the labelled lines and
 * exactly two actions. Accept is the page's only red element. Decline is a link to the same page with the
 * request's reason step open (it works without JavaScript); Back is a link too, and nothing is recorded until
 * the reason step is submitted.
 */
export function RequestCard({
  item,
  locale,
  hrefs,
  reasons,
  declining,
}: {
  item: ItemView
  locale: string
  hrefs: HomeHrefs
  reasons: HomeView['reasons']
  declining: boolean
}) {
  const t = useTranslations('creatorHome')
  const booking = item.kind === 'booking'
  const answer = booking ? answerBookingFromHome : answerBriefFromHome
  const key = declineKey(item)
  return (
    <article className="grid gap-0 rounded-[var(--radius-panel)] border border-hair bg-panel-solid p-3 pt-4 shadow-[var(--shadow-lift)]" data-testid="request-card" data-ref={item.ref} data-kind={item.kind}>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[13px] font-semibold text-mute [&:lang(ar)]:text-[14px]">{t(booking ? 'kindBooking' : 'kindBrief')}</span>
        {item.deadline ? <span className="rounded-full bg-attention px-2.5 py-0.5 text-[13px] font-medium text-on-attention tabular-nums" data-testid="card-deadline">{item.deadline}</span> : null}
      </div>
      <h2 dir="auto" className="mx-1 mt-2 text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink [&:lang(ar)]:leading-snug [&:lang(ar)]:tracking-normal" data-testid="card-title">
        {item.title}
      </h2>
      <dl className="mx-1 mt-3.5 grid" data-testid="card-lines">
        {item.lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-3 border-t border-hair py-2.5 text-[15px] leading-snug" data-label={line.label}>
            <dt className="shrink-0 text-mute">{t(line.label)}</dt>
            <dd className="text-end font-medium tabular-nums">{line.label === 'reference' ? <Bidi>{line.value}</Bidi> : line.value}</dd>
          </div>
        ))}
      </dl>

      {declining ? (
        <form action={answer} className="mt-2 grid gap-3" data-testid="decline-step" aria-label={t('declineHeading')}>
          <Fields item={item} locale={locale} decision={booking ? 'decline' : 'reject'} />
          <p className="px-1 text-[15px] font-semibold text-ink">{t('declineHeading')}</p>
          {booking ? (
            <>
              <label htmlFor={`reason-${key}`} className="px-1 text-[13px] font-medium text-mute">
                {t('bookingReasonLabel')}
              </label>
              <textarea id={`reason-${key}`} name="reason" maxLength={200} rows={2} className="rounded-[var(--radius-row)] border border-control-border bg-transparent px-3 py-2 text-[16px] text-ink" />
            </>
          ) : (
            <>
              {reasons.length ? (
                <fieldset className="grid gap-0.5 px-1">
                  <legend className="pb-1 text-[13px] font-medium text-mute">{t('reasonLabel')}</legend>
                  {reasons.map((r) => (
                    <label key={r.value} className="flex min-h-11 items-center gap-3 text-[15px] text-ink">
                      <input type="radio" name="reason" value={r.value} className="size-4 accent-[var(--color-selected)]" />
                      {r.label}
                    </label>
                  ))}
                </fieldset>
              ) : null}
              <label htmlFor={`note-${key}`} className="px-1 text-[13px] font-medium text-mute">
                {t('noteLabel')}
              </label>
              <textarea id={`note-${key}`} name="note" maxLength={300} rows={2} className="rounded-[var(--radius-row)] border border-control-border bg-transparent px-3 py-2 text-[16px] text-ink" />
            </>
          )}
          <div className="flex gap-2">
            <button type="submit" className={secondary} data-testid="decline-confirm">
              {t('confirmDecline')}
            </button>
            <Link href={hrefs.home} className={secondary} data-testid="decline-back">
              {t('back')}
            </Link>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            <form action={answer} className="contents">
              <Fields item={item} locale={locale} decision={booking ? 'confirm' : 'accept'} />
              <button type="submit" className={primary} data-testid="accept">
                <CheckIcon width={18} height={18} />
                {t('accept')}
              </button>
            </form>
            <Link href={hrefs.decline(key)} className={secondary} data-testid="decline" scroll={false}>
              {t('decline')}
            </Link>
          </div>
          <p className="mx-1 mt-2.5 text-[13px] leading-normal text-mute [&:lang(ar)]:text-[14px]" data-testid="card-note">
            {t(booking ? 'noteBooking' : item.hasPrice ? 'noteBriefPrice' : 'noteBrief')}
            {item.hasPrice ? (
              <>
                {' '}
                <Link href={hrefs.inbox} className="font-medium text-ink underline">
                  {t('priceInInbox')}
                </Link>
              </>
            ) : null}
          </p>
        </>
      )}
    </article>
  )
}
