import { GlyphTile } from '@/shared/ui/bar'

/**
 * A section title on the profile editor, led by its step number in an ink tile (the order carries
 * meaning: it is the step in "Your profile, step by step"). The id is the steps list's link target.
 */
export function SectionHeading({ id, step, children }: { id: string; step: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <GlyphTile tone="ink" className="text-[13px] tabular-nums">
        {step}
      </GlyphTile>
      <h2 id={id} className="scroll-mt-24 text-[26px] font-bold leading-tight tracking-[-0.025em] text-balance text-ink sm:text-[30px]">
        {children}
      </h2>
    </div>
  )
}
