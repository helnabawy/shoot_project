import { formatCreatorCode, type CreatorSummary } from '@shoot/domain/creators'
import { joinList as join } from '@shoot/domain/personas'
import { MAX_ROW_SPECIALTIES } from './constants'

/** Names resolved for one locale; ids not found are skipped (a deleted category never breaks a row). */
export interface Lookups {
  personas: ReadonlyMap<string, string>
  specialties: ReadonlyMap<string, string>
  /** Location id → name, for cities and emirates alike. */
  locations: ReadonlyMap<string, string>
}

/** One or two letters for the photo tile when a creator has no photo: first letters of the first two words. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toLocaleUpperCase()
}

const names = (ids: readonly string[], map: ReadonlyMap<string, string>) => ids.map((id) => map.get(id)).filter((n): n is string => Boolean(n))

export interface CreatorRowView {
  name: string
  displayCode: string
  initials: string
  /** "Photographer and videographer". */
  types: string
  /** "Dubai Marina" or "Dubai Marina +2"; empty when the creator lists no place. */
  place: string
  /** "Portrait, Wedding & engagement +1" (plain text, never pills); empty when none. */
  specialties: string
}

export function describeCreator(c: CreatorSummary, lookups: Lookups, prefix: string, locale: string): CreatorRowView {
  const places = names(c.locationIds, lookups.locations)
  const specialties = names(c.specialtyIds, lookups.specialties)
  const shown = specialties.slice(0, MAX_ROW_SPECIALTIES)
  const hiddenSpecialties = specialties.length - shown.length
  return {
    name: c.displayName,
    displayCode: formatCreatorCode(prefix, c.code),
    initials: initialsOf(c.displayName),
    types: join(names(c.personaIds, lookups.personas), 'and', locale),
    place: places.length > 1 ? `${places[0]} +${places.length - 1}` : (places[0] ?? ''),
    specialties: shown.join(locale === 'ar' ? '، ' : ', ') + (hiddenSpecialties > 0 ? ` +${hiddenSpecialties}` : ''),
  }
}
