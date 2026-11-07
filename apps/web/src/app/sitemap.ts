import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Listed creators come from the database, so the sitemap is built per request, not at build time.
export const dynamic = 'force-dynamic'

type Entry = MetadataRoute.Sitemap[number]

const entry = (path: string, priority: number): Entry => ({
  url: `${base}${path === '/' ? '' : path}`,
  changeFrequency: 'weekly',
  priority,
  alternates: { languages: { en: `${base}${path === '/' ? '' : path}`, ar: `${base}/ar${path === '/' ? '' : path}` } },
})

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
  const { codes, specialties } = await listedContent()
  const pages = ['/', ...(codes.length ? ['/creators'] : []), '/login', '/register']
  return [
    ...pages.map((path) => entry(path, path === '/' ? 1 : 0.5)),
    ...specialties.map((slug) => entry(`/work/${slug}`, 0.6)),
    ...codes.map((code) => entry(`/creators/${code}`, 0.6)),
  ]
}
