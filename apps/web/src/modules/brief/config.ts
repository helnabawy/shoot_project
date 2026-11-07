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
        sentenceLabel: p.singular.toLocaleLowerCase(locale),
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
