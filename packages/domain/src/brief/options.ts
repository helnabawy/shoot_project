export interface BriefOption {
  value: string
  label: string
  order: number
  active: boolean
  /** Persona ids the option applies to; empty means every persona. */
  personas: string[]
}

/**
 * Options to show for a slot given the selected professional type (FR-048). With several
 * types chosen, an option shows when it applies to any of them (FR-063).
 */
export function optionsForSlot(options: readonly BriefOption[], persona: string | readonly string[] | null | undefined): BriefOption[] {
  const chosen: readonly string[] = persona == null ? [] : typeof persona === 'string' ? [persona] : persona
  return options
    .filter((o) => o.active && (o.personas.length === 0 || o.personas.some((p) => chosen.includes(p))))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
}
