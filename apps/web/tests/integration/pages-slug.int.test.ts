import { sql } from '@payloadcms/db-postgres'
import { beforeAll, describe, expect, it } from 'vitest'
import { createPage, intentAbout, pagesWorld, refused, translatePage, type PagesWorld } from './setup/pages'

const { getPageBySlug } = await import('@/modules/pages')

describe('MP-US1-S5 page addresses', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
  })

  it('MP-US1-S5 refuses a reserved address, naming the conflict', async () => {
    await refused(createPage(world, { slug: 'login' }), /belongs to the site itself/)
    await refused(createPage(world, { slug: 'guides' }), /belongs to the site itself/)
  })

  it('MP-US1-S5 refuses a malformed address', async () => {
    await refused(createPage(world, { slug: 'Not a slug' }), /lowercase letters/)
    await expect(createPage(world, { slug: 'a'.repeat(81) })).rejects.toThrow()
  })

  it('MP-US1-S5 refuses a second page at the same address in the same language, drafts included', async () => {
    await createPage(world, { slug: 'studios' })
    await refused(createPage(world, { slug: 'studios', title: 'Other' }), /already uses this address/)
    const draft = await createPage(world, { slug: 'about', _status: 'draft', title: 'About' })
    await refused(createPage(world, { slug: 'about', title: 'About 2' }), /already uses this address/)
    // updating a page keeps its own address
    await world.payload.update({ collection: 'pages', id: draft.id, data: { title: 'About us', slug: 'about' } as never, draft: true, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
  })

  it('MP-US1-S5 allows the same address in the other language for another page, and across kinds', async () => {
    const other = await createPage(world, { slug: 'help-centre', title: 'Help' })
    await translatePage(world, other.id, { title: 'مساعدة', slug: 'studios' })
    const intent = await createPage(world, { slug: 'studios', kind: 'intent', title: 'Intent', ...(await intentAbout(world)) })
    expect(intent.kind).toBe('intent')
    // site words are fine under /hire
    await createPage(world, { slug: 'guides', kind: 'intent', title: 'Guides intent', ...(await intentAbout(world)) })
  })

  it('MP-US1-S5 needs the English address and a section to publish, but not to save a draft', async () => {
    await refused(createPage(world, { slug: undefined, title: 'No address' }), /English address/)
    await refused(createPage(world, { slug: 'empty', title: 'Empty', sections: [] }), /at least one section/)
    await refused(createPage(world, { slug: 'dup-anchor', title: 'Dup', sections: [{ ...{ blockType: 'richText' }, anchor: 'a' }, { blockType: 'richText', anchor: 'a' }] }), /own anchor/)
    const draft = await createPage(world, { slug: undefined, title: 'Draft only', sections: [], _status: 'draft' })
    expect(draft._status).toBe('draft')
  })

  it('MP-FR-003 keeps a permanent redirect from the old address after a rename, unless the address is reused', async () => {
    const page = await createPage(world, { slug: 'old-name', title: 'Renamed' })
    const renamed = await world.payload.update({ collection: 'pages', id: page.id, data: { slug: 'new-name', _status: 'published' } as never, draft: false, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } })
    expect(renamed.previousSlugs).toEqual([expect.objectContaining({ locale: 'en', slug: 'old-name' })])
    expect(await getPageBySlug('old-name', 'en')).toEqual({ status: 'redirect', redirectTo: '/new-name' })
    expect(await getPageBySlug('new-name', 'en')).toMatchObject({ status: 'found' })
    // another page now owns the old address
    await createPage(world, { slug: 'old-name', title: 'Newcomer' })
    expect(await getPageBySlug('old-name', 'en')).toMatchObject({ status: 'found', page: { title: 'Newcomer' } })
  })

  it('MP-FR-003 records whether the database enforces the localized address (research R2): it does not, the hook is the contract', async () => {
    const { rows } = await (world.payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { indexdef: string }[] }> } }).drizzle.execute(
      sql`SELECT indexdef FROM pg_indexes WHERE tablename = 'pages_locales' AND indexdef ILIKE '%unique%'`,
    )
    const onSlug = rows.filter((r) => /\bslug\b/.test(r.indexdef))
    expect(onSlug).toHaveLength(0)
  })

  it('MP-FR-003 a published page cannot change kind', async () => {
    const page = await createPage(world, { slug: 'kind-lock', title: 'Locked' })
    await refused(
      world.payload.update({ collection: 'pages', id: page.id, data: { kind: 'intent' } as never, user: world.editor, overrideAccess: false, context: { disableRevalidate: true } }),
      /cannot change kind/,
    )
  })
})
