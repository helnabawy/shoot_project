import Link from 'next/link'
import type { Pagination as PaginationData } from '@shoot/domain/pages'

/** Previous / next as plain links, so paging works without scripting and crawlers can follow it. */
export function Pagination({
  pagination,
  hrefFor,
  labels,
}: {
  pagination: PaginationData
  /** The address of page `n` (page 1 has no query). */
  hrefFor: (page: number) => string
  labels: { nav: string; previous: string; next: string; pageOf: string }
}) {
  if (pagination.pages <= 1) return null
  return (
    <nav aria-label={labels.nav} className="mt-6 flex items-center justify-between gap-4 text-[15px]" data-testid="pagination">
      {pagination.hasPrev ? (
        <Link href={hrefFor(pagination.page - 1)} rel="prev" className="inline-flex min-h-11 items-center font-medium text-ink underline">
          {labels.previous}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
      <span aria-current="page" className="text-mute">
        {labels.pageOf}
      </span>
      {pagination.hasNext ? (
        <Link href={hrefFor(pagination.page + 1)} rel="next" className="inline-flex min-h-11 items-center font-medium text-ink underline">
          {labels.next}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  )
}
