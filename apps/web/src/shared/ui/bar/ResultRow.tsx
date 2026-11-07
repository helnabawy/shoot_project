import type { ReactNode } from 'react'
import { cx } from './cx'
import { GlyphTile } from './GlyphTile'

export type RowState = 'open' | 'set' | 'attention'

/** Classes for anything that should look like a result row (label, link, button, summary). */
export function rowClass(state: RowState = 'open', interactive = true, lead: 'glyph' | 'photo' = 'glyph') {
  const set = state === 'set'
  // Rows sit inset with rounded corners, like a Spotlight selection; text stays 16 px from the panel edge.
  // `photo` leads with a 44 px photo tile (a creator, specs/002 surface brief) instead of the 30 px glyph tile.
  return cx(
    'mx-1.5 grid items-center gap-3 rounded-[var(--radius-row)] px-2.5 py-[7px] text-[16px] leading-snug',
    lead === 'photo' ? 'min-h-16 grid-cols-[44px_minmax(0,1fr)_auto]' : 'min-h-11 grid-cols-[30px_minmax(0,1fr)_auto]',
    // A picked row is tinted selection blue so the client sees their choices at a glance.
    set && 'bg-selected font-semibold',
    interactive &&
      cx(
        'cursor-pointer transition-colors duration-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] has-[:focus-visible]:-outline-offset-2',
        set
          ? 'hover:bg-selected-hover active:bg-selected-hover'
          : 'hover:bg-ink/[0.045] active:bg-ink/[0.08] has-[:focus-visible]:bg-ink/[0.06]',
      ),
  )
}

/** Glyph tile, label and trailing slot (state text or key hint). */
export function RowContent({
  glyph,
  label,
  trailing,
  state = 'open',
  tile,
}: {
  glyph?: ReactNode
  label: ReactNode
  trailing?: ReactNode
  state?: RowState
  tile?: 'default' | 'set'
}) {
  return (
    <>
      <GlyphTile tone={tile ?? (state === 'set' ? 'set' : 'default')}>{glyph}</GlyphTile>
      <span className="min-w-0 break-words">{label}</span>
      <span
        className={cx(
          'max-w-[46vw] text-end text-[13px] font-normal sm:max-w-none',
          state === 'attention'
            ? 'rounded-md bg-attention px-1.5 py-0.5 text-on-attention'
            : state === 'set'
              ? 'text-selected-ink'
              : 'text-mute',
        )}
      >
        {trailing}
      </span>
    </>
  )
}

/** A static (non-interactive) row. */
export function ResultRow(
  props: Parameters<typeof RowContent>[0] & { className?: string; interactive?: boolean },
) {
  const { className, interactive = false, ...content } = props
  return (
    <div className={cx(rowClass(content.state, interactive), className)}>
      <RowContent {...content} />
    </div>
  )
}
