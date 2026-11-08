import { joinSentence, omitTokens, parseSentence } from '@shoot/domain/brief/sentence'
import { formatBriefDate, renderBriefMessage, type CreatorMessage, type ReferenceMessage } from '@shoot/domain/brief/message'
import { optionsForSlot } from '@shoot/domain/brief/options'
import { joinMultiValue, splitMultiValue, validateBrief, type SlotRule } from '@shoot/domain/brief/validate'
import { joinList } from '@shoot/domain/personas'
import type { BriefBuilderConfig, BuilderSlot } from './types'

export const CUSTOM_SUFFIX = '__custom'
export const CUSTOM_VALUE = '__custom'

export interface ParsedBrief {
  values: Record<string, string>
  custom: Record<string, boolean>
  labels: Record<string, string>
  /** Every professional type chosen, in the visitor's order (FR-063). */
  personaSlugs: string[]
  date: string | null
}

function personaSlot(config: BriefBuilderConfig): BuilderSlot | undefined {
  return config.slots.find((s) => s.kind === 'persona')
}

/** The professional types chosen so far: one, several (FR-063) or none. */
export function chosenPersonas(config: BriefBuilderConfig, values: Readonly<Record<string, string | undefined>>): string[] {
  const slot = personaSlot(config)
  const value = slot ? (values[slot.token] ?? '') : ''
  if (!slot) return []
  return slot.multiple ? splitMultiValue(value) : value ? [value] : []
}

/** Labels printed into the sentence for a slot's value; several are joined with the page language's "and". */
export function sentenceLabelFor(slot: BuilderSlot, value: string, locale: string): string {
  const label = (v: string) => slot.options.find((o) => o.value === v)?.sentenceLabel ?? v
  return slot.multiple ? joinList(splitMultiValue(value).map(label), 'and', locale) : label(value)
}

/** Reads one value per slot from the form: a picked option, or the visitor's own words. */
export function readSlotValues(config: BriefBuilderConfig, form: FormData): { values: Record<string, string>; custom: Record<string, boolean> } {
  const values: Record<string, string> = {}
  const custom: Record<string, boolean> = {}
  for (const slot of config.slots) {
    if (slot.multiple) {
      // Checkbox rows post one field per chosen value.
      values[slot.token] = joinMultiValue(form.getAll(slot.token).map(String))
      custom[slot.token] = false
      continue
    }
    const picked = String(form.get(slot.token) ?? '').trim()
    const typed = String(form.get(`${slot.token}${CUSTOM_SUFFIX}`) ?? '').trim()
    if (slot.allowCustom && typed && (picked === CUSTOM_VALUE || !picked)) {
      values[slot.token] = typed
      custom[slot.token] = true
    } else {
      values[slot.token] = picked === CUSTOM_VALUE ? '' : picked
      custom[slot.token] = false
    }
  }
  return { values, custom }
}

/** Validation rules for the current selection; options are limited to the chosen persona (FR-048). */
export function slotRules(
  config: BriefBuilderConfig,
  values: Record<string, string>,
  custom: Record<string, boolean> = {},
): SlotRule[] {
  const personas = chosenPersonas(config, values)
  return config.slots.map((slot) => {
    const allowed =
      slot.kind === 'persona'
        ? slot.options.map((o) => o.value)
        : slot.kind === 'options'
          ? optionsForSlot(
              slot.options.map((o, i) => ({ value: o.value, label: o.label, order: i, active: true, personas: o.personas })),
              personas,
            ).map((o) => o.value)
          : undefined
    // Typed words skip the option list; a picked option must still be one a chosen persona offers.
    return {
      token: slot.token,
      kind: slot.kind,
      required: slot.required,
      multiple: slot.multiple,
      allowCustom: slot.allowCustom && Boolean(custom[slot.token]),
      allowedValues: allowed,
    }
  })
}

/** Validates and resolves labels for the sentence and the WhatsApp message. */
export function parseBrief(
  config: BriefBuilderConfig,
  form: FormData,
  options: { today?: string } = {},
): { ok: true; brief: ParsedBrief } | { ok: false; errors: Record<string, string> } {
  return resolveBrief(config, readSlotValues(config, form), options)
}

/** Validates answers (one value per slot, and which were typed) and resolves their sentence labels. */
export function resolveBrief(
  config: BriefBuilderConfig,
  { values, custom }: { values: Record<string, string>; custom: Record<string, boolean> },
  options: { today?: string } = {},
): { ok: true; brief: ParsedBrief } | { ok: false; errors: Record<string, string> } {
  const errors = validateBrief(slotRules(config, values, custom), values, { today: options.today })
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const labels: Record<string, string> = {}
  let date: string | null = null
  for (const slot of config.slots) {
    const value = values[slot.token] ?? ''
    if (slot.kind === 'date') {
      date = value || null
      labels[slot.token] = value ? formatBriefDate(value, config.locale) : slot.placeholder
    } else if (custom[slot.token] || slot.kind === 'number') {
      labels[slot.token] = value || slot.placeholder
    } else {
      labels[slot.token] = value ? sentenceLabelFor(slot, value, config.locale) : slot.placeholder
    }
  }
  return {
    ok: true,
    brief: { values, custom, labels, personaSlugs: chosenPersonas(config, values), date },
  }
}

/** Leaves out optional parts the visitor did not set, with their joining words. */
const withoutUnset = (config: BriefBuilderConfig, template: string, values: Record<string, string>) =>
  joinSentence(omitTokens(parseSentence(template), (name) => !config.slots.find((s) => s.token === name)?.required && !values[name]))

/** The sentence as the visitor saw it. */
export const composeSentence = (config: BriefBuilderConfig, labels: Record<string, string>, values: Record<string, string> = {}) =>
  renderBriefMessage(withoutUnset(config, config.sentence, values), labels)

/** The WhatsApp message, worded the same way as the sentence; it names a creator (CP-US2-S2) and carries the brief ID (FR-055). */
export const composeMessage = (
  config: BriefBuilderConfig,
  labels: Record<string, string>,
  values: Record<string, string> = {},
  creator?: CreatorMessage,
  reference?: ReferenceMessage,
) => renderBriefMessage(withoutUnset(config, config.whatsappTemplate, values), labels, { creator, reference })

/** The finished brief as a WhatsApp message (FR-068), or null while it is incomplete or invalid. */
export function briefWhatsAppMessage(config: BriefBuilderConfig, answers: { values: Record<string, string>; custom: Record<string, boolean> }): string | null {
  const parsed = resolveBrief(config, answers)
  return parsed.ok ? composeMessage(config, parsed.brief.labels, parsed.brief.values) : null
}
