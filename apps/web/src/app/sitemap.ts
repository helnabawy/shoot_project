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

/** Codes of the creators who are listed; an unreachable database must not take the whole sitemap down. */
async function listedCreatorCodes(): Promise<string[]> {
  try {
    const { getPublicCreators } = await import('@/modules/creators')
    return (await getPublicCreators('en')).map((c) => c.code.toLowerCase())
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const codes = await listedCreatorCodes()
  const pages = ['/', ...(codes.length ? ['/creators'] : []), '/login', '/register']
  return [...pages.map((path) => entry(path, path === '/' ? 1 : 0.5)), ...codes.map((code) => entry(`/creators/${code}`, 0.6))]
}
