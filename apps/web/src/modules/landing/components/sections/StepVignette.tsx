import type { HowItWorksBlock } from '@/payload-types'
import { cx } from '@/shared/ui/bar'
import { CheckIcon, PlayIcon, SearchIcon } from '@/shared/ui/icons'

export type StepVisual = NonNullable<NonNullable<HowItWorksBlock['steps']>[number]['visual']>

/**
 * A step drawn as the product at that moment, in the product's own grammar: a flat window on the
 * ground (no shadow, so it never counts as a panel), skeleton text instead of words so no copy or
 * profession is baked in, and ink for anything that reads as chosen. Decorative: the step's title
 * and body carry the meaning.
 */
export function StepVignette({ visual }: { visual: StepVisual }) {
  if (visual === 'none') return null
  return (
    <div
      aria-hidden="true"
      data-testid={`step-visual-${visual}`}
      className="h-[120px] w-full max-w-[320px] overflow-hidden rounded-[10px] border border-hair bg-panel-solid"
    >
      {visual === 'brief' ? <Brief /> : visual === 'match' ? <Match /> : <Work />}
    </div>
  )
}

/** A skeleton word: a rounded bar the height of a lowercase letter. */
function Word({ className }: { className?: string }) {
  return <span className={cx('block h-[5px] shrink-0 rounded-full', className)} />
}

/** A set part of the sentence: the token tint the bar uses for a chosen word. */
function Token({ className }: { className?: string }) {
  return (
    <span className="flex h-4 shrink-0 items-center rounded-[4px] bg-selected px-1">
      <Word className={cx('bg-selected-ink/70', className)} />
    </span>
  )
}

/** The brief being written: the field with two set words and the caret, the asked list beneath. */
function Brief() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 items-center gap-1.5 border-b border-hair px-3">
        <SearchIcon className="size-3.5 shrink-0 text-ink" />
        <Word className="w-6 bg-ink/70" />
        <Token className="w-8" />
        <Word className="w-3 bg-mute/45" />
        <Token className="w-6" />
        <span className="h-3.5 w-[1.5px] shrink-0 rounded-full bg-accent" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 px-2">
        <Word className="ms-1 mb-0.5 w-9 bg-mute/35" />
        {['w-16', 'w-12'].map((w) => (
          <span key={w} className="flex h-[22px] items-center gap-2 px-1">
            <span className="size-4 shrink-0 rounded-[4px] bg-tile" />
            <Word className={cx(w, 'bg-ink/45')} />
          </span>
        ))}
      </div>
    </div>
  )
}

/** A professional matched: a week with the asked day set, and the person free on it. */
function Match() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-3">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, d) => (
          <span
            key={d}
            className={cx(
              'grid h-[22px] place-items-center rounded-[5px]',
              d === 4 ? 'bg-ink text-ground' : 'bg-tile',
            )}
          >
            {d === 4 ? <CheckIcon className="size-3" strokeWidth={2.25} /> : null}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2.5 border-t border-hair pt-3">
        <span className="size-8 shrink-0 rounded-[7px] bg-tile" />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Word className="w-16 bg-ink/70" />
          <Word className="w-24 max-w-full bg-mute/40" />
        </span>
        <span className="grid size-5 shrink-0 place-items-center rounded-[5px] bg-ink text-ground">
          <CheckIcon className="size-3" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  )
}

/**
 * The finished work: the uniform 4:5 grid a portfolio uses, one of them a film. Two rows of fixed
 * height; the columns run on past the window's end edge, as a set larger than the window would.
 */
function Work() {
  return (
    <div className="grid h-full auto-cols-[37px] grid-flow-col grid-rows-2 gap-1 p-3">
      {Array.from({ length: 16 }, (_, n) => (
        <span
          key={n}
          className={cx(
            'grid place-items-center rounded-[4px]',
            n % 5 === 2 ? 'bg-ink/[0.13]' : 'bg-tile',
          )}
        >
          {n === 3 ? <PlayIcon className="size-3 text-ink/60" /> : null}
        </span>
      ))}
    </div>
  )
}
