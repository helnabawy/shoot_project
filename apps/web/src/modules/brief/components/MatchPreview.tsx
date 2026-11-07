'use client'

import { useEffect, useState } from 'react'
import { previewMatches, type MatchPreview as Preview } from '@/modules/booking/preview-action'
import { PhotoTile } from '@/modules/creators/client'
import { Bidi } from '@/shared/ui/Bidi'
import { cx, ResultGroup, RowContent, rowClass } from '@/shared/ui/bar'
import { ForwardIcon, MinusIcon } from '@/shared/ui/icons'

export interface PreviewLabels {
  /** "{types} free for this · {price}". */
  group: string
  /** "{types} free for this" (no price rule). */
  groupNoPrice: string
  loading: string
  none: string
  /** "+{count} more on the next step". */
  more: string
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''))

/**
 * Matches in the brief bar (003 US1-S7, FR-014): once the sentence is complete, who is free for it, under the one
 * price. Each row submits the brief with that creator (`pick`), straight to the details step. Nothing is saved
 * until the visitor acts; without JavaScript this never renders and the Top Hit is the way on.
 */
export function MatchPreview({
  locale,
  answers,
  labels,
  pending,
}: {
  locale: string
  /** The completed answers, or null while the sentence is still being built. */
  answers: { values: Record<string, string>; custom: Record<string, boolean> } | null
  labels: PreviewLabels
  pending: boolean
}) {
  const key = answers ? JSON.stringify(answers) : ''
  const [state, setState] = useState<{ key: string; preview: Preview | null } | null>(null)

  useEffect(() => {
    if (!answers) return
    let live = true
    previewMatches({ locale, ...answers })
      .then((preview) => live && setState({ key, preview }))
      .catch(() => live && setState({ key, preview: null }))
    return () => {
      live = false
    }
    // `key` stands for the answers' content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, locale])

  if (!answers) return null
  if (!state || state.key !== key) {
    return (
      <p role="status" className="px-4 pb-2 text-[13px] text-mute" data-testid="match-preview-loading">
        {labels.loading}
      </p>
    )
  }
  const preview = state.preview
  if (!preview || !preview.sections.length) return null
  const nobody = preview.sections.every((s) => s.creators.length === 0)

  return (
    <div data-testid="match-preview" aria-live="polite">
      {nobody ? (
        <div className={rowClass('open', false)}>
          <RowContent glyph={<MinusIcon width={15} height={15} />} label={labels.none} />
        </div>
      ) : (
        preview.sections.map((section) => (
          <ResultGroup
            key={section.persona}
            label={
              section.price ? (
                <>
                  {fill(labels.group.split('{price}')[0] ?? '', { types: section.plural })}
                  <Bidi>{section.price}</Bidi>
                  {fill(labels.group.split('{price}')[1] ?? '', { types: section.plural })}
                </>
              ) : (
                fill(labels.groupNoPrice, { types: section.plural })
              )
            }
          >
            {section.creators.map((c) => (
              <button
                key={c.code}
                type="submit"
                name="pick"
                value={c.pick}
                disabled={pending}
                data-testid="match-preview-creator"
                data-code={c.code}
                className={cx(rowClass('open', true, 'photo'), 'w-[calc(100%-12px)] text-start')}
              >
                <PhotoTile photo={c.photo} initials={c.initials} />
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-ink">{c.name}</span>
                  {c.meta ? <span className="block text-[13px] font-normal text-mute">{c.meta}</span> : null}
                </span>
                <span className="flex items-center gap-2 text-[13px] font-normal tabular-nums text-mute">
                  <Bidi>{c.displayCode}</Bidi>
                  <ForwardIcon width={14} height={14} />
                </span>
              </button>
            ))}
            {section.total > section.creators.length ? (
              <p className="px-4 pb-1 text-[13px] text-mute">{fill(labels.more, { count: section.total - section.creators.length })}</p>
            ) : null}
          </ResultGroup>
        ))
      )}
    </div>
  )
}
