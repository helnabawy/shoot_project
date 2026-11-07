import { beforeAll, describe, expect, it } from 'vitest'
import { createPage, intentAbout, pagesWorld, refused, type PagesWorld } from './setup/pages'

const { getNavigation } = await import('@/modules/pages')

const place = (placement: Record<string, unknown>) => ({ placement })

describe('MP-US1-S4 header and footer placement', () => {
  let world: PagesWorld
  beforeAll(async () => {
    world = await pagesWorld()
  })

  it('MP-US1-S4 lists header pages and footer groups in the editor’s order, hides drafts and empty groups', async () => {
    await createPage(world, { slug: 'studios', title: 'Studios', ...place({ inHeader: true, footerGroup: 'company', order: 2 }) })
    await createPage(world, { slug: 'about', title: 'About us', ...place({ footerGroup: 'company', order: 1, navLabel: 'About' }) })
    await createPage(world, { slug: 'draft-page', title: 'Draft', _status: 'draft', ...place({ inHeader: true, footerGroup: 'help' }) })
    const nav = await getNavigation('en')
    expect(nav.header).toEqual([{ label: 'Studios', href: '/studios' }])
    expect(nav.footerGroups).toEqual([{ key: 'company', label: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Studios', href: '/studios' }] }])
    expect(nav.legal).toEqual([])
  })

  it('MP-US1-S4 unpublishing or deleting a page takes its links away', async () => {
    const studios = (await world.payload.find({ collection: 'pages', where: { slug: { equals: 'studios' } }, limit: 1, depth: 0 })).docs[0]!
    await world.payload.update({ collection: 'pages', id: studios.id, data: { _status: 'draft' } as never, draft: false, user: world.editor, overrideAccess: false })
    expect((await getNavigation('en')).header).toEqual([])
    const about = (await world.payload.find({ collection: 'pages', where: { slug: { equals: 'about' } }, limit: 1, depth: 0 })).docs[0]!
    await world.payload.delete({ collection: 'pages', id: about.id, user: world.editor, overrideAccess: false })
    expect((await getNavigation('en')).footerGroups).toEqual([])
  })

  it('MP-EDGE-nav-limits refuses a fourth header page and an unknown footer group', async () => {
    for (const n of [1, 2, 3]) await createPage(world, { slug: `h${n}`, title: `H${n}`, ...place({ inHeader: true }) })
    await refused(createPage(world, { slug: 'h4', title: 'H4', ...place({ inHeader: true }) }), /room for 3 pages/)
    await refused(createPage(world, { slug: 'g1', title: 'G1', ...place({ footerGroup: 'nope' }) }), /footer group does not exist/)
    // saving the same page again does not count it twice
    const first = (await world.payload.find({ collection: 'pages', where: { slug: { equals: 'h1' } }, limit: 1, depth: 0 })).docs[0]!
    await world.payload.update({ collection: 'pages', id: first.id, data: { title: 'H1 again', _status: 'published' } as never, draft: false, user: world.editor, overrideAccess: false })
  })

  it('MP-EDGE-nav-limits refuses the 25th footer link', async () => {
    for (let n = 1; n <= 24; n += 1) await createPage(world, { slug: `f${n}`, title: `F${n}`, ...place({ footerGroup: 'help' }) })
    await refused(createPage(world, { slug: 'f25', title: 'F25', ...place({ footerGroup: 'company' }) }), /room for 24 links/)
  })

  it('MP-EDGE-zero-sections publishes only with a section; intent pages never take a place in the chrome', async () => {
    await refused(createPage(world, { slug: 'blank', title: 'Blank', sections: [] }), /at least one section/)
    const intent = await createPage(world, { slug: 'dubai-wedding', kind: 'intent', title: 'Wedding', ...(await intentAbout(world)), ...place({ inHeader: true, footerGroup: 'help' }) })
    expect(intent.placement).toMatchObject({ inHeader: false })
    expect(intent.placement?.footerGroup ?? '').toBe('')
  })
})
