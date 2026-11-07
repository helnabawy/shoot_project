'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toggleBlockedDate } from '@/modules/booking/actions'
import type { CalendarDay, CalendarMonth } from '@/modules/booking/calendar'
import { cx } from '@/shared/ui/bar'
import { ChevronIcon } from '@/shared/ui/icons'

const intlLocale = (locale: string) => (locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB')

/** One day: a submit button of its month's form (`toggle=block:YYYY-MM-DD`); booked and outside days are not buttons. */
function Day({ cell, label }: { cell: CalendarDay; label: (cell: CalendarDay) => string }) {
  const { pending, data } = useFormStatus()
  const value = `${cell.status === 'blocked' ? 'free' : 'block'}:${cell.date}`
  // While this day's tap is on its way, show where it is going: feedback within 100 ms (FR-062).
  const sending = pending && data?.get('toggle') === value
  const shown = sending ? (cell.status === 'blocked' ? 'free' : 'blocked') : cell.status
  const base = 'grid h-11 place-items-center rounded-[var(--radius-row)] text-[15px] tabular-nums'
  const today = cell.today && 'ring-1 ring-inset ring-ink/30'
  if (cell.status === 'outside') {
    return (
      <span aria-hidden="true" className={cx(base, 'text-mute/45')}>
        {cell.day}
      </span>
    )
  }
  if (cell.status === 'booked') {
    return (
      <span role="img" aria-label={label(cell)} className={cx(base, today, 'bg-selected font-semibold text-selected-ink')} data-testid="calendar-day" data-date={cell.date} data-status="booked">
        {cell.day}
      </span>
    )
  }
  return (
    <button
      type="submit"
      name="toggle"
      value={value}
      disabled={pending}
      aria-label={label({ ...cell, status: shown })}
      aria-pressed={shown === 'blocked'}
      aria-busy={sending || undefined}
      data-testid="calendar-day"
      data-date={cell.date}
      data-status={shown}
      className={cx(
        base,
        today,
        'cursor-pointer transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:cursor-default',
        shown === 'blocked' ? 'bg-attention font-semibold text-on-attention' : 'text-ink hover:bg-ink/[0.06] active:bg-ink/[0.1]',
        sending && 'animate-pulse motion-reduce:animate-none',
      )}
    >
      {cell.day}
    </button>
  )
}

/**
 * CP-FR-014: the provider's next 90 days as a month grid on the profile page. A tap blocks or frees a day
 * and saves at once (the booking module's `toggleBlockedDate`, which refreshes the page in place); booked
 * days come from confirmations and cannot be tapped. Without JavaScript every month shows, one under
 * another, and each tap is a plain form post; with it, one month at a time with previous and next.
 */
export function ProfileCalendar({ months, locale, blocked, error }: { months: CalendarMonth[]; locale: string; blocked: number; error: string | null }) {
  const t = useTranslations('creators.calendar')
  const [index, setIndex] = useState(0)
  const monthFormat = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  const weekdayFormat = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'narrow', timeZone: 'UTC' })
  // 2026-11-02 is a Monday: the header runs Monday to Sunday, like the grid.
  const weekdays = Array.from({ length: 7 }, (_, i) => weekdayFormat.format(new Date(Date.UTC(2026, 10, 2 + i))))
  const monthName = (key: string) => monthFormat.format(new Date(`${key}-15T12:00:00Z`))
  const label = (cell: CalendarDay) => {
    const date = dayFormat.format(new Date(`${cell.date}T12:00:00Z`))
    return t(cell.status === 'booked' ? 'dayBooked' : cell.status === 'blocked' ? 'dayBlocked' : 'dayFree', { date })
  }
  const pager = 'grid size-11 place-items-center rounded-[var(--radius-row)] text-ink hover:bg-ink/[0.06] focus-visible:outline-2 focus-visible:outline-[var(--focus)] disabled:text-mute/40 disabled:hover:bg-transparent'

  return (
    <div className="mt-4 px-1" data-testid="profile-calendar">
      {error ? (
        <p role="alert" className="mb-3 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
          {error}
        </p>
      ) : null}
      <div className="max-w-[392px]">
        {/* The pager exists only with JavaScript; without it each month carries its own name. */}
        <div className="mb-1 hidden items-center justify-between gap-2 [.js_&]:flex">
          <p aria-live="polite" className="text-[17px] font-semibold text-ink" data-testid="calendar-month">
            {monthName(months[index]!.key)}
          </p>
          <div className="flex">
            <button type="button" className={pager} onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label={t('prev')} data-testid="calendar-prev">
              <ChevronIcon width={18} height={18} className="rotate-180" />
            </button>
            <button type="button" className={pager} onClick={() => setIndex((i) => Math.min(months.length - 1, i + 1))} disabled={index === months.length - 1} aria-label={t('next')} data-testid="calendar-next">
              <ChevronIcon width={18} height={18} />
            </button>
          </div>
        </div>
        {months.map((month, i) => (
          <form key={month.key} action={toggleBlockedDate} className={cx('mb-4', i !== index && '[.js_&]:hidden')} aria-label={monthName(month.key)}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="from" value="profile" />
            <p className="mb-1 text-[17px] font-semibold text-ink [.js_&]:hidden">{monthName(month.key)}</p>
            <div aria-hidden="true" className="grid grid-cols-7 gap-1 pb-1">
              {weekdays.map((d, n) => (
                <span key={n} className="group-label text-center">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {month.weeks.flat().map((cell, n) => (cell ? <Day key={cell.date} cell={cell} label={label} /> : <span key={`pad-${n}`} aria-hidden="true" />))}
            </div>
          </form>
        ))}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mute" aria-label={t('title')}>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[4px] border border-mute/50 bg-transparent" />
            {t('free')}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[4px] bg-attention" />
            {t('blocked')}
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-[4px] bg-selected" />
            {t('booked')}
          </li>
        </ul>
      </div>
      <p className="mt-3 text-[13px] text-mute" data-testid="calendar-count">
        {t('count', { count: blocked })}{' '}
        <Link href={locale === 'ar' ? '/ar/account/availability' : '/account/availability'} className="font-medium text-ink underline underline-offset-2">
          {t('asList')}
        </Link>
      </p>
    </div>
  )
}
