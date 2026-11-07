import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Listed creators come from the database, so the sitemap is built per request, not at build time.
export const dynamic = 'force-dynamic'

type Entry = MetadataRoute.Sitemap[number]

/** One page of the site; `paths` when the address differs by language (pages with a localised slug). */
const entry = (path: string, priority: number, paths: { en: string; ar: string } = { en: path, ar: path }): Entry => {
  const en = `${base}${paths.en === '/' ? '' : paths.en}`
  return {
    url: en,
    changeFrequency: 'weekly',
    priority,
    alternates: { languages: { en, ar: `${base}/ar${paths.ar === '/' ? '' : paths.ar}` } },
  }
}

/** The guides: the listing, live articles, and the categories and authors that have one. */
async function listedGuides(): Promise<Entry[]> {
  try {
    const { listGuidesForSitemap } = await import('@/modules/guides')
    const guides = await listGuidesForSitemap()
    if (guides.articles.length === 0) return []
    return [
      entry('/guides', 0.6),
      ...guides.categories.map((slug) => entry(`/guides/category/${slug}`, 0.4)),
      ...guides.authors.map((slug) => entry(`/guides/author/${slug}`, 0.3)),
      ...guides.articles.filter((a) => !a.hideFromSearch).map((a) => entry(`/guides/${a.slug}`, 0.6)),
    ]
  } catch {
    return []
  }
}

/** The legal documents that have a version in force. */
async function listedLegal(): Promise<Entry[]> {
  try {
    const { getLegalLinks } = await import('@/modules/legal')
    return (await getLegalLinks('en')).map((link) => entry(link.href, 0.3))
  } catch {
    return []
  }
}

/** Editor-built pages and intent pages that are visible to search engines. */
async function listedPages(): Promise<Entry[]> {
  try {
    const { listPagesForSitemap } = await import('@/modules/pages')
    return (await listPagesForSitemap())
      .filter((p) => !p.hideFromSearch)
      .map((p) => {
        const prefix = p.kind === 'intent' ? '/hire' : ''
        return entry(`${prefix}/${p.slugs.en}`, p.kind === 'intent' ? 0.7 : 0.5, { en: `${prefix}/${p.slugs.en}`, ar: `${prefix}/${p.slugs.ar}` })
      })
  } catch {
    return []
  }
}

/** The listed creators' codes and the slugs of the specialties that have at least one; an unreachable database must not take the whole sitemap down. */
async function listedContent(): Promise<{ codes: string[]; specialties: string[] }> {
  try {
    const { getPublicCreators, getDirectoryContext, getSpecialtyCounts } = await import('@/modules/creators')
    const [creators, context, counts] = await Promise.all([getPublicCreators('en'), getDirectoryContext('en'), getSpecialtyCounts('en')])
    return {
      codes: creators.map((c) => c.code.toLowerCase()),
      specialties: context.specialties.filter((s) => (counts[s.id]?.pros ?? 0) > 0).map((s) => s.slug),
    }
  } catch {
    return { codes: [], specialties: [] }
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ codes, specialties }, pageEntries, legalEntries, guideEntries] = await Promise.all([listedContent(), listedPages(), listedLegal(), listedGuides()])
  const pages = ['/', ...(codes.length ? ['/creators'] : []), '/login', '/register']
  return [
    ...pages.map((path) => entry(path, path === '/' ? 1 : 0.5)),
    ...pageEntries,
    ...legalEntries,
    ...guideEntries,
    ...specialties.map((slug) => entry(`/work/${slug}`, 0.6)),
    ...codes.map((code) => entry(`/creators/${code}`, 0.6)),
  ]
}
