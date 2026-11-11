const EXTERNAL = /^(https?:\/\/|mailto:|tel:)/i

/** Removes a language prefix from a site path: "/ar/guides/x" → "/guides/x", "/ar" → "/". */
export function stripLocalePrefix(path: string): string {
  const rest = path.replace(/^\/(ar|en)(?=\/|$|\?|#)/, '')
  return rest.startsWith('/') ? rest : `/${rest}`
}

/**
 * The one safe-link rule for long-form text (FR-013, 005 FR-015), shared by the website's
 * `RichContent` and the mobile API's rich text:
 * - a site path (`/…`, not `//` or `/\`) stays a path, without its language prefix;
 * - `http(s):`, `mailto:` and `tel:` addresses are kept;
 * - anything else (`javascript:`, `data:`, `//host`, empty) gives `null`: the link's text is shown plain.
 */
export function linkTarget(url: string | null | undefined): string | null {
  const value = (url ?? '').trim()
  if (!value) return null
  if (value.startsWith('/')) {
    if (value.startsWith('//') || value.startsWith('/\\')) return null
    return stripLocalePrefix(value)
  }
  return EXTERNAL.test(value) ? value : null
}
