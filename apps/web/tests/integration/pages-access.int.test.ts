import { beforeAll, describe, expect, it } from 'vitest'
import { createPage, pagesWorld, type PagesWorld } from './setup/pages'

const { getPageBySlug } = await import('@/modules/pages')

describe('MP-US1-S2 draft pages and access', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
    await createPage(world, { slug: 'live', title: 'Live' })
    await createPage(world, { slug: 'secret', title: 'Secret draft', _status: 'draft' })
  })

  it('MP-US1-S2 the public reads published pages only, through the Local API and the page lookup', async () => {
    const found = await world.payload.find({ collection: 'pages', overrideAccess: false, depth: 0 })
    expect(found.docs.map((d) => d.title)).toEqual(['Live'])
    expect(await getPageBySlug('live', 'en')).toMatchObject({ status: 'found' })
    expect(await getPageBySlug('secret', 'en')).toBeNull()
  })

  it('MP-US5-S3 a draft address answers exactly like an address that never existed', async () => {
    expect(await getPageBySlug('secret', 'en')).toEqual(await getPageBySlug('never-existed', 'en'))
    expect(await getPageBySlug('secret', 'ar')).toEqual(await getPageBySlug('never-existed', 'ar'))
  })

  it('MP-US1-S2 editors read drafts, in preview and in the admin', async () => {
    const asEditor = await world.payload.find({ collection: 'pages', draft: true, user: world.editor, overrideAccess: false, depth: 0 })
    expect(asEditor.docs.map((d) => d.title).sort()).toEqual(['Live', 'Secret draft'])
    expect(await getPageBySlug('secret', 'en', { draft: true })).toMatchObject({ status: 'found', page: { title: 'Secret draft' } })
  })

  it('MP-FR-018 members and visitors cannot write pages, only editors', async () => {
    const data = { title: 'Nope', slug: 'nope', sections: [], _status: 'draft' } as never
    await expect(world.payload.create({ collection: 'pages', data, draft: true, user: world.member, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.create({ collection: 'pages', data, draft: true, overrideAccess: false })).rejects.toThrow()
    const live = (await world.payload.find({ collection: 'pages', where: { slug: { equals: 'live' } }, depth: 0, limit: 1 })).docs[0]!
    await expect(world.payload.update({ collection: 'pages', id: live.id, data: { title: 'Hacked' } as never, user: world.member, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.delete({ collection: 'pages', id: live.id, user: world.member, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.delete({ collection: 'pages', id: live.id, overrideAccess: false })).rejects.toThrow()
  })

  it('MP-FR-018 page versions are for editors only', async () => {
    await expect(world.payload.findVersions({ collection: 'pages', user: world.member, overrideAccess: false })).rejects.toThrow()
    const versions = await world.payload.findVersions({ collection: 'pages', user: world.editor, overrideAccess: false })
    expect(versions.totalDocs).toBeGreaterThan(0)
  })

  it('MP-FR-018 earlier addresses are visible to everyone and nothing else about unpublished work is', async () => {
    const live = await world.payload.find({ collection: 'pages', where: { slug: { equals: 'live' } }, overrideAccess: false, depth: 0 })
    expect(live.docs[0]).toHaveProperty('previousSlugs')
    expect(live.docs[0]).not.toHaveProperty('_versions')
  })
})
