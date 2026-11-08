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
