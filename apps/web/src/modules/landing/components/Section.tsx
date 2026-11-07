import type { ReactNode } from 'react'
import { cx } from '@/shared/ui/bar'

/** Sections sit on the bare ground, aligned with the bar's 680 px column. */
export function Section({
  id,
  heading,
  subheading,
  children,
  className,
}: {
  id?: string | null
  heading?: ReactNode
  subheading?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      id={id ?? undefined}
      data-testid={id ? `section-${id}` : undefined}
      className={cx('mx-auto max-w-[680px] px-4 pt-16', className)}
    >
      {heading ? (
        <h2 className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-ink text-balance sm:text-[30px]">
          {heading}
        </h2>
      ) : null}
      {subheading ? (
        <p className="mt-2 max-w-[60ch] text-[16px] leading-relaxed text-mute">{subheading}</p>
      ) : null}
      <div className={heading || subheading ? 'mt-5' : undefined}>{children}</div>
    </section>
  )
}

/** Rows on the bare ground as a real list: hairlines between, no panel (at most two panels per page). */
export function RowList({
  children,
  columns = 1,
  as = 'ul',
  label,
  testId,
}: {
  children: ReactNode
  columns?: 1 | 2
  as?: 'ul' | 'ol'
  /** Accessible name of the list. */
  label?: string
  testId?: string
}) {
  const Tag = as
  return (
    <Tag
      aria-label={label}
      data-testid={testId}
      className={cx(
        '-mx-4 border-y border-hair [&>*]:border-hair',
        columns === 2
          ? 'grid sm:grid-cols-2 [&>*]:border-b sm:[&>*:nth-last-child(-n+2)]:border-b-0 [&>*:last-child]:border-b-0 sm:[&>*:nth-child(odd)]:border-e'
          : 'divide-y divide-hair',
      )}
    >
      {children}
    </Tag>
  )
}
