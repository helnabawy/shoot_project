import type { BriefBuilderV1 } from '@shoot/domain/api/v1'
import type { Locale } from '@/shared/lib/locale'
import type { BriefBuilderConfig } from './types'

/** The brief builder as the website's island gets it (`buildBriefConfig`); `null` when it is off (FR-023). */
export function toWireBriefBuilder(config: BriefBuilderConfig | null, locale: Locale): BriefBuilderV1 {
  if (!config) return { locale, builder: null }
  return {
    locale,
    builder: {
      sentence: config.sentence,
      slots: config.slots.map((slot) => ({
        token: slot.token,
        kind: slot.kind,
        groupLabel: slot.groupLabel,
        placeholder: slot.placeholder,
        defaultValue: slot.defaultValue,
        required: slot.required,
        allowCustom: slot.allowCustom,
        multiple: slot.multiple,
        options: slot.options.map((o) => ({
          value: o.value,
          label: o.label,
          sentenceLabel: o.sentenceLabel,
          glyph: o.glyph || null,
          personaSlugs: [...o.personas],
        })),
      })),
      submitLabel: config.submitLabel,
      helperText: config.helperText,
      whatsappTemplate: config.whatsappTemplate,
      successMessage: config.successMessage,
      steps: config.steps.map((s) => ({ title: s.title, description: s.description })),
    },
  }
}
