import type { BriefBuilderConfig } from './types'

/** What an intent page asks the brief builder to start with (feature 005, research R12). */
export interface IntentPreset {
  /** Slug of the professional type. */
  persona?: string | null
  /** Slug of the specialty; applied when a step offers an option with that value. */
  specialty?: string | null
  /** Slug of the location; applied when a step offers an option with that value. */
  location?: string | null
  /** Explicit answers for other steps, by the step's token. */
  extra?: readonly { token?: string | null; value?: string | null }[]
}

export type DropReason = 'unknownStep' | 'unknownOption' | 'inactivePersona'

export interface DroppedPreset {
  token: string
  value: string
  reason: DropReason
}

/**
 * The answers the builder starts with, keyed by step token, and the answers the editor chose that
 * can no longer be applied (a persona switched off, an option removed). Never throws, so the
 * builder is always usable: a dropped answer simply leaves its step open.
 *
 * The professional type and explicit `extra` answers are reported when dropped; the specialty and
 * location are applied when a step offers a matching option and quietly skipped otherwise.
 */
export function resolvePresets(config: BriefBuilderConfig, intent: IntentPreset): { values: Record<string, string>; dropped: DroppedPreset[] } {
  const values: Record<string, string> = {}
  const dropped: DroppedPreset[] = []
  const offers = (token: string, value: string) => config.slots.find((s) => s.token === token)?.options.some((o) => o.value === value) ?? false

  const personaSlot = config.slots.find((s) => s.kind === 'persona')
  if (intent.persona) {
    if (personaSlot && offers(personaSlot.token, intent.persona)) values[personaSlot.token] = intent.persona
    else dropped.push({ token: personaSlot?.token ?? 'persona', value: intent.persona, reason: 'inactivePersona' })
  }

  for (const value of [intent.specialty, intent.location]) {
    if (!value) continue
    const slot = config.slots.find((s) => s.kind === 'options' && s.options.some((o) => o.value === value))
    if (slot && values[slot.token] === undefined) values[slot.token] = value
  }

  for (const item of intent.extra ?? []) {
    if (!item.token || !item.value) continue
    const slot = config.slots.find((s) => s.token === item.token)
    if (!slot) dropped.push({ token: item.token, value: item.value, reason: 'unknownStep' })
    else if (slot.kind === 'persona' || slot.kind === 'options' ? !offers(slot.token, item.value) : false) dropped.push({ token: item.token, value: item.value, reason: 'unknownOption' })
    else values[slot.token] = item.value
  }
  return { values, dropped }
}
