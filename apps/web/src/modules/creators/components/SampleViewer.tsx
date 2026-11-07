'use client'

import Image from 'next/image'
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { ChevronIcon, CloseIcon } from '@/shared/ui/icons'

export interface ViewerSample {
  url: string
  width: number
  height: number
  alt: string
  caption: string
  specialty: string
}

export interface ViewerLabels {
  /** "Sample {index} of {total}", already filled by the caller per index via the template. */
  label: string
  close: string
  previous: string
  next: string
}

const viewerButton =
  'grid size-11 place-items-center rounded-[var(--radius-row)] bg-panel-solid text-ink transition-colors duration-100 hover:bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-40'

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''))

/**
 * Opens a sample large in a native dialog (focus trap, Escape and the platform's back gesture come for
 * free). It wraps the server-rendered grid and only listens: without JavaScript the grid's links open
 * the large file instead. Arrow keys follow the reading direction.
 */
export function SampleViewer({ samples, labels, children }: { samples: ViewerSample[]; labels: ViewerLabels; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [index, setIndex] = useState(0)
  const sample = samples[index]

  const open = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-sample-index]')
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
    event.preventDefault()
    setIndex(Number(link.dataset.sampleIndex))
    dialog.current?.showModal()
  }
  const step = (delta: number) => setIndex((i) => (i + delta + samples.length) % samples.length)
  const onKey = (event: KeyboardEvent<HTMLDialogElement>) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    if (event.key === 'ArrowRight') step(rtl ? -1 : 1)
    if (event.key === 'ArrowLeft') step(rtl ? 1 : -1)
  }

  return (
    <>
      <div onClick={open}>{children}</div>
      <dialog
        ref={dialog}
        data-testid="sample-viewer"
        aria-label={fill(labels.label, { index: index + 1, total: samples.length })}
        onKeyDown={onKey}
        // A click on the backdrop (the dialog element itself) closes it.
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="m-auto max-h-[92svh] w-[min(96vw,1000px)] max-w-none overflow-hidden rounded-[var(--radius-panel)] bg-transparent p-0 text-ink backdrop:bg-ground/90"
      >
        {sample ? (
          <figure className="relative grid gap-2">
            <Image
              key={sample.url}
              src={sample.url}
              alt={sample.alt}
              width={sample.width}
              height={sample.height}
              sizes="96vw"
              className="mx-auto max-h-[78svh] w-auto rounded-[var(--radius-tile)] object-contain"
            />
            <figcaption className="px-1 text-center text-[15px] text-ink">
              {sample.caption || sample.alt}
              {sample.specialty ? <span className="text-mute"> · {sample.specialty}</span> : null}
            </figcaption>
          </figure>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          <button type="button" onClick={() => step(-1)} aria-label={labels.previous} className={viewerButton} disabled={samples.length < 2}>
            <ChevronIcon width={18} height={18} className="rotate-180" />
          </button>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={labels.close} className={viewerButton} autoFocus>
            <CloseIcon width={18} height={18} />
          </button>
          <button type="button" onClick={() => step(1)} aria-label={labels.next} className={viewerButton} disabled={samples.length < 2}>
            <ChevronIcon width={18} height={18} />
          </button>
        </div>
      </dialog>
    </>
  )
}
