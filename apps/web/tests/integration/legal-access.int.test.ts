import { beforeAll, describe, expect, it } from 'vitest'
import { createLegal, pagesWorld, refused, version, type PagesWorld } from './setup/pages'
import { quiet } from './setup/payload'

describe('MP-FR-018 legal documents and acceptances: access', () => {
  let world: PagesWorld
  let docId: number
  beforeAll(async () => {
    world = await pagesWorld()
    const doc = await createLegal(world, 'terms', [version('Live'), version('Secret draft', { state: 'draft', effectiveFrom: '2027-01-01T00:00:00.000Z' })])
    docId = doc.id
  })

  it('MP-FR-006 the public reads published versions only; editors read the drafts too', async () => {
    const publicDoc = await world.payload.findByID({ collection: 'legal-documents', id: docId, depth: 0, overrideAccess: false })
    expect(publicDoc.versions?.map((v) => v.state)).toEqual(['published'])
    const asEditor = await world.payload.findByID({ collection: 'legal-documents', id: docId, depth: 0, user: world.editor, overrideAccess: false })
    expect(asEditor.versions?.map((v) => v.state)).toEqual(['published', 'draft'])
    const asMember = await world.payload.find({ collection: 'legal-documents', depth: 0, user: world.member, overrideAccess: false })
    expect(JSON.stringify(asMember.docs)).not.toContain('Secret draft')
  })

  it('MP-FR-018 only administrators create or delete a document; one document per kind; the kind never changes', async () => {
    await refused(createLegal({ ...world, admin: world.editor }, 'privacy', [version('x')]), /./)
    await expect(createLegal(world, 'terms', [version('Duplicate')])).rejects.toThrow()
    await refused(
      world.payload.update({ collection: 'legal-documents', id: docId, data: { kind: 'privacy' } as never, user: world.admin, overrideAccess: false, context: quiet }),
      /kind of a legal document/,
    )
    await expect(world.payload.delete({ collection: 'legal-documents', id: docId, user: world.editor, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.update({ collection: 'legal-documents', id: docId, data: { title: 'Hacked' } as never, user: world.member, overrideAccess: false })).rejects.toThrow()
  })

  it('MP-FR-006 text marked as a placeholder cannot be published', async () => {
    const rows = (await world.payload.findByID({ collection: 'legal-documents', id: docId, depth: 0, user: world.admin, overrideAccess: false })).versions ?? []
    await refused(
      world.payload.update({
        collection: 'legal-documents',
        id: docId,
        data: { versions: [...rows, { state: 'published', placeholder: true, body: version('Stand-in').body, effectiveFrom: '2027-06-01T00:00:00.000Z' }] } as never,
        user: world.admin,
        overrideAccess: false,
        context: quiet,
      }),
      /placeholder/,
    )
  })

  it('MP-FR-018 acceptance records are append-only and private', async () => {
    const row = { user: world.member.id, kind: 'terms', version: 1, acceptedAt: new Date().toISOString(), locale: 'en' } as never
    await expect(world.payload.create({ collection: 'legal-acceptances', data: row, user: world.admin, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.create({ collection: 'legal-acceptances', data: row, overrideAccess: false })).rejects.toThrow()
    const mine = await world.payload.create({ collection: 'legal-acceptances', data: row, overrideAccess: true })
    await world.payload.create({ collection: 'legal-acceptances', data: { ...(row as object), user: world.editor.id } as never, overrideAccess: true })

    const own = await world.payload.find({ collection: 'legal-acceptances', user: world.member, overrideAccess: false })
    expect(own.docs.map((d) => d.id)).toEqual([mine.id])
    expect((await world.payload.find({ collection: 'legal-acceptances', user: world.editor, overrideAccess: false })).docs.map((d) => typeof d.user === 'object' ? d.user.id : d.user)).toEqual([world.editor.id])
    await expect(world.payload.find({ collection: 'legal-acceptances', overrideAccess: false })).rejects.toThrow()
    expect((await world.payload.find({ collection: 'legal-acceptances', user: world.admin, overrideAccess: false })).totalDocs).toBe(2)
    await expect(world.payload.update({ collection: 'legal-acceptances', id: mine.id, data: { version: 9 } as never, user: world.admin, overrideAccess: false })).rejects.toThrow()
    await expect(world.payload.delete({ collection: 'legal-acceptances', id: mine.id, user: world.member, overrideAccess: false })).rejects.toThrow()
    await world.payload.delete({ collection: 'legal-acceptances', id: mine.id, user: world.admin, overrideAccess: false })
  })
})
