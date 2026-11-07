import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/login', '/register']
  return pages.map((path) => ({
    url: `${base}${path === '/' ? '' : path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.5,
    alternates: { languages: { en: `${base}${path === '/' ? '' : path}`, ar: `${base}/ar${path === '/' ? '' : path}` } },
  }))
}
