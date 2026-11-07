import { useTranslations } from 'next-intl'
import { cx, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { CheckIcon } from '@/shared/ui/icons'
import { toggleBlockedDate } from '../actions'

export interface AvailabilityDay {
  date: string
  /** "Fri 12 Dec". */
  label: string
  status: 'free' | 'blocked' | 'booked'
}

/** The next days grouped by month, one form per date so it works without JavaScript (FR-002). */
export function AvailabilityList({ months, locale }: { months: { label: string; days: AvailabilityDay[] }[]; locale: string }) {
  const t = useTranslations('availability')
  return (
    <>
      {months.map((month) => (
        <ResultGroup key={month.label} label={month.label}>
          {month.days.map((day) => (
            <form key={day.date} action={toggleBlockedDate} data-testid="availability-day" data-date={day.date} data-status={day.status}>
              <input type="hidden" name="date" value={day.date} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="action" value={day.status === 'blocked' ? 'free' : 'block'} />
              {day.status === 'booked' ? (
                <div className={rowClass('set', false)}>
                  <RowContent state="set" glyph={<CheckIcon width={15} height={15} />} label={day.label} trailing={t('booked')} />
                </div>
              ) : (
                <button type="submit" className={cx(rowClass(day.status === 'blocked' ? 'attention' : 'open'), 'w-[calc(100%-12px)] text-start')} aria-label={`${day.label}: ${day.status === 'blocked' ? t('free') : t('block')}`}>
                  <RowContent
                    state={day.status === 'blocked' ? 'attention' : 'open'}
                    glyph={day.date.slice(8, 10)}
                    label={day.label}
                    trailing={day.status === 'blocked' ? `${t('blocked')} · ${t('free')}` : `${t('available')} · ${t('block')}`}
                  />
                </button>
              )}
            </form>
          ))}
        </ResultGroup>
      ))}
    </>
  )
}
