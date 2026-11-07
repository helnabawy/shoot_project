import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('FR-040 robots.txt and sitemap.xml', () => {
  it('lists every public page in both languages with hreflang alternates', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shoot.example')
    const { default: sitemap } = await import('./sitemap')
    const entries = await sitemap()
    expect(entries.map((e) => e.url)).toEqual(['https://shoot.example', 'https://shoot.example/login', 'https://shoot.example/register'])
    expect(entries[0]).toMatchObject({ priority: 1, alternates: { languages: { en: 'https://shoot.example', ar: 'https://shoot.example/ar' } } })
    expect(entries[1]).toMatchObject({ priority: 0.5, alternates: { languages: { ar: 'https://shoot.example/ar/login' } } })
  })

  it('lists the directory and each listed creator in both languages, but only when there are creators (CP-US1-S3)', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shoot.example')
    vi.doMock('@/modules/creators', () => ({ getPublicCreators: async () => [{ code: '7K4Q2' }, { code: '3M8TN' }] }))
    const { default: sitemap } = await import('./sitemap')
    const entries = await sitemap()
    expect(entries.map((e) => e.url)).toEqual([
      'https://shoot.example',
      'https://shoot.example/creators',
      'https://shoot.example/login',
      'https://shoot.example/register',
      'https://shoot.example/creators/7k4q2',
      'https://shoot.example/creators/3m8tn',
    ])
    expect(entries.at(-1)).toMatchObject({ alternates: { languages: { en: 'https://shoot.example/creators/3m8tn', ar: 'https://shoot.example/ar/creators/3m8tn' } } })
    vi.doUnmock('@/modules/creators')
  })

  it('still serves the static pages when the creators cannot be read', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shoot.example')
    vi.doMock('@/modules/creators', () => ({
      getPublicCreators: async () => {
        throw new Error('database down')
      },
    }))
    const { default: sitemap } = await import('./sitemap')
    expect((await sitemap()).map((e) => e.url)).toEqual(['https://shoot.example', 'https://shoot.example/login', 'https://shoot.example/register'])
    vi.doUnmock('@/modules/creators')
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
    expect((await sitemap())[0]!.url).toBe('http://localhost:3000')
  })
})
