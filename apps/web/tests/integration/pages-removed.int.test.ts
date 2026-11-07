import { beforeAll, describe, expect, it } from 'vitest'
import { createPage, pagesWorld, translatePage, type PagesWorld } from './setup/pages'

const { getNavigation, isRemovedPath, listPagesForSitemap } = await import('@/modules/pages')

describe('MP-US1-S6 deleted pages', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
  })

  const remove = async (slug: string) => {
    const doc = (await world.payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true })).docs[0]!
    await world.payload.delete({ collection: 'pages', id: doc.id, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
  }

  it('MP-US1-S6 a deleted page leaves its address marked removed in each language, and leaves the chrome and the sitemap', async () => {
    const page = await createPage(world, { slug: 'studios', title: 'Studios', placement: { footerGroup: 'company' } })
    await translatePage(world, page.id, { title: 'استوديوهات', slug: 'استوديوهات-ar' })
    expect((await listPagesForSitemap()).map((p) => p.slugs.en)).toContain('studios')
    await remove('studios')
    expect(await isRemovedPath('en', '/studios')).toBe(true)
    expect(await isRemovedPath('ar', '/استوديوهات-ar')).toBe(true)
    expect((await getNavigation('en')).footerGroups).toEqual([])
    expect((await listPagesForSitemap()).map((p) => p.slugs.en)).not.toContain('studios')
  })

  it('MP-US5-S2 an address that never existed is not removed, and a page that was never public leaves no mark', async () => {
    expect(await isRemovedPath('en', '/never-existed')).toBe(false)
    await createPage(world, { slug: 'drafty', title: 'Drafty', _status: 'draft' })
    await remove('drafty')
    expect(await isRemovedPath('en', '/drafty')).toBe(false)
  })

  it('MP-US1-S6 a page without an Arabic address is also removed at the English address under /ar', async () => {
    await createPage(world, { slug: 'english-only', title: 'English only' })
    await remove('english-only')
    expect(await isRemovedPath('ar', '/english-only')).toBe(true)
  })

  it('MP-US1-S6 publishing at a removed address makes it a normal address again; intent pages are marked under /hire', async () => {
    await createPage(world, { slug: 'studios', title: 'Studios again' })
    expect(await isRemovedPath('en', '/studios')).toBe(false)
    await createPage(world, { slug: 'dubai-weddings', kind: 'intent', title: 'Weddings' })
    await remove('dubai-weddings')
    expect(await isRemovedPath('en', '/hire/dubai-weddings')).toBe(true)
  })

  it('MP-US1-S6 nobody can create or change a removed-address mark through the API', async () => {
    const data = { kind: 'page', locale: 'en', path: '/fake', removedAt: new Date().toISOString() } as never
    await expect(world.payload.create({ collection: 'removed-paths', data, user: world.admin, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.create({ collection: 'removed-paths', data, overrideAccess: false })).rejects.toThrow()
    const rows = await world.payload.find({ collection: 'removed-paths', overrideAccess: false })
    expect(rows.totalDocs).toBeGreaterThan(0)
  })
})
