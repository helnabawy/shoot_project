import type { CreatorHomeV1, HomeItemV1 } from '@shoot/domain/api/v1'
import { NEXT_LIMIT, type HomeMode, type TodayState } from '@shoot/domain/account'
import { formatBriefDate } from '@shoot/domain/brief/message'
import { PROFILE_STEPS } from '@shoot/domain/creators'
import { joinList } from '@shoot/domain/personas'
import { formatMoney } from '@shoot/domain/pricing'

/**
 * The creator home as the page shows it (feature 023): the wire answer with dates, times, prices and the
 * title already written in the reader's language. Pure, so the components stay presentational and the
 * rules (what the card says, what "See all" opens) are tested without a server.
 */

type Locale = 'en' | 'ar'

/** The few words the view needs from the message files, so this file never reads them itself. */
export interface Words {
  title: (v: { occasion: string; emirate: string }) => string
  titleNoOccasion: (v: { profession: string; emirate: string }) => string
  answerBy: (time: string) => string
  dateToAgree: string
  /** "2 hours ago": the relative time, to be put into a sentence if the language needs one. */
  sentAt: (relative: string) => string
  stepLabel: (step: string) => string
}

export type LineLabel = 'date' | 'length' | 'client' | 'needs' | 'sent' | 'reference' | 'price'

export interface ItemView {
  kind: 'booking' | 'brief'
  ref: string
  /** Briefs only: which professional type the answer is for. */
  persona: string | null
  title: string
  /** "Answer by 18:00"; booking requests only. */
  deadline: string | null
  lines: { label: LineLabel; value: string }[]
  /** The client's price is shown, so Accept accepts it (022). */
  hasPrice: boolean
  /** One line for the "Next" rows. */
  sub: string
}

export interface HomeView {
  name: string
  code: string | null
  professions: string
  photo: CreatorHomeV1['photo']
  mode: HomeMode
  counts: CreatorHomeV1['counts']
  /** Every request, in order; the first is the card. */
  queue: ItemView[]
  card: ItemView | null
  rest: ItemView[]
  /** Requests beyond the rows shown. */
  hiddenCount: number
  total: number
  seeAllTo: 'inbox' | 'bookings'
  next: { ref: string; title: string; day: string; month: string; when: string; paid: boolean } | null
  today: TodayState
  needs: { step: string; label: string; required: boolean }[]
  /** Steps with nothing required missing, of all the profile's steps (the board's "5 of 7 steps done"). */
  stepsDone: number
  stepsTotal: number
  reasons: CreatorHomeV1['reasons']
}

const tz = 'Asia/Dubai'
const intl = (locale: Locale) => (locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB')

const dayLabel = (date: string, locale: Locale) => formatBriefDate(date, locale)
const dayAndTime = (date: string, time: string | null, locale: Locale) => (time ? `${dayLabel(date, locale)}, ${time}` : dayLabel(date, locale))

/** The answer-by time: just the clock when it is today (UAE), otherwise the day and the clock. */
function deadlineLabel(iso: string, now: Date, locale: Locale): string {
  const at = new Date(iso)
  const dayOf = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
  const clock = new Intl.DateTimeFormat(intl(locale), { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(at)
  return dayOf(at) === dayOf(now) ? clock : `${new Intl.DateTimeFormat(intl(locale), { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(at)}, ${clock}`
}

/** "2 hours ago", "yesterday": the largest whole unit, in the reader's language. */
function relativeLabel(iso: string, now: Date, locale: Locale): string {
  const minutes = Math.round((Date.parse(iso) - now.getTime()) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(intl(locale), { numeric: 'auto' })
  const abs = Math.abs(minutes)
  if (abs < 60) return rtf.format(minutes, 'minute')
  if (abs < 60 * 24) return rtf.format(Math.round(minutes / 60), 'hour')
  return rtf.format(Math.round(minutes / (60 * 24)), 'day')
}

function titleOf(item: Pick<HomeItemV1, 'occasion' | 'emirate' | 'profession'>, words: Words): string {
  if (!item.emirate) return item.occasion || item.profession
  return item.occasion ? words.title({ occasion: item.occasion, emirate: item.emirate }) : words.titleNoOccasion({ profession: item.profession, emirate: item.emirate })
}

function itemView(item: HomeItemV1, locale: Locale, words: Words, now: Date): ItemView {
  if (item.kind === 'booking') {
    const lines: ItemView['lines'] = [{ label: 'date', value: item.date ? dayAndTime(item.date, item.time, locale) : words.dateToAgree }]
    if (item.length) lines.push({ label: 'length', value: item.length })
    lines.push({ label: 'client', value: item.client }, { label: 'reference', value: item.ref })
    return { kind: 'booking', ref: item.ref, persona: null, title: titleOf(item, words), deadline: words.answerBy(deadlineLabel(item.respondBy, now, locale)), lines, hasPrice: false, sub: item.date ? dayLabel(item.date, locale) : words.dateToAgree }
  }
  const lines: ItemView['lines'] = [
    { label: 'date', value: item.date ? dayLabel(item.date, locale) : words.dateToAgree },
    { label: 'needs', value: item.profession },
    { label: 'sent', value: words.sentAt(relativeLabel(item.sentAt, now, locale)) },
    { label: 'reference', value: item.ref },
  ]
  if (item.budgetFils) lines.push({ label: 'price', value: formatMoney(item.budgetFils, locale) })
  return { kind: 'brief', ref: item.ref, persona: item.persona, title: titleOf(item, words), deadline: null, lines, hasPrice: Boolean(item.budgetFils), sub: item.date ? dayLabel(item.date, locale) : words.dateToAgree }
}

export function buildHomeView(home: CreatorHomeV1, locale: Locale, words: Words, now: Date): HomeView {
  const items = home.queue.map((i) => itemView(i, locale, words, now))
  const rest = items.slice(1, 1 + NEXT_LIMIT)
  const hidden = home.queue.slice(1 + NEXT_LIMIT)
  const next = home.next
  return {
    name: home.name,
    code: home.code,
    professions: joinList(home.professions, 'and', locale),
    photo: home.photo,
    mode: home.mode,
    counts: home.counts,
    queue: items,
    card: items[0] ?? null,
    rest,
    hiddenCount: hidden.length,
    total: items.length,
    seeAllTo: hidden.some((i) => i.kind === 'brief') ? 'inbox' : 'bookings',
    next: next
      ? {
          ref: next.ref,
          title: titleOf({ occasion: next.occasion, emirate: next.emirate, profession: '' }, words),
          day: next.date.slice(8, 10),
          month: new Intl.DateTimeFormat(intl(locale), { month: 'short', timeZone: 'UTC' }).format(new Date(`${next.date}T12:00:00Z`)),
          when: [dayAndTime(next.date, next.time, locale), next.length].filter(Boolean).join(' · '),
          paid: next.paid,
        }
      : null,
    today: home.today,
    needs: home.needs.map((n) => ({ step: n.step, label: words.stepLabel(n.step), required: n.required.length > 0 })),
    stepsDone: PROFILE_STEPS.length - home.needs.filter((n) => n.required.length > 0).length,
    stepsTotal: PROFILE_STEPS.length,
    reasons: home.reasons,
  }
}
