import Link from 'next/link'
import { PhotoTile } from '@/modules/creators/client'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, rowClass } from '@/shared/ui/bar'
import { ForwardIcon } from '@/shared/ui/icons'
import type { PickRowView } from './types'

/** One free creator: photo tile, name and code, specialties; the whole row chooses them. */
export function CreatorPickRow({ row, chosenLabel, submit = false }: { row: PickRowView; chosenLabel: string; submit?: boolean }) {
  const className = rowClass(row.chosen ? 'set' : 'open', true, 'photo')
  const content = (
    <>
      <PhotoTile photo={row.photo} initials={row.initials} />
      <span className="min-w-0">
        <span className="block break-words font-semibold text-ink">{row.name}</span>
        {row.meta ? <span className="block text-[13px] font-normal text-mute">{row.meta}</span> : null}
      </span>
      <span className={cx('flex items-center gap-2 text-[13px] font-normal tabular-nums', row.chosen ? 'text-selected-ink' : 'text-mute')}>
        {row.chosen ? chosenLabel : <Bidi>{row.displayCode}</Bidi>}
        <ForwardIcon width={14} height={14} />
      </span>
    </>
  )
  // Inside a form (choosing a replacement), the row is the submit button itself.
  if (submit) {
    return (
      <button type="submit" data-testid="match-creator" data-code={row.code} className={cx(className, 'w-[calc(100%-12px)] text-start')}>
        {content}
      </button>
    )
  }
  return (
    <Link href={row.href} data-testid="match-creator" data-code={row.code} aria-current={row.chosen ? 'true' : undefined} className={className}>
      {content}
    </Link>
  )
}
