import 'server-only'
import { classifyPath, strippedPath, type ClassifiedPath, type ResolveV1 } from '@shoot/domain/api/v1'
import type { LegalKind } from '@shoot/domain/pages'
import { getCreatorByCode, getSpecialtyPage } from '@/modules/creators'
import { getArticle, getAuthor, listCategories } from '@/modules/guides'
import { getLegalDocument, getLegalVersion } from '@/modules/legal'
import type { Locale } from '@/shared/lib/locale'
import { getIntentPage } from './intent'
import { getPageBySlug, isRemovedPath } from './queries'

type Found = { path: string; params?: Record<string, string> } | null

function decoded(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** A page by its address in either language or an earlier one, followed once to its current address. */
async function currentPage(slug: string, locale: Locale): Promise<Found> {
  let result = await getPageBySlug(slug, locale, { kind: 'standard' })
  if (result?.status === 'redirect') result = await getPageBySlug(result.redirectTo.replace(/^\//, ''), locale, { kind: 'standard' })
  return result?.status === 'found' ? { path: `/${result.slugs[locale]}`, params: { slug: result.slugs[locale] } } : null
}

async function currentIntent(slug: string, locale: Locale): Promise<Found> {
  let found = await getIntentPage(slug, locale)
  if (found?.status === 'redirect') found = await getIntentPage(found.redirectTo.replace(/^\/hire\//, ''), locale)
  return found?.status === 'found' ? { path: `/hire/${found.slugs[locale]}`, params: { slug: found.slugs[locale] } } : null
}

/**
 * Whether the place exists, and its current address (research R12). Private places are never looked
 * up (FR-029): the app shows them after its own checks.
 */
async function lookUp(place: ClassifiedPath, locale: Locale, now: Date): Promise<Found> {
  const p = place.params
  switch (place.kind) {
    case 'route':
    case 'private':
      return { path: place.path }
    case 'creator':
    case 'book': {
      const found = await getCreatorByCode(p.code as string, locale)
      if (!found || (place.kind === 'book' && !found.canBook)) return null
      const code = found.creator.code.toLowerCase()
      return { path: `/${place.kind === 'book' ? 'book' : 'creators'}/${code}`, params: { code } }
    }
    case 'specialty':
      return (await getSpecialtyPage(p.specialty as string, locale)) ? { path: place.path } : null
    case 'hire':
      return currentIntent(p.slug as string, locale)
    case 'guide':
      return (await getArticle(p.slug as string, locale, { now })) ? { path: place.path } : null
    case 'guideCategory':
      return (await listCategories(locale, now)).some((c) => c.slug === p.slug) ? { path: place.path } : null
    case 'guideAuthor':
      return (await getAuthor(p.slug as string, locale, now)) ? { path: place.path } : null
    case 'legal': {
      const kind = p.kind as LegalKind
      const found = p.view === 'version' ? await getLegalVersion(kind, Number(p.version), locale) : await getLegalDocument(kind, locale, { now })
      return found ? { path: place.path } : null
    }
    case 'page':
      return currentPage(p.slug as string, locale)
  }
}

/** Which app place a website address is: a page (with its current address), removed, or not found. */
export async function resolvePath(path: string, negotiated: Locale, now: Date): Promise<ResolveV1> {
  const place = classifyPath(path)
  const stripped = strippedPath(path)
  const locale: Locale = stripped.locale ?? negotiated
  if (place) {
    const found = await lookUp(place, locale, now)
    if (found) return { status: 'page', kind: place.kind, path: found.path, locale, params: found.params ?? place.params }
  }
  const removed = await isRemovedPath(locale, decoded(stripped.path)).catch(() => false)
  return { status: removed ? 'removed' : 'notFound', path: stripped.path, locale }
}
