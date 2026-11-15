import { decodeKeptBrief, isKeptBriefFresh, keptBriefMatches, KEPT_BRIEF_COOKIE, type KeptBrief } from '@shoot/domain/brief/kept'
import { joinMultiValue } from '@shoot/domain/brief/validate'
import { CUSTOM_SUFFIX, CUSTOM_VALUE } from './submit'
import type { BuilderSlot } from './types'

export interface RestoredAnswers {
  values: Record<string, string>
  custom: Record<string, string>
  skipped: Record<string, boolean>
  confirmed: Record<string, boolean>
}

/**
 * Feature 021 (FR-008): the builder's state for a kept brief, so a guest who comes back from sign-in
 * finds every answer they gave. An optional step with no answer was skipped; a step that waits for
 * "Continue" counts as continued. A step the page locks is left to the page.
 */
export function restoreAnswers(slots: readonly BuilderSlot[], kept: KeptBrief, lockedToken: string | null = null): RestoredAnswers {
  const result: RestoredAnswers = { values: {}, custom: {}, skipped: {}, confirmed: {} }
  const all = (name: string) => kept.entries.filter(([n]) => n === name).map(([, v]) => v)
  for (const slot of slots) {
    if (slot.token === lockedToken) continue
    const picked = all(slot.token)
    const typed = all(`${slot.token}${CUSTOM_SUFFIX}`)[0]?.trim() ?? ''
    let value: string
    if (slot.multiple) value = joinMultiValue(picked.filter(Boolean))
    else if (slot.allowCustom && typed && (picked[0] === CUSTOM_VALUE || !picked[0])) {
      value = CUSTOM_VALUE
      result.custom[slot.token] = typed
    } else value = picked[0] === CUSTOM_VALUE ? '' : (picked[0] ?? '')
    if (value) {
      result.values[slot.token] = value
      result.confirmed[slot.token] = true
    } else if (!slot.required) result.skipped[slot.token] = true
  }
  return result
}

/** The kept brief's cookie value in this browser while it is fresh, or null (the cookie is readable by design, R1). */
export function freshKeptCookie(cookie: string, now = new Date()): string | null {
  const raw = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${KEPT_BRIEF_COOKIE}=`))
    ?.slice(KEPT_BRIEF_COOKIE.length + 1)
  const kept = decodeKeptBrief(raw)
  return kept && isKeptBriefFresh(kept, now) ? raw! : null
}

/** The kept brief of [raw] when it belongs to this builder (same page, language and creator). */
export function keptForBuilder(raw: string | null, builder: { path: string; locale: string; creator?: string | null }): KeptBrief | null {
  const kept = decodeKeptBrief(raw)
  return kept && keptBriefMatches(kept, builder) ? kept : null
}
