import type { ReactNode } from 'react'
import { ForwardIcon, ReturnIcon } from '../icons'
import { cx } from './cx'
import { GlyphTile } from './GlyphTile'
import { KeyHint } from './KeyHint'

/** The Top Hit's look without its column template, so a creator Top Hit can lead with a photo tile. */
export const topHitBase =
  'mx-2 grid min-h-[50px] w-[calc(100%-16px)] items-center gap-3 rounded-[var(--radius-row)] bg-primary px-3 py-2.5 text-start text-[17px] font-semibold leading-snug text-on-primary transition-[background-color,transform] duration-100 hover:bg-primary-hover motion-safe:active:scale-[0.99] disabled:cursor-progress disabled:opacity-80 focus-visible:outline-offset-2'
const topHitClass = `${topHitBase} grid-cols-[30px_minmax(0,1fr)_auto]`

function Inner({ label, glyph, hint }: { label: ReactNode; glyph?: ReactNode; hint?: ReactNode }) {
  return (
    <>
      <GlyphTile tone="accent">{glyph ?? <ForwardIcon width={16} height={16} />}</GlyphTile>
      <span className="min-w-0">{label}</span>
      {hint ?? (
        <KeyHint className="border-white/40">
          <ReturnIcon width={13} height={13} />
        </KeyHint>
      )}
    </>
  )
}

/** The one red row (`primary`): the primary action of a panel (FR-056). */
export function TopHit({
  label,
  glyph,
  hint,
  href,
  external,
  pending,
  testId,
  className,
  name,
  value,
  form,
  onClick,
}: {
  label: ReactNode
  glyph?: ReactNode
  hint?: ReactNode
  href?: string
  external?: boolean
  pending?: boolean
  testId?: string
  className?: string
  name?: string
  value?: string
  /** The id of the form this button submits, when it sits outside that form's element. */
  form?: string
  /** Makes it a plain button that moves the flow on instead of submitting (FR-064). */
  onClick?: () => void
}) {
  if (href) {
    return (
      <a
        href={href}
        data-testid={testId}
        className={cx(topHitClass, className)}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        <Inner label={label} glyph={glyph} hint={hint} />
      </a>
    )
  }
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      data-testid={testId}
      disabled={pending}
      aria-busy={pending || undefined}
      name={name}
      value={value}
      form={form}
      className={cx(topHitClass, className)}
    >
      <Inner label={label} glyph={glyph} hint={hint} />
    </button>
  )
}
