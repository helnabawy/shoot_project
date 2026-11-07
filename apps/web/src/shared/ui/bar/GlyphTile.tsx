import type { ReactNode } from 'react'
import { cx } from './cx'

/** 30 px tile that leads every row; carries a short abbreviation or an authored icon. */
export function GlyphTile({
  children,
  tone = 'default',
  className,
}: {
  children?: ReactNode
  tone?: 'default' | 'accent' | 'set'
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-[30px] shrink-0 place-items-center rounded-[var(--radius-tile)] text-[11px] font-bold leading-none tracking-tight',
        tone === 'accent'
          ? 'bg-white/20 text-on-accent'
          : tone === 'set'
            ? 'bg-accent text-on-accent'
            : 'bg-tile text-tile-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}
