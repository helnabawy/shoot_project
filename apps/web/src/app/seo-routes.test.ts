import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('FR-040 robots.txt and sitemap.xml', () => {
  it('lists every public page in both languages with hreflang alternates', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shoot.example')
    const { default: sitemap } = await import('./sitemap')
    const entries = sitemap()
    expect(entries.map((e) => e.url)).toEqual(['https://shoot.example', 'https://shoot.example/login', 'https://shoot.example/register'])
    expect(entries[0]).toMatchObject({ priority: 1, alternates: { languages: { en: 'https://shoot.example', ar: 'https://shoot.example/ar' } } })
    expect(entries[1]).toMatchObject({ priority: 0.5, alternates: { languages: { ar: 'https://shoot.example/ar/login' } } })
  })

  it('keeps private areas out of search and points at the sitemap', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shoot.example')
    const { default: robots } = await import('./robots')
    const rules = robots()
    expect(rules.sitemap).toBe('https://shoot.example/sitemap.xml')
    expect(rules.rules).toEqual([expect.objectContaining({ disallow: expect.arrayContaining(['/admin', '/api', '/account', '/ar/account']) })])
  })

  it('falls back to localhost when no site URL is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined as unknown as string)
    const { default: robots } = await import('./robots')
    const { default: sitemap } = await import('./sitemap')
    expect(robots().sitemap).toBe('http://localhost:3000/sitemap.xml')
    expect(sitemap()[0]!.url).toBe('http://localhost:3000')
  })
})
