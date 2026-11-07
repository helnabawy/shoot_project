import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { RowContent, rowClass } from '@/shared/ui/bar'
import { ChevronIcon } from '@/shared/ui/icons'
import type { DirectoryView } from '../directory'
import { CreatorList, type CreatorListItem } from './CreatorList'

/** The rows under the filter panel and the page links, shared by `/creators` and the specialty pages. */
export function DirectoryResults({ view, items, hasTop }: { view: Pick<DirectoryView, 'pages' | 'page' | 'prevHref' | 'nextHref'>; items: CreatorListItem[]; hasTop: boolean }) {
  const t = useTranslations('creators.directory')
  return (
    <div className="px-4 pt-10">
      {items.length ? (
        <>
          {hasTop ? <p className="group-label pb-2">{t('everyone')}</p> : null}
          <CreatorList items={items} label={t('resultsLabel')} testId="directory-list" showSpecialties />
        </>
      ) : null}
      {view.pages > 1 ? (
        <nav aria-label={t('resultsLabel')} data-testid="directory-pagination" className="mt-4 -mx-2 grid gap-1">
          {view.prevHref ? (
            <Link href={view.prevHref} rel="prev" className={rowClass('open')}>
              <RowContent glyph={<ChevronIcon width={16} height={16} className="rotate-180" />} label={t('previous')} />
            </Link>
          ) : null}
          <p className="px-4 text-center text-[13px] text-mute tabular-nums">{t('page', { page: view.page, pages: view.pages })}</p>
          {view.nextHref ? (
            <Link href={view.nextHref} rel="next" className={rowClass('open')}>
              <RowContent glyph={<ChevronIcon width={16} height={16} />} label={t('next')} />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
