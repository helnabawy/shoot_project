import { beforeAll, describe, expect, it } from 'vitest'
import { createGuide, guidesWorld, refused, type GuidesWorld } from './setup/pages'
import { quiet } from './setup/payload'

const { isRemovedPath } = await import('@/modules/pages')

describe('MP-FR-018 guides: rules and access', () => {
  let world: GuidesWorld
  beforeAll(async () => {
    world = await guidesWorld()
  })

  it('MP-EDGE-guards the reserved words feed, category and author are not addresses of guides', async () => {
    for (const slug of ['feed', 'category', 'author']) await refused(createGuide(world, { slug }), /guides pages themselves/)
    await refused(createGuide(world, { slug: 'Bad Slug' }), /lowercase letters/)
  })

  it('MP-EDGE-guards the address of a guide cannot be changed after it is saved', async () => {
    const guide = await createGuide(world, { slug: 'first-address' })
    await refused(world.payload.update({ collection: 'articles', id: guide.id, data: { slug: 'second-address' } as never, user: world.editor, overrideAccess: false, context: quiet }), /cannot be changed/)
  })

  it('MP-FR-018 publishing needs a cover, an author, a category and text; a draft does not', async () => {
    await refused(createGuide(world, { slug: 'no-cover', cover: undefined }), /./)
    await refused(createGuide(world, { slug: 'no-author', author: undefined }), /./)
    await refused(createGuide(world, { slug: 'no-category', categories: [] }), /./)
    const draft = await createGuide(world, { slug: 'just-a-draft', _status: 'draft', cover: undefined, author: undefined, categories: [], summary: undefined, body: undefined })
    expect(draft._status).toBe('draft')
  })

  it('MP-US3-S2 pressing Publish without choosing a time publishes now', async () => {
    const guide = await createGuide(world, { slug: 'now-guide', publishedAt: undefined })
    expect(Date.parse(guide.publishedAt)).toBeGreaterThan(Date.now() - 60_000)
  })

  it('MP-EDGE-guards a category or an author in use cannot be deleted, and the refusal names the guide', async () => {
    await createGuide(world, { slug: 'uses-both', title: 'Uses both' })
    await refused(world.payload.delete({ collection: 'article-categories', id: world.categories.wedding.id, user: world.editor, overrideAccess: false }), /Uses both/)
    await refused(world.payload.delete({ collection: 'authors', id: world.author.id, user: world.editor, overrideAccess: false }), /Uses both/)
    await world.payload.delete({ collection: 'article-categories', id: world.categories.corporate.id, user: world.editor, overrideAccess: false, context: quiet })
  })

  it('MP-EDGE-guards an image used by a guide cannot be deleted', async () => {
    await refused(world.payload.delete({ collection: 'media', id: world.image.id, user: world.admin, overrideAccess: false }), /guide/)
  })

  it('MP-FR-005 a deleted public guide leaves its address marked removed in both languages; a draft leaves none', async () => {
    const guide = await createGuide(world, { slug: 'to-remove' })
    await world.payload.delete({ collection: 'articles', id: guide.id, user: world.editor, overrideAccess: false, context: quiet })
    expect(await isRemovedPath('en', '/guides/to-remove')).toBe(true)
    expect(await isRemovedPath('ar', '/guides/to-remove')).toBe(true)
    const draft = await createGuide(world, { slug: 'draft-remove', _status: 'draft' })
    await world.payload.delete({ collection: 'articles', id: draft.id, user: world.editor, overrideAccess: false, context: quiet })
    expect(await isRemovedPath('en', '/guides/draft-remove')).toBe(false)
  })

  it('MP-FR-018 visitors and members cannot write; categories and authors are public to read', async () => {
    const data = { slug: 'x', name: 'X' } as never
    await expect(world.payload.create({ collection: 'authors', data, user: world.member, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.create({ collection: 'article-categories', data, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.create({ collection: 'articles', data: { slug: 'x' } as never, user: world.member, overrideAccess: false })).rejects.toThrow()
    expect((await world.payload.find({ collection: 'authors', overrideAccess: false })).totalDocs).toBeGreaterThan(0)
    expect((await world.payload.find({ collection: 'article-categories', overrideAccess: false })).totalDocs).toBeGreaterThan(0)
  })
})
