import { PERSONA_PLACEHOLDERS } from '../personas/interpolate'

export const KNOWN_PLACEHOLDERS: readonly string[] = [...PERSONA_PLACEHOLDERS]

/** Placeholders in CMS copy that nothing will replace, so editors can be warned. */
export function findUnknownPlaceholders(text: string, known: readonly string[] = KNOWN_PLACEHOLDERS): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(/\{([^{}\s]+)\}/g)) {
    const token = match[1] as string
    if (!known.includes(token)) found.add(token)
  }
  return [...found]
}
