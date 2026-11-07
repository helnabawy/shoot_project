import type { ReactNode } from 'react'

/**
 * The top of a specialty page: its title, the editor's introduction and, only when there is
 * something true to say, the counts line (surface brief creators-directory). No panel: it sits on the ground.
 */
export function SpecialtyHeader({ title, intro, counts }: { title: string; intro?: ReactNode; counts: string | null }) {
  return (
    <header data-testid="specialty-header">
      <h1 className="px-1 text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{title}</h1>
      {intro ? (
        <p className="mt-2 max-w-[60ch] px-1 text-[16px] leading-relaxed text-mute" data-testid="specialty-intro">
          {intro}
        </p>
      ) : null}
      {counts ? (
        <p className="mt-2 px-1 text-[13px] text-mute tabular-nums" data-testid="specialty-counts">
          {counts}
        </p>
      ) : null}
    </header>
  )
}
