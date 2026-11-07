import type { ReactNode } from 'react'
import { cx } from '@/shared/ui/bar'

/**
 * Sections sit on the bare ground. Phones and tablets keep the bar's 680 px column. From 1024 px
 * a section becomes a pane, as in macOS settings: a hairline above, the heading held in a sticky
 * start column, the rows in the end column, out to the header's 1080 px.
 */
export function Section({
  id,
  heading,
  subheading,
  children,
  className,
  emphasis = false,
}: {
  id?: string | null
  heading?: ReactNode
  subheading?: ReactNode
  children: ReactNode
  className?: string
  /** The closing section: the heading steps up a size, the last word on the page. */
  emphasis?: boolean
}) {
  const titled = Boolean(heading || subheading)
  return (
    <section
      id={id ?? undefined}
      data-testid={id ? `section-${id}` : undefined}
      className={cx(
        'mx-auto max-w-[680px] px-4 pt-16 sm:px-6 lg:max-w-[1080px] lg:pt-24',
        className,
      )}
    >
      {titled ? (
        <div className="lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-x-16 lg:border-t lg:border-hair lg:pt-8">
          <div className="lg:sticky lg:top-8 lg:self-start">
            {heading ? (
              <h2
                className={cx(
                  'font-bold leading-tight text-ink text-balance',
                  emphasis
                    ? 'text-[30px] tracking-[-0.03em] sm:text-[38px]'
                    : 'text-[26px] tracking-[-0.025em] sm:text-[30px]',
                )}
              >
                {heading}
              </h2>
            ) : null}
            {subheading ? (
              <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-pretty text-mute">
                {subheading}
              </p>
            ) : null}
          </div>
          <div className="mt-6 lg:mt-0">{children}</div>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

/**
 * Rows on the bare ground as a real list: hairlines between, no panel (at most two panels per
 * page). Two columns from 640 px, divided with a logical border; a lone last item spans both.
 */
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
        // From 1024 px the section's own hairline stands above the list, so the list drops its top rule.
        '-mx-4 border-y border-hair lg:mx-0 lg:border-t-0',
        columns === 2
          ? // Every cell draws a bottom rule pulled 1 px down and clipped, so the last row's rules
            // vanish into the list's own bottom rule whatever the count.
            'grid overflow-hidden sm:grid-cols-2 [&>*]:-mb-px [&>*]:border-b [&>*]:border-hair sm:[&>*:nth-child(odd)]:border-e sm:[&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:border-e-0'
          : 'divide-y divide-hair',
      )}
    >
      {children}
    </Tag>
  )
}
