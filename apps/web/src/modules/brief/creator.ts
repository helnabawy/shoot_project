import type { BriefBuilderConfig, BuilderSlot } from './types'

/** A creator the brief is being sent to, as the builder shows and posts it (feature 002, research §11). */
export interface CreatorBooking {
  /** Stored code, posted as the hidden `creator` field. */
  code: string
  /** With the brand prefix: "CR-7K4Q2". */
  displayCode: string
  name: string
  initials: string
  photo: { url: string; alt: string; width?: number; height?: number } | null
  /** Where "Change" leads: the normal, creator-free brief. */
  changeHref: string
}

const personaSlot = (config: BriefBuilderConfig): BuilderSlot | undefined => config.slots.find((s) => s.kind === 'persona')

/**
 * The builder for one creator: the professional step lists only the creator's types, and with a
 * single type that step is answered and locked. Null when none of the creator's types is on offer,
 * so there is nothing to book. Nothing is pre-selected for a creator with several types (FR-067).
 */
export function configForCreator(
  config: BriefBuilderConfig,
  personaSlugs: readonly string[],
): { config: BriefBuilderConfig; locked: { token: string; value: string } | null } | null {
  const slot = personaSlot(config)
  if (!slot) return { config, locked: null }
  const options = slot.options.filter((o) => personaSlugs.includes(o.value))
  if (options.length === 0) return null
  const slots = config.slots.map((s) => (s === slot ? { ...s, options } : s))
  const only = options.length === 1 ? options[0] : undefined
  return { config: { ...config, slots }, locked: only ? { token: slot.token, value: only.value } : null }
}

/** Chosen professional types the creator does not offer. */
export const personasOutside = (chosen: readonly string[], allowed: readonly string[]): string[] =>
  chosen.filter((slug) => !allowed.includes(slug))

/** A copy of the form with the only type of a single-type creator filled in when the visitor sent none. */
export function fillCreatorPersona(form: FormData, config: BriefBuilderConfig, allowed: readonly string[]): FormData {
  const copy = new FormData()
  for (const [key, value] of form.entries()) copy.append(key, value)
  const slot = personaSlot(config)
  if (slot && allowed.length === 1 && form.getAll(slot.token).every((v) => String(v) === '')) copy.set(slot.token, allowed[0] as string)
  return copy
}
