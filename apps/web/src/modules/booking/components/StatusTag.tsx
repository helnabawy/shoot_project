import { cx } from '@/shared/ui/bar'

/**
 * How a booking state reads as a tag (the owner, 2026-11-18). Material, not colour (DESIGN.md): a peach tint
 * when the next move is the client's or needs attention, a filled ink tag once the booking is settled, the
 * quiet stone tile otherwise. The word always names the state.
 */
export type TagTone = 'attention' | 'settled' | 'quiet'

const TONES: Record<string, TagTone> = {
  quoted: 'attention',
  confirmed: 'attention',
  delivered: 'attention',
  'on-hold': 'attention',
  paid: 'settled',
  scheduled: 'settled',
  completed: 'settled',
}

/** A creator's next move is answering a request; a booking the client still has to pay is not theirs. */
const CREATOR_TONES: Record<string, TagTone> = {
  accepted: 'attention',
  paid: 'settled',
  scheduled: 'settled',
  completed: 'settled',
}

export const tagTone = (state: string, side: 'client' | 'creator' = 'client'): TagTone => (side === 'creator' ? CREATOR_TONES : TONES)[state] ?? 'quiet'

export function StatusTag({ state, label, side = 'client', className }: { state: string; label: string; side?: 'client' | 'creator'; className?: string }) {
  const tone = tagTone(state, side)
  return (
    <span
      data-testid="status-tag"
      data-tone={tone}
      className={cx(
        'inline-flex min-h-6 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full px-2.5 text-[13px] font-medium leading-none [&:lang(ar)]:text-[14px]',
        tone === 'attention' ? 'bg-attention text-on-attention' : tone === 'settled' ? 'bg-ink text-ground' : 'bg-tile text-tile-ink',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
