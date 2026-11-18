import { useTranslations } from 'next-intl'
import { cx, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { BellIcon } from '@/shared/ui/icons'
import { openNotification } from '../actions'

export type NotificationItem = { id: string; text: string; read: boolean; when: string; hasTarget: boolean }

/**
 * Feature 024: the member's in-app notices, newest first. A new one reads in ink with "New"; a tap marks it
 * read and opens what it is about (or stays on the page when it leads nowhere).
 */
export function NotificationList({ items, locale }: { items: NotificationItem[]; locale: string }) {
  const t = useTranslations('notifications')
  if (!items.length) return null
  return (
    <ResultGroup label={t('title')}>
      {items.map((n) => (
        <form key={n.id} action={openNotification} data-testid="notification" data-read={n.read ? 'true' : 'false'}>
          <input type="hidden" name="id" value={n.id} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={cx(rowClass('open'), 'w-[calc(100%-12px)] text-start')}>
            <RowContent
              glyph={<BellIcon width={15} height={15} />}
              label={
                <span className="block">
                  <span dir="auto" className={cx('block', n.read ? 'text-mute' : 'font-medium text-ink')}>
                    {n.text}
                  </span>
                  <span className="block text-[13px] text-mute">{n.when}</span>
                </span>
              }
              trailing={n.read ? (n.hasTarget ? t('open') : null) : <span className="font-medium text-ink">{t('new')}</span>}
            />
          </button>
        </form>
      ))}
    </ResultGroup>
  )
}
