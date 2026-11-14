import { z } from 'zod'
import type { LegalKind } from '../../pages/legal'
import { localeV1, sitePathV1, type LocaleV1 } from './common'

/**
 * The resolver (research R12, data-model.md "Resolve"): which app place a website address is. The
 * pattern table mirrors `apps/web/src/app/(site)/[locale]/`; a drift test in the web app checks
 * that every page route maps to one.
 */

/** The longest path the resolver accepts. */
export const RESOLVE_PATH_MAX = 512

/** True for a path the resolver may classify: site-relative, no `..`, no query or fragment. */
export function isResolvablePath(path: string): boolean {
  if (path.length === 0 || path.length > RESOLVE_PATH_MAX) return false
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return false
  if (/[?#\s]/.test(path) || /:\/\//.test(path)) return false
  return !path.split('/').some((segment) => segment === '..' || segment === '.')
}

export const resolveRequestV1 = z.object({
  query: z.object({ path: z.string().refine(isResolvablePath) }),
})

export const PLACE_KINDS = ['route', 'page', 'hire', 'creator', 'book', 'specialty', 'guide', 'guideCategory', 'guideAuthor', 'legal', 'private'] as const
/** New kinds are additive; the app maps a kind it does not know to "unknown". */
export const placeKindV1 = z.enum(PLACE_KINDS)
export type PlaceKindV1 = z.infer<typeof placeKindV1>

export const resolveV1 = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('page'),
    kind: placeKindV1,
    /** The current address in the answer's language, without the `/ar` prefix. */
    path: sitePathV1,
    locale: localeV1,
    params: z.record(z.string(), z.string()),
  }),
  z.object({ status: z.literal('removed'), path: sitePathV1, locale: localeV1 }),
  z.object({ status: z.literal('notFound'), path: sitePathV1, locale: localeV1 }),
])
export type ResolveV1 = z.infer<typeof resolveV1>

export interface ClassifiedPath {
  kind: PlaceKindV1
  params: Record<string, string>
  /** `ar` when the path started with `/ar`, else `null` (the negotiated locale applies). */
  locale: LocaleV1 | null
  /** The path without its `/ar` prefix and trailing slash, `/` for the home page. */
  path: string
}

/** First path segments that belong to a route of their own, so `/:slug` never claims them. */
const RESERVED = new Set(['creators', 'book', 'work', 'hire', 'guides', 'terms', 'privacy', 'match', 'q', 'account', 'login', 'register', 'ar', 'en'])

const ROUTES = new Set(['', 'creators', 'guides', 'login', 'login/code', 'register'])

const LEGAL_BASE: Record<string, LegalKind> = { terms: 'terms', 'terms/professional': 'professional-terms', privacy: 'privacy' }

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

/** The kind and params of a legal address (`/terms`, `/terms/versions`, `/terms/versions/3`, …). */
function classifyLegal(segments: string[]): Pick<ClassifiedPath, 'kind' | 'params'> | null {
  const professional = segments[0] === 'terms' && segments[1] === 'professional'
  // Only called for `terms` and `privacy`, so the base is always in the table.
  const kind = LEGAL_BASE[professional ? 'terms/professional' : (segments[0] as string)] as LegalKind
  const rest = segments.slice(professional ? 2 : 1)
  if (rest.length === 0) return { kind: 'legal', params: { kind, view: 'current' } }
  if (rest[0] !== 'versions' || rest.length > 2) return null
  if (rest.length === 1) return { kind: 'legal', params: { kind, view: 'versions' } }
  const version = rest[1] as string
  return /^[1-9]\d{0,5}$/.test(version) ? { kind: 'legal', params: { kind, view: 'version', version } } : null
}

function classifySegments(s: string[]): Pick<ClassifiedPath, 'kind' | 'params'> | null {
  const joined = s.join('/')
  if (ROUTES.has(joined)) return { kind: 'route', params: joined === '' ? {} : { route: `/${joined}` } }
  const [first, second, third, fourth] = s
  switch (first) {
    case 'creators':
      return s.length === 2 ? { kind: 'creator', params: { code: second as string } } : null
    case 'book':
      return s.length === 2 ? { kind: 'book', params: { code: second as string } } : null
    case 'work':
      return s.length === 2 ? { kind: 'specialty', params: { specialty: second as string } } : null
    case 'hire':
      return s.length === 2 ? { kind: 'hire', params: { slug: second as string } } : null
    case 'guides':
      if (s.length === 2) return { kind: 'guide', params: { slug: second as string } }
      if (s.length === 3 && second === 'category') return { kind: 'guideCategory', params: { slug: third as string } }
      if (s.length === 3 && second === 'author') return { kind: 'guideAuthor', params: { slug: third as string } }
      return null
    case 'terms':
    case 'privacy':
      return classifyLegal(s)
    // Private places are classified, never looked up (FR-029).
    case 'match':
      if (s.length === 3 || (s.length === 4 && fourth === 'details')) return { kind: 'private', params: { ref: second as string, key: third as string } }
      return null
    case 'q':
      return s.length === 3 ? { kind: 'private', params: { ref: second as string, key: third as string } } : null
    case 'account':
      return { kind: 'private', params: {} }
    default:
      return s.length === 1 && first !== undefined && !RESERVED.has(first) ? { kind: 'page', params: { slug: first } } : null
  }
}

/** Which app place `path` is, or `null` for an address the website has no route for. */
export function classifyPath(path: string): ClassifiedPath | null {
  if (!isResolvablePath(path)) return null
  const { path: stripped, locale } = strippedPath(path)
  const found = classifySegments(stripped.split('/').filter((segment) => segment.length > 0).map(decode))
  return found ? { ...found, locale, path: stripped } : null
}

/** The address without its `/ar` prefix or trailing slash (still percent-encoded), and the prefix's locale. */
export function strippedPath(path: string): { path: string; locale: LocaleV1 | null } {
  const segments = path.split('/').filter((segment) => segment.length > 0)
  if (segments[0] === 'ar') return { path: `/${segments.slice(1).join('/')}`, locale: 'ar' }
  return { path: `/${segments.join('/')}`, locale: null }
}
