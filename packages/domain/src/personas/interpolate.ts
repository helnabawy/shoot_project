import { joinList } from './conjunctions'
import type { Persona } from './types'

export const PERSONA_PLACEHOLDERS = [
  'persona.singular',
  'persona.plural',
  'personas.list',
  'personas.listAnd',
] as const

/**
 * Replaces persona placeholders in CMS copy (FR-028, FR-041):
 * {persona.singular} / {persona.plural} use the first persona;
 * {personas.list} / {personas.listAnd} join every persona's singular name, lower-cased in
 * languages that have case. Unknown tokens are left verbatim so editors can spot them.
 */
export function interpolatePersonaCopy(
  template: string,
  personaOrList: Persona | readonly Persona[],
  options: { locale?: string } = {},
): string {
  const locale = options.locale ?? 'en'
  const list = Array.isArray(personaOrList) ? personaOrList : [personaOrList as Persona]
  const first = list[0]
  const names = list.map((p) => p.singular.toLocaleLowerCase(locale))
  const values: Record<string, string> = {
    'persona.singular': first?.singular ?? '',
    'persona.plural': first?.plural ?? '',
    'personas.list': joinList(names, 'or', locale),
    'personas.listAnd': joinList(names, 'and', locale),
  }
  return template.replace(/\{([a-zA-Z.]+)\}/g, (match, token: string) => values[token] ?? match)
}
