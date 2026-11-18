import { isolateLtr, withTimeToken } from '@shoot/domain/brief/time'
import type { LandingPage, OptionSet } from '@/payload-types'
import type { AudiencePersona } from '../personas/queries'
import type { BriefBuilderConfig, BuilderOption, BuilderSlot } from './types'

/**
 * Turns the published landing page and the active audience into the client config.
 * Pure, so it is unit-tested without a database.
 */
export function buildBriefConfig(landing: LandingPage, personas: AudiencePersona[], locale: string): BriefBuilderConfig | null {
  const builder = landing.briefBuilder
  if (!builder || builder.enabled === false || !builder.sentence) return null
  const slugById = new Map(personas.map((p) => [p.id, p.slug]))

  const slots: BuilderSlot[] = (builder.slots ?? []).map((slot) => {
    let options: BuilderOption[] = []
    if (slot.kind === 'persona') {
      options = personas.map((p) => ({
        value: p.slug,
        label: p.singular,
        sentenceLabel: lowerFor(p.singular, locale),
        glyph: p.glyph,
        personas: [],
      }))
    } else if (slot.kind === 'options' && slot.optionSet && typeof slot.optionSet === 'object') {
      const set = slot.optionSet as OptionSet
      options = (set.options ?? [])
        .filter((o) => o.active !== false)
        .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
        .map((o) => ({
          value: o.value,
          label: o.label,
          sentenceLabel: o.label,
          glyph: o.glyph,
          personas: (o.personas ?? [])
            .map((p) => slugById.get(String(typeof p === 'object' ? p.id : p)))
            .filter((s): s is string => Boolean(s)),
        }))
    }
    return {
      token: slot.token,
      kind: slot.kind,
      groupLabel: slot.groupLabel ?? slot.token,
      placeholder: slot.placeholder ?? '',
      defaultValue: slot.defaultValue ?? '',
      required: slot.required ?? false,
      allowCustom: slot.allowCustom ?? false,
      multiple: slot.kind === 'persona' && (slot.multiple ?? false),
      options,
    }
  })

  return {
    locale,
    sentence: builder.sentence,
    slots,
    submitLabel: builder.submitLabel ?? '',
    helperText: builder.helperText ?? '',
    whatsappTemplate: builder.whatsappTemplate ?? builder.sentence,
    successMessage: builder.successMessage ?? '',
    steps: (builder.steps ?? []).map((s) => ({ title: s.title, description: s.description ?? '' })),
  }
}

/** Locale-aware lower-casing that never throws on a malformed locale tag. */
function lowerFor(text: string, locale: string): string {
  try {
    return text.toLocaleLowerCase(locale)
  } catch {
    return text.toLocaleLowerCase()
  }
}

/** Feature 026: the start time step as the site settings set it, with the words already resolved. */
export interface BriefTimeSettings {
  enabled: boolean
  required: boolean
  /** The option set of times (populated), or an id / null when not chosen. */
  times: OptionSet | number | null | undefined
  groupLabel: string
  /** The words of the skip row and of an unset time ("any time"). */
  anyTime: string
  /** Joining words before the time in the sentence ("at"). */
  connector: string
}

/** The token of the time step; the owner's sentence never uses it for anything else (checked below). */
export const TIME_TOKEN = 'time'

/**
 * Adds the start time step right after the date (FR-002): a slot of kind `time`, the token in the sentence
 * and the WhatsApp template. Off, without an active time or without a date step, the same config comes back
 * (BT-US3-S1), so everything downstream is exactly as before.
 */
export function withBriefTime(config: BriefBuilderConfig, time: BriefTimeSettings): BriefBuilderConfig
export function withBriefTime(config: BriefBuilderConfig | null, time: BriefTimeSettings): BriefBuilderConfig | null
export function withBriefTime(config: BriefBuilderConfig | null, time: BriefTimeSettings): BriefBuilderConfig | null {
  if (!config || !time.enabled || !time.times || typeof time.times !== 'object') return config
  const dateIndex = config.slots.findIndex((s) => s.kind === 'date')
  const date = config.slots[dateIndex]
  if (!date || !config.sentence.includes(`{${date.token}}`) || config.slots.some((s) => s.token === TIME_TOKEN)) return config
  const options: BuilderOption[] = (time.times.options ?? [])
    .filter((o) => o.active !== false)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    .map((o) => ({ value: o.value, label: o.label, sentenceLabel: config.locale === 'ar' ? isolateLtr(o.label) : o.label, glyph: o.glyph, personas: [] }))
  if (!options.length) return config
  const slot: BuilderSlot = {
    token: TIME_TOKEN,
    kind: 'time',
    groupLabel: time.groupLabel,
    placeholder: time.anyTime,
    defaultValue: '',
    required: time.required,
    allowCustom: false,
    multiple: false,
    options,
  }
  const insert = (template: string) => withTimeToken(template, { dateToken: date.token, timeToken: TIME_TOKEN, connector: time.connector })
  return {
    ...config,
    sentence: insert(config.sentence),
    whatsappTemplate: insert(config.whatsappTemplate),
    slots: [...config.slots.slice(0, dateIndex + 1), slot, ...config.slots.slice(dateIndex + 1)],
  }
}
