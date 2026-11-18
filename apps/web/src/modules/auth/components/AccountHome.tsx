import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { ProfileStatus } from '@shoot/domain/creators'
import { BriefBar, ResultGroup, rowClass, RowContent, TopHit } from '@/shared/ui/bar'
import { Bidi } from '@/shared/ui/Bidi'
import { CalendarIcon, ChevronIcon, DocumentIcon, PlusIcon, UserIcon } from '@/shared/ui/icons'
import type { AccountBooking, AccountJob, NextUp } from '../account-home'

/** A booking as one line of the account page: its day, place, brief and price, already formatted. */
export interface BookingLine {
  dateLabel: string
  place: string
  sentence: string
  price: string
  respondBy?: string | null
}
export type JobView = AccountJob & BookingLine
export type BookingView = AccountBooking & BookingLine

const STATUS_KEY: Record<ProfileStatus, { title: string; body: string }> = {
  draft: { title: 'draft', body: 'bodyDraft' },
  'in-review': { title: 'inReview', body: 'bodyInReview' },
  live: { title: 'live', body: 'bodyLive' },
  'live-with-changes': { title: 'liveWithChanges', body: 'bodyLiveWithChanges' },
  paused: { title: 'paused', body: 'bodyPaused' },
  suspended: { title: 'suspended', body: 'bodySuspended' },
}
export const profileStatusTitle = (status: ProfileStatus) => STATUS_KEY[status].title

/** The panel's one static row: the thing that comes next, told in the row grammar. */
function NextRow({
  glyph,
  title,
  lines,
  trailing,
}: {
  glyph: ReactNode
  title: ReactNode
  lines: ReactNode[]
  trailing?: ReactNode
}) {
  return (
    <div className={rowClass('open', false)}>
      <RowContent
        glyph={glyph}
        label={
          <>
            <span className="block font-semibold text-ink">{title}</span>
            {lines.filter(Boolean).map((line, i) => (
              <span key={i} className="block text-[13px] text-mute [&:lang(ar)]:text-[14px]">
                {line}
              </span>
            ))}
          </>
        }
        trailing={trailing}
      />
    </div>
  )
}

const dayTile = (date: string | null) =>
  date ? (
    <span className="tabular-nums">{date.slice(8, 10)}</span>
  ) : (
    <CalendarIcon width={15} height={15} />
  )
const where = (b: BookingLine) => [b.dateLabel, b.place].filter(Boolean).join(' · ')

/**
 * Up next: the one panel on the account page. It names the single thing that needs the member now and
 * carries the page's one Top Hit; everything else on the page is an ordinary row on the ground.
 */
