import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createLegal, lexical, pagesWorld, version, type PagesWorld } from './setup/pages'
import { quiet } from './setup/payload'

class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound()
  },
}))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }), headers: async () => new Headers(), cookies: async () => ({ get: () => undefined }) }))
vi.mock('next-intl/server', () => import('../setup/server-intl'))
vi.mock('@/i18n/navigation', () => ({ Link: ({ href, children }: { href: string; children: unknown }) => ({ href, children }) }))

const legal = await import('@/modules/legal')
const render = await import('@/modules/legal/render')
const { getNavigation } = await import('@/modules/pages')
const sitemap = (await import('@/app/sitemap')).default

describe('MP-US2 legal pages', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
    const terms = await createLegal(world, 'terms', [version('English terms')])
    // The Arabic title and text for version 1 of the Terms; privacy stays English-only.
    await world.payload.update({
      collection: 'legal-documents',
      id: terms.id,
      locale: 'ar',
      data: { title: 'الشروط والأحكام', versions: [{ id: terms.versions![0]!.id, body: lexical('الشروط بالعربية'), changeSummary: 'الإصدار الأول' }] } as never,
      user: world.admin,
      overrideAccess: false,
      context: quiet,
    })
    await createLegal(world, 'privacy', [version('English privacy')])
  })

  it('MP-US2-S1 the footer links list exactly the documents that have a version in force', async () => {
    expect(await legal.getLegalLinks('en')).toEqual([
      { kind: 'terms', label: 'Terms & Conditions', href: '/terms' },
      { kind: 'privacy', label: 'Privacy Policy', href: '/privacy' },
    ])
    expect((await getNavigation('ar')).legal).toEqual([
      { label: 'الشروط والأحكام', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ])
    expect((await legal.getLegalLinks('en', new Date('2020-01-01'))).length).toBe(0)
  })

  it('MP-US2-S1 the pages sit at fixed addresses, in the sitemap, and the archive pages stay out of it', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toEqual(expect.arrayContaining([expect.stringMatching(/\/terms$/), expect.stringMatching(/\/privacy$/)]))
    expect(urls.some((u) => u.includes('/versions'))).toBe(false)
    expect(urls.some((u) => u.endsWith('/terms/professional'))).toBe(false)
  })

  it('MP-US2-S5 an Arabic reader gets the Arabic text where it exists, and the English text with a notice where it does not', async () => {
    expect(await legal.getLegalDocument('terms', 'ar')).toMatchObject({ title: 'الشروط والأحكام', fallback: false, changeSummary: 'الإصدار الأول' })
    expect(await legal.getLegalDocument('privacy', 'ar')).toMatchObject({ title: 'Privacy Policy', fallback: true })
    expect(await legal.getLegalDocument('privacy', 'en')).toMatchObject({ fallback: false })
  })

  it('MP-US2-S1 the route renders the document in force, its archive and one version; anything else is not found', async () => {
    const props = (rest?: string[], locale = 'en') => ({ params: Promise.resolve({ locale, rest }) })
    const page = render.legalPage('terms')
    expect(await page(props())).toBeTruthy()
    expect(await page(props(['versions']))).toBeTruthy()
    expect(await page(props(['versions', '1']))).toBeTruthy()
    await expect(page(props(['versions', '9']))).rejects.toBeInstanceOf(NotFound)
    await expect(page(props(['versions', '01']))).rejects.toBeInstanceOf(NotFound)
    await expect(page(props(['other']))).rejects.toBeInstanceOf(NotFound)
    await expect(render.legalPage('professional-terms')(props())).rejects.toBeInstanceOf(NotFound)
  })

  it('MP-US2-S1 metadata: the current version is indexable with both languages, the archive is not', async () => {
    const meta = render.legalMetadata('terms')
    const current = await meta({ params: Promise.resolve({ locale: 'ar', rest: undefined }) })
    expect(current.title).toBe('الشروط والأحكام')
    expect(current.alternates).toMatchObject({ canonical: '/ar/terms', languages: { en: '/terms', ar: '/ar/terms' } })
    expect((await meta({ params: Promise.resolve({ locale: 'en', rest: ['versions'] }) })).robots).toEqual({ index: false, follow: true })
    expect(await meta({ params: Promise.resolve({ locale: 'en', rest: ['junk'] }) })).toEqual({})
    expect(render.legalRevalidate).toBe(60)
  })
})
