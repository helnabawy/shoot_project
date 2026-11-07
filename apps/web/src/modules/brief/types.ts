import type { SlotKind } from '@shoot/domain/brief'

/** Serializable brief-builder config handed to the client island. */
export interface BuilderOption {
  value: string
  /** Shown in the row ("Photographer", "an event"). */
  label: string
  /** Printed into the sentence ("photographer"). */
  sentenceLabel: string
  glyph?: string | null
  /** Persona slugs the option applies to; empty means every persona. */
  personas: string[]
}

export interface BuilderSlot {
  token: string
  kind: SlotKind
  groupLabel: string
  placeholder: string
  defaultValue: string
  required: boolean
  allowCustom: boolean
  /** The visitor may pick several options (professional slot only, FR-063). */
  multiple: boolean
  options: BuilderOption[]
}

export interface BriefBuilderConfig {
  locale: string
  sentence: string
  slots: BuilderSlot[]
  submitLabel: string
  helperText: string
  whatsappTemplate: string
  successMessage: string
  steps: { title: string; description: string }[]
}

export type BriefState =
  | { status: 'idle' }
  | { status: 'error'; errors: Record<string, string>; formError?: string }
  | { status: 'ok'; reference: string; whatsappUrl: string; sentence: string; replyTime: string; /** Step 2 of Quick Match, when it is on (feature 003). */ matchUrl?: string }
