/** A seed value that differs per language. */
export type L<T = string> = { en: T; ar: T }

const isLocalized = (value: unknown): value is L<unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).sort().join() === 'ar,en'

/** Resolves every { en, ar } leaf in a seed tree to one language. */
export function pickLocale<T>(tree: T, locale: 'en' | 'ar'): unknown {
  if (isLocalized(tree)) return tree[locale]
  if (Array.isArray(tree)) return tree.map((item) => pickLocale(item, locale))
  if (tree && typeof tree === 'object') {
    return Object.fromEntries(Object.entries(tree).map(([k, v]) => [k, pickLocale(v, locale)]))
  }
  return tree
}

/**
 * Copies row ids from a saved document into the Arabic pass, so localised fields inside arrays
 * and blocks update the same rows instead of creating new ones.
 */
export function withRowIds(data: unknown, saved: unknown): unknown {
  if (Array.isArray(data)) {
    const rows = Array.isArray(saved) ? saved : []
    return data.map((item, i) => {
      const merged = withRowIds(item, rows[i]) as Record<string, unknown>
      const id = (rows[i] as { id?: unknown } | undefined)?.id
      return id !== undefined && merged && typeof merged === 'object' ? { ...merged, id } : merged
    })
  }
  if (data && typeof data === 'object' && !isLexical(data)) {
    const source = (saved ?? {}) as Record<string, unknown>
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, withRowIds(v, source[k])]))
  }
  return data
}

const isLexical = (value: object) => 'root' in value

/** Minimal Lexical rich-text value with one paragraph per line. */
export function richText(text: string, direction: 'ltr' | 'rtl' = 'ltr') {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction,
      children: text.split('\n').map((line) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction,
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', text: line, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
      })),
    },
  }
}

export const rt = (en: string, ar: string): L<ReturnType<typeof richText>> => ({ en: richText(en), ar: richText(ar, 'rtl') })
