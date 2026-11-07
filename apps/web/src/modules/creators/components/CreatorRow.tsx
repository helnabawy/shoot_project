import Link from 'next/link'
import type { CreatorSummary } from '@shoot/domain/creators'
import { ReturnIcon } from '@/shared/ui/icons'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, KeyHint, rowClass, topHitBase } from '@/shared/ui/bar'
import type { CreatorRowView } from '../describe'
import { PhotoTile } from './PhotoTile'

/**
 * A creator as a Spotlight result: photo tile, name and code on line one, types and place on line
 * two, and in the directory up to three specialties as plain text (surface brief creators-directory).
 * `hit` is the blue Top Hit, the best match for the current filters.
 */
export function CreatorRow({
  creator,
  view,
  href,
  tone = 'row',
  showSpecialties = false,
}: {
  creator: CreatorSummary
  view: CreatorRowView
  href: string
  tone?: 'row' | 'hit'
  showSpecialties?: boolean
}) {
  const meta = [view.types, view.place].filter(Boolean).join(' · ')
  const hit = tone === 'hit'
  const text = hit ? 'text-on-accent' : 'text-mute'
  return (
    <Link
      href={href}
      data-testid={hit ? 'creator-top-hit' : 'creator-card'}
      data-code={creator.code}
      className={hit ? cx(topHitBase, 'min-h-16 grid-cols-[44px_minmax(0,1fr)_auto]') : rowClass('open', true, 'photo')}
    >
      <PhotoTile photo={creator.photo} initials={view.initials} tone={hit ? 'accent' : 'default'} />
      <span className="min-w-0">
        <span className={cx('block break-words', hit ? 'font-semibold' : 'font-semibold text-ink')}>{view.name}</span>
        {meta ? <span className={cx('block text-[13px] font-normal', text)}>{meta}</span> : null}
        {showSpecialties && view.specialties ? <span className={cx('block text-[13px] font-normal', text)}>{view.specialties}</span> : null}
      </span>
      <span className={cx('flex items-center gap-2 text-[13px] font-normal tabular-nums', text)}>
        <Bidi>{view.displayCode}</Bidi>
        {hit ? (
          <KeyHint className="border-white/40">
            <ReturnIcon width={13} height={13} />
          </KeyHint>
        ) : null}
      </span>
    </Link>
  )
}
