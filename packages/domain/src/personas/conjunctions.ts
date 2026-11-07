/** How lists are joined per language. Adding a language means adding one entry here. */
interface ListStyle {
  separator: string
  or: string
  and: string
  /** Arabic "و" attaches to the following word without a space. */
  attachAnd: boolean
}

export const LIST_STYLES: Record<string, ListStyle> = {
  en: { separator: ', ', or: 'or', and: 'and', attachAnd: false },
  ar: { separator: '، ', or: 'أو', and: 'و', attachAnd: true },
}

export function listStyleFor(locale: string): ListStyle {
  return LIST_STYLES[locale] ?? (LIST_STYLES.en as ListStyle)
}

/** "a", "a or b", "a, b or c" (and the Arabic equivalents). */
export function joinList(items: readonly string[], kind: 'or' | 'and', locale = 'en'): string {
  const style = listStyleFor(locale)
  if (items.length === 0) return ''
  if (items.length === 1) return items[0] as string
  const head = items.slice(0, -1).join(style.separator)
  const last = items[items.length - 1] as string
  const word = style[kind]
  const tail = kind === 'and' && style.attachAnd ? `${word}${last}` : `${word} ${last}`
  return `${head} ${tail}`
}
