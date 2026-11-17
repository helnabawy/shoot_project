'use client'

import { useActionState } from 'react'
import { PlaceStep, type PlaceStepLabels } from '@/modules/brief/components/PlaceStep'
import { saveMyBase, type BaseState } from '@/modules/maps/base-action'
import { cx, rowClass } from '@/shared/ui/bar'

export interface BaseLabels {
  title: string
  intro: string
  current: string
  save: string
  clear: string
  saved: string
  place: PlaceStepLabels
  errors: Record<string, string>
}

/** 022 (T078): "Where you start from", so the inbox shows how far each brief is; only the creator and the team see it. */
export function BaseSection({ locale, area, labels }: { locale: string; area: string | null; labels: BaseLabels }) {
  const [state, action, pending] = useActionState<BaseState, FormData>(saveMyBase, { status: 'idle' })
  const error = state.status === 'error' ? (labels.errors[state.error] ?? labels.errors['brief.errors.generic']) : undefined
  return (
    <section id="base" className="mt-12 scroll-mt-24" aria-labelledby="sec-base" data-testid="section-base">
      <h2 id="sec-base" className="px-1 text-[20px] font-semibold tracking-[-0.01em]">
        {labels.title}
      </h2>
      <p className="mt-1 px-1 text-[15px] text-mute">{labels.intro}</p>
      {area && state.status !== 'cleared' ? (
        <p className="mt-2 px-1 text-[15px]" data-testid="base-current">
          {labels.current.replace('{area}', area)}
        </p>
      ) : null}
      <form action={action} className="mt-3 -mx-3">
        <input type="hidden" name="locale" value={locale} />
        <PlaceStep locale={locale} labels={{ ...labels.place, label: labels.title }} error={error} />
        <div className="flex gap-2 px-3">
          <button type="submit" disabled={pending} className={cx(rowClass('open'), 'flex-1 justify-center border border-control-border font-semibold')} data-testid="base-save">
            {labels.save}
          </button>
          {area ? (
            <button type="submit" name="clear" value="1" disabled={pending} className={cx(rowClass('open'), 'justify-center px-4')}>
              {labels.clear}
            </button>
          ) : null}
        </div>
        {state.status === 'saved' ? (
          <p role="status" className="px-4 pt-2 text-[13px] text-mute">
            {labels.saved}
          </p>
        ) : null}
      </form>
    </section>
  )
}
