import 'server-only'
import { groupFooter, orderHeader, type PlacementPage } from '@shoot/domain/pages'
import type { Where } from 'payload'
import type { Page } from '@/payload-types'
import { cachedQuery } from '@/shared/lib/cache'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { getLegalLinks } from '../legal'
import { getSiteSettings } from '../site-settings/queries'

export type PageKind = 'standard' | 'intent'

export interface PageResult {
  status: 'found'
  page: Page
  /** Each language's address of this page (Arabic falls back to English), for alternates. */
  slugs: { en: string; ar: string }
}

/** The visitor should be sent to this site path instead (the address changed or belongs to the other language). */
export interface PageRedirect {
  status: 'redirect'
  redirectTo: string
}

const base = (kind: PageKind) => (kind === 'intent' ? '/hire' : '')
const OTHER: Record<Locale, Locale> = { en: 'ar', ar: 'en' }

async function slugsOf(id: number): Promise<{ en: string; ar: string }> {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'pages', id, locale: 'all', fallbackLocale: false, depth: 0, overrideAccess: true, select: { slug: true } })
  const slug = (doc.slug ?? {}) as unknown as Partial<Record<Locale, string>>
  const en = slug.en ?? ''
  return { en, ar: slug.ar || en }
}

/**
 * Finds the page behind `/slug` (or `/hire/slug`) for a visitor reading `locale`.
 * Lookup order: the visitor's own address, the other language's address (answered with a redirect),
 * then earlier addresses of a renamed page (also a redirect). Drafts only with `draft` (preview).
 */
export async function getPageBySlug(
  slug: string,
  locale: Locale,
  { kind = 'standard', draft = false }: { kind?: PageKind; draft?: boolean } = {},
): Promise<PageResult | PageRedirect | null> {
  const run = async () => {
    const payload = await getPayloadClient()
    const read = { depth: 2, draft, overrideAccess: draft, limit: 1, pagination: false as const }
    const withKind = (extra: Where): Where => ({ and: [{ kind: { equals: kind } }, extra] })

    const own = await payload.find({ collection: 'pages', where: withKind({ slug: { equals: slug } }), locale, fallbackLocale: 'en', ...read })
    const found = own.docs[0]
    if (found) return { status: 'found' as const, page: found, slugs: await slugsOf(found.id) }

    // The address of the other language: send the visitor to this language's address of the same page.
    const other = await payload.find({ collection: 'pages', where: withKind({ slug: { equals: slug } }), locale: OTHER[locale], fallbackLocale: false, ...read, depth: 0 })
    if (other.docs[0]) {
      const slugs = await slugsOf(other.docs[0].id)
      const mine = slugs[locale]
      if (mine && mine !== slug) return { status: 'redirect' as const, redirectTo: `${base(kind)}/${mine}` }
      // No address of its own in this language yet: it is served at the other language's address, in this language's words.
      const page = await payload.findByID({ collection: 'pages', id: other.docs[0].id, locale, fallbackLocale: 'en', depth: 2, draft, overrideAccess: draft })
      return { status: 'found' as const, page, slugs }
    }

    const renamed = await payload.find({
      collection: 'pages',
      where: withKind({ and: [{ 'previousSlugs.slug': { equals: slug } }, { 'previousSlugs.locale': { equals: locale } }] }),
      locale,
      fallbackLocale: 'en',
      ...read,
      depth: 0,
    })
    if (renamed.docs[0]?.slug && renamed.docs[0].slug !== slug) return { status: 'redirect' as const, redirectTo: `${base(kind)}/${renamed.docs[0].slug}` }
    return null
  }
  return cachedQuery(['pages', 'categories', 'option-sets', 'media'], ['page', kind, locale, slug], run, { bypass: draft })
}

export interface NavigationLink {
  label: string
  /** Site path without the language prefix. */
  href: string
}

export interface Navigation {
  header: NavigationLink[]
  footerGroups: { key: string; label: string; links: NavigationLink[] }[]
  legal: NavigationLink[]
}

/** Header pages, footer groups and legal links for the page chrome, from one cached read. */
export async function getNavigation(locale: Locale): Promise<Navigation> {
  // The legal links depend on the clock (a version can begin later), so they are read outside the cache.
  const [navigation, legal] = await Promise.all([getPageNavigation(locale), getLegalLinks(locale)])
  return { ...navigation, legal: legal.map((l) => ({ label: l.label, href: l.href })) }
}

function getPageNavigation(locale: Locale): Promise<Navigation> {
  return cachedQuery(['pages', 'site-settings'], ['navigation', locale], async () => {
    const payload = await getPayloadClient()
    const [settings, { docs }] = await Promise.all([
      getSiteSettings(locale),
      payload.find({
        collection: 'pages',
        where: { and: [{ kind: { equals: 'standard' } }, { _status: { equals: 'published' } }] },
        locale,
        fallbackLocale: 'en',
        depth: 0,
        limit: 200,
        pagination: false,
        overrideAccess: false,
        select: { title: true, slug: true, placement: true },
      }),
    ])
    const hrefs = new Map(docs.map((d) => [String(d.id), `/${d.slug}`]))
    const placements: PlacementPage[] = docs
      .filter((d) => d.slug)
      .map((d) => ({
        id: String(d.id),
        title: d.title,
        label: d.placement?.navLabel,
        inHeader: Boolean(d.placement?.inHeader),
        footerGroup: d.placement?.footerGroup || null,
        order: d.placement?.order ?? 100,
      }))
    const link = (item: { id: string; label: string }): NavigationLink => ({ label: item.label, href: hrefs.get(item.id) as string })
    return {
      header: orderHeader(placements).map(link),
      footerGroups: groupFooter(
        placements,
        (settings.footerGroups ?? []).map((g) => ({ key: g.key, label: g.label })),
      ).map((g) => ({ key: g.key, label: g.label, links: g.links.map(link) })),
      legal: [],
    }
  })
}

export interface PageForSitemap {
  kind: PageKind
  slugs: { en: string; ar: string }
  hideFromSearch: boolean
}

/** Every published page with its address in both languages, for the sitemap. */
export async function listPagesForSitemap(): Promise<PageForSitemap[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    locale: 'all',
    fallbackLocale: false,
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: false,
    select: { slug: true, kind: true, seo: true },
  })
  return docs.flatMap((d) => {
    const slug = (d.slug ?? {}) as unknown as Partial<Record<Locale, string>>
    if (!slug.en) return []
    return [{ kind: d.kind as PageKind, slugs: { en: slug.en, ar: slug.ar || slug.en }, hideFromSearch: Boolean(d.seo?.hideFromSearch) }]
  })
}

/** True when `path` (without language prefix) used to be a page or article (spec US5). */
export async function isRemovedPath(locale: Locale, path: string): Promise<boolean> {
  const payload = await getPayloadClient()
  const { totalDocs } = await payload.count({
    collection: 'removed-paths',
    where: { and: [{ locale: { equals: locale } }, { path: { equals: path } }] },
    overrideAccess: true,
  })
  return totalDocs > 0
}
