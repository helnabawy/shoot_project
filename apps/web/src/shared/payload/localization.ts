export { DEFAULT_LOCALE, LOCALES } from '../lib/locale'

type Json = unknown

const isLocaleMap = (value: Json): value is Record<string, Json> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && 'en' in value && Object.keys(value).every((k) => /^[a-z]{2}$/.test(k))

function isEmpty(value: Json): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (typeof value === 'object' && value !== null && 'root' in value) {
    return !JSON.stringify(value).match(/"text":"[^"]*\S[^"]*"/)
  }
  return false
}

/**
 * Lists the dotted paths of localised fields that have English content but nothing in `locale`
 * (FR-038). Input is a document read with `locale: 'all'`, where each localised field is a
 * { en, ar } map.
 */
export function findUntranslatedFields(docAll: Json, locale: string, path = ''): string[] {
  if (isLocaleMap(docAll)) {
    return !isEmpty(docAll.en) && isEmpty(docAll[locale]) ? [path] : []
  }
  if (Array.isArray(docAll)) {
    return docAll.flatMap((item, i) => findUntranslatedFields(item, locale, path ? `${path}.${i}` : String(i)))
  }
  if (typeof docAll === 'object' && docAll !== null && !('root' in docAll)) {
    return Object.entries(docAll).flatMap(([key, value]) =>
      key === 'id' || key.startsWith('_') ? [] : findUntranslatedFields(value, locale, path ? `${path}.${key}` : key),
    )
  }
  return []
}
