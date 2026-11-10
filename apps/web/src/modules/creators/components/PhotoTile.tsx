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
  size = 'md',
  className,
  eager = false,
}: {
  photo: CreatorSummary['photo']
  initials: string
  tone?: 'default' | 'accent'
  /** `md` 44 px (rows); `lg` 64 px (the profile header). */
  size?: 'md' | 'lg'
  className?: string
  /** Load straight away rather than on approach: for tiles that move into view (the network strip). */
  eager?: boolean
}) {
  const base = cx('shrink-0 overflow-hidden', size === 'lg' ? 'size-16 rounded-xl' : 'size-11 rounded-[10px]')
  if (photo) {
    return (
      <span aria-hidden="true" className={cx(base, tone === 'accent' ? 'bg-white/20' : 'bg-tile', className)}>
        <Image src={photo.url} alt="" width={size === 'lg' ? 128 : 88} height={size === 'lg' ? 128 : 88} sizes={size === 'lg' ? '64px' : '44px'} loading={eager ? 'eager' : 'lazy'} className="size-full object-cover" />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        base,
        'grid place-items-center font-bold leading-none',
        size === 'lg' ? 'text-[20px]' : 'text-[15px]',
        tone === 'accent' ? 'bg-white/20 text-on-primary' : 'bg-tile text-tile-ink',
        className,
      )}
    >
      {initials}
    </span>
  )
}
