import { revalidateTag } from 'next/cache'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createPage, pagesWorld, translatePage, type PagesWorld } from './setup/pages'

const { getPageBySlug } = await import('@/modules/pages')

describe('MP-US1-S1 published pages by address', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
  })

  it('MP-US1-S1 a published page is found by its address and revalidates the cached pages', async () => {
    vi.mocked(revalidateTag).mockClear()
    await createPage(world, { slug: 'studios', title: 'Studios' }, {})
    expect(revalidateTag).toHaveBeenCalledWith('pages', 'max')
    const result = await getPageBySlug('studios', 'en')
    expect(result).toMatchObject({ status: 'found', page: { title: 'Studios', slug: 'studios' }, slugs: { en: 'studios', ar: 'studios' } })
  })

  it('MP-FR-016 an edit shows on the next read', async () => {
    const found = await getPageBySlug('studios', 'en')
    if (found?.status !== 'found') throw new Error('expected a page')
    await world.payload.update({ collection: 'pages', id: found.page.id, data: { title: 'Our studios', _status: 'published' } as never, draft: false, user: world.editor, overrideAccess: false })
    expect(await getPageBySlug('studios', 'en')).toMatchObject({ page: { title: 'Our studios' } })
  })

  it('MP-US1-S3 a page without Arabic text is served in Arabic from the English address, with English fallback text', async () => {
    const result = await getPageBySlug('studios', 'ar')
    expect(result).toMatchObject({ status: 'found', page: { title: 'Our studios' } })
  })

  it('MP-US1-S3 with an Arabic address the two addresses lead to each other', async () => {
    const found = await getPageBySlug('studios', 'en')
    if (found?.status !== 'found') throw new Error('expected a page')
    await translatePage(world, found.page.id, { title: 'استوديوهاتنا', slug: 'استوديوهات' })
    expect(await getPageBySlug('استوديوهات', 'ar')).toMatchObject({ status: 'found', page: { title: 'استوديوهاتنا' }, slugs: { en: 'studios', ar: 'استوديوهات' } })
    expect(await getPageBySlug('studios', 'ar')).toEqual({ status: 'redirect', redirectTo: '/استوديوهات' })
    expect(await getPageBySlug('استوديوهات', 'en')).toEqual({ status: 'redirect', redirectTo: '/studios' })
    expect(await getPageBySlug('studios', 'en')).toMatchObject({ status: 'found', page: { title: 'Our studios' } })
  })

  it('MP-US1-S1 an unknown address and a page of the other kind are not found', async () => {
    expect(await getPageBySlug('nothing-here', 'en')).toBeNull()
    expect(await getPageBySlug('studios', 'en', { kind: 'intent' })).toBeNull()
  })
})
