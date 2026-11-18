import { CheckIcon } from '@/shared/ui/icons'

/**
 * The booking's history as a timeline (the owner, 2026-11-18): one node per state that happened, joined by a
 * hairline, the latest set in ink and semibold. Only real events with their real times (surface brief).
 */
export function HistoryTimeline({ events }: { events: { label: string; at: string }[] }) {
  return (
    <ol className="px-4 pt-1 pb-2" data-testid="history-timeline">
      {events.map((e, i) => {
        const last = i === events.length - 1
        return (
          <li key={e.label} className="relative grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-x-3 pb-3 last:pb-0" aria-current={last ? 'step' : undefined}>
            {last ? null : <span aria-hidden="true" className="absolute start-[8.5px] top-[22px] bottom-0 w-px bg-hair" />}
            <span aria-hidden="true" className={last ? 'mt-px grid size-[18px] place-items-center rounded-full bg-ink text-ground' : 'mt-px grid size-[18px] place-items-center rounded-full bg-tile text-tile-ink'}>
              <CheckIcon width={10} height={10} />
            </span>
            <span className={last ? 'text-[15px] font-semibold text-ink' : 'text-[15px] text-ink'}>{e.label}</span>
            <span className="pt-px text-[13px] text-mute tabular-nums">{e.at}</span>
          </li>
        )
      })}
    </ol>
  )
}
