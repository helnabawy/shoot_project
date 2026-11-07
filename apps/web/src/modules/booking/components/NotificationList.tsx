import { useTranslations } from 'next-intl'
import { cx, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { BellIcon } from '@/shared/ui/icons'
import { markNotificationRead } from '../actions'

/** Unread in-app notices from the notification log (FR-006). */
export function NotificationList({ items, locale }: { items: { id: number; text: string }[]; locale: string }) {
  const t = useTranslations('booking')
  if (!items.length) return null
  return (
    <ResultGroup label={t('updates')}>
      {items.map((n) => (
        <form key={n.id} action={markNotificationRead} data-testid="notification">
          <input type="hidden" name="id" value={n.id} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')}>
            <RowContent glyph={<BellIcon width={15} height={15} />} label={<span dir="auto">{n.text}</span>} trailing={t('markRead')} />
          </button>
        </form>
      ))}
    </ResultGroup>
  )
}
