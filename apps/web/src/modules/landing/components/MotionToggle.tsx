'use client'

import { useEffect, useState } from 'react'
import { PauseIcon, PlayIcon } from '@/shared/ui/icons'
import { useHydrated } from '@/shared/ui/useHydrated'

/**
 * The landing's one Pause control (WCAG 2.2.2): it stops every loop on the page at once (the key
 * light, the creator columns, the network strip) by marking the document, which globals.css reads
 * (`html[data-motion='paused']`). Rendered only once JavaScript runs, since it does nothing without
 * it; hidden where nothing loops (phones, reduced motion).
 */
export function MotionToggle({ pauseLabel, playLabel, className }: { pauseLabel: string; playLabel: string; className?: string }) {
  const hydrated = useHydrated()
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (paused) root.dataset.motion = 'paused'
    else delete root.dataset.motion
    return () => {
      delete root.dataset.motion
    }
  }, [paused])

  if (!hydrated) return null
  return (
    <button
      type="button"
      onClick={() => setPaused((p) => !p)}
      aria-pressed={paused}
      aria-label={pauseLabel}
      title={paused ? playLabel : pauseLabel}
      className={`size-11 place-items-center rounded-full border border-hair bg-panel-solid text-ink shadow-panel transition-colors duration-150 hover:bg-tile motion-reduce:hidden ${className ?? ''}`}
    >
      {paused ? <PlayIcon width={18} height={18} /> : <PauseIcon width={18} height={18} />}
    </button>
  )
}
