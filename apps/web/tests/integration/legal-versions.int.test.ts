import { beforeAll, describe, expect, it } from 'vitest'
import { createLegal, pagesWorld, refused, version, type PagesWorld } from './setup/pages'
import { quiet } from './setup/payload'

const legal = await import('@/modules/legal')

const NOW = new Date('2026-11-07T12:00:00Z')

describe('MP-US2 legal document versions', () => {
  let world: PagesWorld
  let docId: number
  beforeAll(async () => {
    world = await pagesWorld()
  })

  const update = (data: Record<string, unknown>, user = world.admin) =>
    world.payload.update({ collection: 'legal-documents', id: docId, data: data as never, user, overrideAccess: false, context: quiet })

  const fresh = async () => (await world.payload.findByID({ collection: 'legal-documents', id: docId, depth: 0, user: world.admin, overrideAccess: false })).versions ?? []

  it('MP-FR-006 numbers versions in order and ignores a number sent by the client', async () => {
    const doc = await createLegal(world, 'terms', [version('First', { version: 99 }), version('Second draft', { state: 'draft', effectiveFrom: '2026-12-01T00:00:00.000Z' })])
    docId = doc.id
    expect(doc.versions?.map((v) => v.version)).toEqual([1, 2])
    expect(doc.versions?.[0]).toMatchObject({ state: 'published' })
    expect(doc.versions?.[0]?.publishedAt).toBeTruthy()
    expect(doc.versions?.[1]?.publishedAt ?? null).toBeNull()
  })

  it('MP-US2-S3 the version in force follows the clock; a later one is announced, not applied', async () => {
    const rows = await fresh()
    await update({ versions: [rows[0], { ...rows[1], state: 'published', effectiveFrom: '2026-12-01T00:00:00.000Z' }] })
    const before = await legal.getLegalDocument('terms', 'en', { now: NOW })
    expect(before).toMatchObject({ version: 1, upcoming: { version: 2, effectiveFrom: '2026-12-01T00:00:00.000Z' } })
    const after = await legal.getLegalDocument('terms', 'en', { now: new Date('2026-12-01T00:00:01Z') })
    expect(after).toMatchObject({ version: 2, upcoming: null, hasEarlier: true })
  })

  it('MP-US2-S4 every published version stays readable with its period', async () => {
    const list = await legal.getLegalVersions('terms', 'en')
    expect(list?.versions).toEqual([
      expect.objectContaining({ version: 2, from: '2026-12-01T00:00:00.000Z', until: null }),
      expect.objectContaining({ version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-12-01T00:00:00.000Z', changeSummary: 'Summary of First' }),
    ])
    expect(await legal.getLegalVersion('terms', 1, 'en')).toMatchObject({ version: 1, title: 'Terms & Conditions' })
    expect(await legal.getLegalVersion('terms', 7, 'en')).toBeNull()
  })

  it('MP-US2-S4 versions are never silently overwritten: editors cannot edit or remove a published one', async () => {
    const rows = await fresh()
    const edited = [{ ...rows[0], body: version('Quietly changed').body }, rows[1]]
    await refused(update({ versions: edited }, world.editor), /cannot be edited/)
    await refused(update({ versions: [rows[1]] }, world.editor), /cannot be removed|cannot be edited/)
    await refused(update({ versions: [rows[1]] }), /cannot be removed/) // not even an administrator
    // an administrator may correct a typo
    await update({ versions: [{ ...rows[0], changeSummary: 'Fixed a typo' }, rows[1]] })
    expect((await fresh())[0]?.changeSummary).toBe('Fixed a typo')
  })

  it('MP-FR-006 an editor may add a draft version and work on it, then publishing stamps who and when', async () => {
    const rows = await fresh()
    const added = await update({ versions: [...rows, { state: 'draft', body: version('Third').body, effectiveFrom: '2027-03-01T00:00:00.000Z' }] }, world.editor)
    expect(added.versions?.map((v) => v.version)).toEqual([1, 2, 3])
    const drafted = (await fresh())[2]!
    await update({ versions: [...rows, { ...drafted, body: version('Third, revised').body }] }, world.editor)
    await update({ versions: [...rows, { ...drafted, state: 'published' }] }, world.editor)
    const published = await world.payload.findByID({ collection: 'legal-documents', id: docId, depth: 0, user: world.admin, overrideAccess: false })
    expect(published.versions?.[2]).toMatchObject({ state: 'published', publishedBy: world.editor.id })
    expect(published.versions?.[2]?.publishedAt).toBeTruthy()
  })

  it('MP-FR-006 two published versions cannot start at the same moment', async () => {
    const rows = await fresh()
    await refused(update({ versions: [...rows, { state: 'published', body: version('Clash').body, effectiveFrom: rows[0]!.effectiveFrom }] }), /same moment/)
  })

  it('MP-FR-006 a version without an effective date starts when it is published', async () => {
    const doc = await createLegal(world, 'privacy', [{ state: 'published', body: version('Privacy').body }])
    expect(doc.versions?.[0]?.effectiveFrom).toBe(doc.versions?.[0]?.publishedAt)
  })
})

describe('MP-US2-S5 translating a published version', () => {
  it('an editor may add the Arabic text of a published version, but not change the words already published', async () => {
    const world = await pagesWorld()
    const doc = await createLegal(world, 'terms', [version('English words')])
    const row = doc.versions![0]!
    const ar = (data: Record<string, unknown>) =>
      world.payload.update({ collection: 'legal-documents', id: doc.id, locale: 'ar', data: { title: 'الشروط', versions: [{ id: row.id, state: 'published', effectiveFrom: row.effectiveFrom, ...data }] } as never, user: world.editor, overrideAccess: false, context: quiet })
    const { lexical } = await import('./setup/pages')
    await ar({ body: lexical('كلمات عربية'), changeSummary: 'الإصدار الأول' })
    expect((await legal.getLegalDocument('terms', 'ar', { now: NOW }))).toMatchObject({ fallback: false, changeSummary: 'الإصدار الأول' })
    // English is untouched, and the Arabic words now published cannot be rewritten by an editor
    expect(await legal.getLegalDocument('terms', 'en', { now: NOW })).toMatchObject({ fallback: false })
    await refused(ar({ body: lexical('كلمات مختلفة'), changeSummary: 'الإصدار الأول' }), /cannot be edited/)
    // the English words are still protected
    await refused(
      world.payload.update({ collection: 'legal-documents', id: doc.id, locale: 'en', data: { versions: [{ id: row.id, state: 'published', effectiveFrom: row.effectiveFrom, body: lexical('Rewritten'), changeSummary: row.changeSummary }] } as never, user: world.editor, overrideAccess: false, context: quiet }),
      /cannot be edited/,
    )
  })
})
