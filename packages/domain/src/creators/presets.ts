/**
 * 011 FR-036: on "book this creator", a brief step that filters creators (today "shot by") starts on
 * the one option the creator matches. Only the brief answer leaves the server, never the creator data
 * behind it (002 FR-011 keeps the gender private; step 2's filtering already implies the answer).
 */
export interface PresetSlot {
  token: string
  filtersCreators?: boolean | null
  options: { value: string; matchesAny?: boolean | null; active?: boolean | null }[]
}

/** Slot token → the option value to start on, for each filtering slot with exactly one match. */
export function briefPresets(slots: readonly PresetSlot[], matchValues: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const slot of slots) {
    if (!slot.filtersCreators) continue
    const matched = slot.options.filter((o) => o.active !== false && !o.matchesAny && matchValues.includes(o.value))
    if (matched.length === 1) out[slot.token] = matched[0]!.value
  }
  return out
}
