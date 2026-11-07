import type { CreatorSummary } from '@shoot/domain/creators'
import { RowList } from '@/modules/landing/components/Section'
import type { CreatorRowView } from '../describe'
import { CreatorRow } from './CreatorRow'

export interface CreatorListItem {
  creator: CreatorSummary
  view: CreatorRowView
  href: string
}

/** Creators as rows on the bare ground, hairlines between (the landing block, the directory, specialty pages). */
export function CreatorList({
  items,
  label,
  testId,
  showSpecialties,
}: {
  items: CreatorListItem[]
  label: string
  testId?: string
  showSpecialties?: boolean
}) {
  if (items.length === 0) return null
  return (
    <RowList label={label} testId={testId}>
      {items.map((item) => (
        <li key={item.creator.id} className="py-1">
          <CreatorRow {...item} showSpecialties={showSpecialties} />
        </li>
      ))}
    </RowList>
  )
}
