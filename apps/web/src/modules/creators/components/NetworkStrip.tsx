'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { PauseIcon, PlayIcon } from '@/shared/ui/icons'

/** Below this many creators the strip holds still and scrolls by hand: a loop of three shows the same face twice at once on a wide screen. */
export const STRIP_MIN_TO_RUN = 4
/** One copy of the loop must be wider than the widest screen, so short lists repeat inside it. */
const CARDS_PER_LOOP = 8
/** Seconds each card takes to pass, so the speed is the same whatever the count. */
const SECONDS_PER_CARD = 7

export interface StripItem {
  key: string
  node: ReactNode
}

/**
 * The landing "Our network" strip. With enough creators it runs as a slow loop across the full
 * width: the list itself once for assistive tech, then the copies the loop needs, hidden and inert.
 * Hover, focus or the pause control stop it (WCAG 2.2.2); under reduced motion, or with too few
 * creators, it is a still row that scrolls sideways and snaps to each card. The motion is CSS only;
 * this component holds just the paused state.
 */
export function NetworkStrip({
  items,
  label,
  testId,
  footer,
  pauseLabel,
  playLabel,
}: {
  items: StripItem[]
  /** Accessible name of the list. */
  label: string
  testId?: string
  /** The section's link to the directory, set at the start of the row under the strip. */
  footer?: ReactNode
  pauseLabel: string
  playLabel: string
}) {
  const [paused, setPaused] = useState(false)
  const runs = items.length >= STRIP_MIN_TO_RUN
  const repeats = runs ? Math.max(1, Math.ceil(CARDS_PER_LOOP / items.length)) : 1
  const style = {
    '--strip-duration': `${items.length * repeats * SECONDS_PER_CARD}s`,
  } as CSSProperties

  const cell = (item: StripItem, copy: number) => (
    <li key={`${copy}-${item.key}`} className="network-strip-cell">
      {item.node}
    </li>
  )

  return (
    <div className="network-strip" data-runs={runs} data-paused={paused}>
      <div className="network-strip-viewport">
        <div className="network-strip-track" style={style}>
          <ul aria-label={label} data-testid={testId} className="flex">
            {items.map((item) => cell(item, 0))}
          </ul>
          {runs ? (
            <ul aria-hidden="true" inert className="network-strip-copies flex">
              {Array.from({ length: repeats * 2 - 1 }, (_, i) =>
                items.map((item) => cell(item, i + 1)),
              )}
            </ul>
          ) : null}
        </div>
      </div>

      {footer || runs ? (
        <div className="mx-auto mt-5 flex max-w-[680px] items-center justify-between gap-4 px-4 sm:px-6 lg:max-w-[1080px]">
          <div className="-mx-2 min-w-0">{footer}</div>
          {runs ? (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={pauseLabel}
              title={paused ? playLabel : pauseLabel}
              className="network-strip-toggle grid size-11 shrink-0 place-items-center rounded-full border border-hair text-mute transition-colors duration-150 hover:bg-ink/[0.045] hover:text-ink"
            >
              {paused ? <PlayIcon width={16} height={16} /> : <PauseIcon width={16} height={16} />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
