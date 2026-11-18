import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { rowClass, RowContent } from '@/shared/ui/bar'
import { CalendarIcon, ChevronIcon, DocumentIcon, UserIcon } from '@/shared/ui/icons'
import type { HomeView } from '../view'
import type { HomeHrefs } from './hrefs'

/** Bookings, Availability (with today) and My profile; for a creator who is not live, Bookings is left out. */
export function ManageRows({ view, hrefs, live }: { view: HomeView; hrefs: HomeHrefs; live: boolean }) {
  const t = useTranslations('creatorHome')
  const today = view.today === 'free' ? t('freeToday') : view.today === 'booked' ? t('bookedToday') : t('busyToday')
  const chevron = <ChevronIcon width={16} height={16} className="text-mute" />
  const rows = [
    ...(live ? [{ key: 'bookings', href: hrefs.bookings, glyph: <DocumentIcon width={15} height={15} />, label: t('bookings'), trailing: null as string | null }] : []),
    { key: 'availability', href: hrefs.availability, glyph: <CalendarIcon width={15} height={15} />, label: t('availability'), trailing: today },
    { key: 'profile', href: hrefs.profile, glyph: <UserIcon width={15} height={15} />, label: t('myProfile'), trailing: null },
  ]
  return (
    <nav aria-labelledby="home-manage" data-testid="manage-rows">
      <h2 id="home-manage" className="group-label px-2 pb-2">
        {t('manage')}
      </h2>
      <ul className="mx-2 border-t border-hair">
        {rows.map((row) => (
          <li key={row.key} className="border-b border-hair">
            <Link href={row.href} className={`${rowClass('open')} !mx-0 !grid-cols-[30px_minmax(0,1fr)_auto_16px]`} data-testid={`manage-${row.key}`}>
              <RowContent glyph={row.glyph} label={row.label} trailing={row.trailing} />
              {chevron}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
