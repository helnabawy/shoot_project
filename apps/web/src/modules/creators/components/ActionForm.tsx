'use client'

import { useTranslations } from 'next-intl'
import { createContext, useActionState, useContext, type ReactNode } from 'react'
import { cx } from '@/shared/ui/bar'
import { errorMessageKey } from '../errors'
import type { ProfileState } from '../actions'

type Action = (prev: ProfileState, form: FormData) => Promise<ProfileState>
const idle: ProfileState = { status: 'idle' }

/** Where a finished action says what it did, for screen readers (a polite live region owned by the list). */
/** The profile form's field errors by field name, for rows that sit inside it (sample captions). */
export const FieldErrorsContext = createContext<Record<string, string>>({})

export const AnnounceContext = createContext<(message: string) => void>(() => {})

/**
 * A one-button form for a provider action (pause, move a sample, remove): a hidden field set, a
 * submit button, and the action's error in one sentence beside it. It is a plain form without JavaScript.
 */
export function ActionForm({
  action,
  fields,
  className,
  buttonClass,
  children,
  testId,
  label,
  announce,
}: {
  action: Action
  fields: Record<string, string>
  className?: string
  buttonClass?: string
  children: ReactNode
  testId?: string
  /** The accessible name when the button shows only an icon. */
  label?: string
  /** Said politely when the action is sent (the list re-renders around it, so it cannot wait for the answer). */
  announce?: string
}) {
  const t = useTranslations('creators.err')
  const say = useContext(AnnounceContext)
  // The server action itself goes to `useActionState` (a wrapper would break the form without JavaScript).
  const [state, run, pending] = useActionState(action, idle)
  return (
    <form action={run} className={className} onSubmit={announce ? () => say(announce) : undefined}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} aria-busy={pending || undefined} aria-label={label} data-testid={testId} className={cx(buttonClass)}>
        {children}
      </button>
      {state.status === 'error' ? (
        <p role="alert" className="mt-1 rounded-md bg-attention px-2 py-1 text-[13px] text-on-attention">
          {t(errorMessageKey(state.formError ?? Object.values(state.errors)[0]) as never)}
        </p>
      ) : null}
    </form>
  )
}
