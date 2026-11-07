import { normaliseCode } from '../creators/code'

/** One professional type and the creator chosen for it (null: "let us choose"). */
export interface Pick {
  persona: string
  code: string | null
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/
export const MAX_PICKS = 4

/** `?pick=photographer:D2222,videographer:any` → picks, or null when anything is malformed. */
export function parsePicks(input: string | null | undefined, max = MAX_PICKS): Pick[] | null {
  if (!input) return null
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0 || parts.length > max) return null
  const picks: Pick[] = []
  for (const part of parts) {
    const [persona = '', raw = ''] = part.split(':')
    if (!SLUG.test(persona) || picks.some((p) => p.persona === persona)) return null
    if (raw === 'any') {
      picks.push({ persona, code: null })
      continue
    }
    const code = normaliseCode(raw)
    if (!code) return null
    picks.push({ persona, code })
  }
  return picks
}

export function formatPicks(picks: readonly Pick[]): string {
  return picks.map((p) => `${p.persona}:${p.code ?? 'any'}`).join(',')
}

/** Replaces (or adds) the pick for one type, keeping the others. */
export function withPick(picks: readonly Pick[], next: Pick): Pick[] {
  return picks.some((p) => p.persona === next.persona) ? picks.map((p) => (p.persona === next.persona ? next : p)) : [...picks, next]
}
