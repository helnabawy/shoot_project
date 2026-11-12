import { joinMultiValue } from '@shoot/domain/brief/validate'
import type { BriefRecordV1 } from '@shoot/domain/api/v1'
import type { BriefBuilderConfig } from '../types'

export type Answers = { values: Record<string, string>; custom: Record<string, boolean> }

/** What `validateBrief` says, as a v1 problem code: the app owns the words (008 research R6). */
export const PROBLEM_FOR: Record<string, 'brief.errors.required' | 'brief.errors.pastDate' | 'brief.errors.optionGone'> = {
  'brief.errors.required': 'brief.errors.required',
  'brief.errors.datePast': 'brief.errors.pastDate',
  'brief.errors.dateInvalid': 'brief.errors.pastDate',
  'brief.errors.notAnOption': 'brief.errors.optionGone',
}

/**
 * Turns the wire selections into one value per slot (a multiple slot's values joined in pick order).
 * An unknown token is reported, never ignored: the app and the CMS disagree, so that step reopens.
 */
export function toAnswers(config: BriefBuilderConfig, input: BriefRecordV1): { ok: true; answers: Answers } | { ok: false; token: string } {
  const known = new Set(config.slots.map((s) => s.token))
  const unknown = input.selections.find((s) => !known.has(s.token))
  if (unknown) return { ok: false, token: unknown.token }
  const values: Record<string, string> = {}
  const custom: Record<string, boolean> = {}
  for (const slot of config.slots) {
    const picked = input.selections.filter((s) => s.token === slot.token).map((s) => s.value)
    if (slot.kind === 'date') values[slot.token] = input.date ?? ''
    else values[slot.token] = slot.multiple ? joinMultiValue(picked) : (picked[0] ?? '')
    custom[slot.token] = false
  }
  return { ok: true, answers: { values, custom } }
}