export async function NextUpPanel({
  next,
  hrefs,
}: {
  next: NextUp<JobView, BookingView>
  hrefs: {
    bookings: string
    booking: (ref: string) => string
    profile: string
    availability: string
    brief: string
    /** 019: the creator brief inbox. */
    inbox: string
  }
}) {
  const [t, tb, ts] = await Promise.all([
    getTranslations('account.next'),
    getTranslations('booking'),
    getTranslations('creators.status'),
  ])
  let row: ReactNode
  let action: { label: string; href: string }
  switch (next.kind) {
    case 'answer': {
      const j = next.job
      row = (
        <NextRow
          glyph={dayTile(j.date)}
          title={t('answerTitle', { count: next.count })}
          lines={[
            where(j),
            <span key="s" dir="auto">
              {j.sentence}
            </span>,
            j.respondBy ? (
              <span key="r" className="font-medium text-ink">
                {tb('respondBy', { time: j.respondBy })}
              </span>
            ) : null,
          ]}
        />
      )
      action = { label: t('answerAction', { count: next.count }), href: hrefs.bookings }
      break
    }
    case 'briefs': {
      const b = next.brief
      row = (
        <NextRow
          glyph={dayTile(b.date)}
          title={t('briefsTitle', { count: next.count })}
          lines={[
            [b.dateLabel || t('briefsAnyDate'), b.emirate].filter(Boolean).join(' · '),
            <span key="o" dir="auto">
              {[b.profession, b.occasion].filter(Boolean).join(' · ')}
            </span>,
            ...(b.priceLabel ? [<span key="p">{t('briefsPrice', { price: b.priceLabel })}</span>] : []),
          ]}
        />
      )
      action = { label: t('briefsAction', { count: next.count }), href: hrefs.inbox }
      break
    }
    case 'profile': {
      const k = STATUS_KEY[next.status]
      row = (
        <NextRow
          glyph={<UserIcon width={15} height={15} />}
          title={ts(k.title as never)}
          lines={[ts(k.body as never)]}
        />
      )
      action = {
        label: t(next.status === 'draft' ? 'profileFinish' : 'profileOpen'),
        href: hrefs.profile,
      }
      break
    }
    case 'job': {
      const j = next.job
      row = (
        <NextRow
          glyph={dayTile(j.date)}
          title={t('jobTitle')}
          lines={[
            where(j),
            <span key="s" dir="auto">
              {j.sentence}
            </span>,
          ]}
          trailing={tb(`state.${j.state}` as never)}
        />
      )
      action = { label: t('jobAction'), href: hrefs.bookings }
      break
    }
    case 'clear':
      row = (
        <NextRow
          glyph={<CalendarIcon width={15} height={15} />}
          title={t('clearTitle')}
          lines={[t('clearBody')]}
        />
      )
      action = { label: t('clearAction'), href: hrefs.availability }
      break
    case 'offers': {
      const o = next.offers
      row = (
        <NextRow
          glyph={<DocumentIcon width={15} height={15} />}
          title={t('offersTitle', { count: o.count })}
          lines={[
            <span key="s" dir="auto">
              {o.sentence}
            </span>,
            <Bidi key="r">{o.reference}</Bidi>,
          ]}
        />
      )
      action = { label: t('offersAction'), href: o.href }
      break
    }
    case 'quote':
    case 'booking': {
      const b = next.booking
      row = (
        <NextRow
          glyph={next.kind === 'quote' ? <DocumentIcon width={15} height={15} /> : dayTile(b.date)}
          title={t(next.kind === 'quote' ? 'quoteTitle' : 'bookingTitle')}
          lines={[
            where(b),
            <span key="s" dir="auto">
              {b.sentence}
            </span>,
            <span key="p">
              <Bidi>{b.reference}</Bidi>
              {b.price ? (
                <>
                  {' '}
                  · <Bidi>{b.price}</Bidi>
                </>
              ) : null}
            </span>,
          ]}
          trailing={next.kind === 'booking' ? tb(`state.${b.state}` as never) : null}
        />
      )
      action = {
        label: t(next.kind === 'quote' ? 'quoteAction' : 'bookingAction'),
        href: hrefs.booking(b.reference),
      }
      break
    }
    default:
      row = (
        <NextRow
          glyph={<PlusIcon width={15} height={15} />}
          title={t('briefTitle')}
          lines={[t('briefBody')]}
        />
      )
      action = { label: t('briefAction'), href: hrefs.brief }
  }
  return (
    <BriefBar
      as="section"
      aria-label={t('label')}
      data-testid="account-next"
      data-kind={next.kind}
      data-floating-hide
    >
      <ResultGroup label={t('label')}>{row}</ResultGroup>
      <div className="pb-2">
        <TopHit href={action.href} label={action.label} testId="account-next-action" />
      </div>
    </BriefBar>
  )
}

/** One place in the account, on the ground: tile, name, its one-line status and a chevron. */
export function PlaceRow({
  href,
  glyph,
  label,
  status,
  testId,
}: {
  href: string
  glyph: ReactNode
  label: string
  status?: ReactNode
  testId?: string
}) {
  return (
    <li className="py-1">
      <Link href={href} className={rowClass('open')} data-testid={testId}>
        <RowContent
          glyph={glyph}
          label={label}
          trailing={
            <span className="inline-flex items-center gap-2">
              {status}
              <ChevronIcon width={14} height={14} className="text-mute/70" />
            </span>
          }
        />
      </Link>
    </li>
  )
}

/** A confirmed booking as one row on the account home (025): its day, where, who it is with and its state. */
export interface ConfirmedRow {
  reference: string
  state: string
  date: string | null
  dateLabel: string
  place: string
  /** "With Hosam" for a client, "For Layla" for a creator; empty when there is no name. */
  who: string
  href: string
}

/**
 * Confirmed bookings (025 US3), on the ground under Up next: each row is the link to its booking, so a
 * confirmed quotation is one tap from the account. Absent when there are none.
 */
export async function ConfirmedBookings({ rows }: { rows: ConfirmedRow[] }) {
  if (!rows.length) return null
  const [t, tb] = await Promise.all([getTranslations('account.confirmed'), getTranslations('booking')])
  return (
    <section aria-labelledby="account-confirmed-title" className="mt-10" data-testid="account-confirmed">
      <h2 id="account-confirmed-title" className="group-label px-1 pb-2">
        {t('title')}
      </h2>
      <ul className="-mx-3 divide-y divide-hair border-y border-hair">
        {rows.map((r) => (
          <li key={r.reference} className="py-1">
            <Link href={r.href} className={rowClass('open')} data-testid="account-confirmed-row" data-reference={r.reference}>
              <RowContent
                glyph={dayTile(r.date)}
                label={
                  <>
                    <span className="block font-semibold text-ink">{[r.dateLabel, r.place].filter(Boolean).join(' · ') || <Bidi>{r.reference}</Bidi>}</span>
                    <span className="block text-[13px] text-mute [&:lang(ar)]:text-[14px]">
                      {r.who ? <>{r.who} · </> : null}
                      <Bidi>{r.reference}</Bidi>
                    </span>
                  </>
                }
                trailing={
                  <span className="inline-flex items-center gap-2">
                    {tb(`state.${r.state}` as never)}
                    <ChevronIcon width={14} height={14} className="text-mute/70" />
                  </span>
                }
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
