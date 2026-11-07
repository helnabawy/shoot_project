import type { ReactNode } from 'react'
import { cx } from './cx'

/** Keyboard hint (↩, Esc) shown only on devices with a hover-capable pointer. */
export function KeyHint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'hidden items-center gap-1 rounded-[5px] border border-current/20 px-1.5 py-0.5 font-sans text-[12px] font-medium leading-none opacity-80 [@media(hover:hover)]:inline-flex',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
