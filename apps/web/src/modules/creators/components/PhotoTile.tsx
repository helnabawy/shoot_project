import Image from 'next/image'
import type { CreatorSummary } from '@shoot/domain/creators'
import { cx } from '@/shared/ui/bar'

/**
 * The creator's photo in a 44 px rounded tile, or their initials when there is none. Decorative: the
 * name beside it carries the meaning (surface brief creators-directory).
 */
export function PhotoTile({
  photo,
  initials,
  tone = 'default',
  className,
}: {
  photo: CreatorSummary['photo']
  initials: string
  tone?: 'default' | 'accent'
  className?: string
}) {
  const base = 'size-11 shrink-0 overflow-hidden rounded-[10px]'
  if (photo) {
    return (
      <span aria-hidden="true" className={cx(base, tone === 'accent' ? 'bg-white/20' : 'bg-tile', className)}>
        <Image src={photo.url} alt="" width={88} height={88} sizes="44px" className="size-full object-cover" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        base,
        'grid place-items-center text-[15px] font-bold leading-none',
        tone === 'accent' ? 'bg-white/20 text-on-accent' : 'bg-tile text-tile-ink',
        className,
      )}
    >
      {initials}
    </span>
  )
}
