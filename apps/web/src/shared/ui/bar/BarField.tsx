import type { ReactNode } from 'react'
import { SearchIcon } from '../icons'
import { cx } from './cx'

/** The field of the bar: magnifier, the composed sentence (22 px), an optional trailing control and filter input. */
export function BarField({
  children,
  filter,
  trailing,
  className,
}: {
  children: ReactNode
  filter?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('border-b border-hair px-4 pt-4 pb-3', className)}>
      <div className="flex items-start gap-3">
        <SearchIcon
          width={22}
          height={22}
          className="mt-[3px] shrink-0 text-ink"
          strokeWidth={2.25}
        />
        <div className="min-w-0 flex-1 text-[20px] font-medium leading-[1.35] tracking-[-0.01em] text-ink sm:text-[22px]">
          {children}
        </div>
        {trailing}
      </div>
      {filter}
    </div>
  )
}
