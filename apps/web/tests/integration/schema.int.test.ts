import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, quiet, resetDatabase } from './setup/payload'

describe('CMS schema rules', () => {
  beforeAll(async () => {
    await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('FR-012 rejects a non-international WhatsApp number and stores valid ones normalised', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '0581498824' }, context: quiet }),
    ).rejects.toThrow()
    const saved = await payload.updateGlobal({ slug: 'site-settings', data: { whatsappNumber: '00971 58 149 8824' }, context: quiet })
    expect(saved.whatsappNumber).toBe('+971581498824')
  })

  it('FR-016 members cannot update globals; editors can update the landing page', async () => {
    const payload = await getTestPayload()
    const member = await createUser(['member'])
    await expect(
      payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'Hacked' }, overrideAccess: false, user: member, context: quiet }),
    ).rejects.toThrow()
    const editor = await createUser(['editor'])
    const saved = await payload.updateGlobal({
      slug: 'landing-page',
      data: { hero: { headline: 'Edited' } },
      overrideAccess: false,
      user: editor,
      context: quiet,
    })
    expect(saved.hero?.headline).toBe('Edited')
  })

  it('FR-029 refuses to delete a persona that is referenced, allows deactivation', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: 'photographer' } } })
    const id = docs[0]!.id
    await expect(payload.delete({ collection: 'personas', id, context: quiet })).rejects.toThrow(/still used by/)
    const updated = await payload.update({ collection: 'personas', id, data: { active: false }, context: quiet })
    expect(updated.active).toBe(false)
  })

  it('refuses to delete an option set used by the brief builder', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'option-sets', where: { slug: { equals: 'occasions' } } })
    await expect(payload.delete({ collection: 'option-sets', id: docs[0]!.id, context: quiet })).rejects.toThrow(/brief builder/)
  })

  it('slugs cannot change after creation', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'categories', limit: 1 })
    await expect(
      payload.update({ collection: 'categories', id: docs[0]!.id, data: { slug: 'renamed' }, context: quiet }),
    ).rejects.toThrow()
  })

  it('section anchors must be unique and the sentence must match its slots', async () => {
    const payload = await getTestPayload()
    const current = await payload.findGlobal({ slug: 'landing-page', depth: 0 })
    const sections = current.sections ?? []
    const error = await payload
      .updateGlobal({
        slug: 'landing-page',
        data: { sections: [...sections, { ...sections[0]!, id: undefined }] },
        context: quiet,
      })
      .catch((e: { data?: unknown }) => e)
    expect(JSON.stringify((error as { data?: unknown }).data)).toMatch(/needs its own anchor/)
    await expect(
      payload.updateGlobal({
        slug: 'landing-page',
        data: { briefBuilder: { sentence: 'I need a {persona} for {subject}' } },
        context: quiet,
      }),
    ).rejects.toThrow()
  })

  it('FR-015 / FR-018 drafts stay private and publishing records who and when', async () => {
    const payload = await getTestPayload()
    const editor = await createUser(['editor'])
    await payload.updateGlobal({ slug: 'landing-page', data: { hero: { headline: 'Draft only' } }, draft: true, context: quiet })
    const published = await payload.findGlobal({ slug: 'landing-page', overrideAccess: false })
    expect(published.hero?.headline).toBe('You brief. We shoot.')
    const draft = await payload.findGlobal({ slug: 'landing-page', draft: true, overrideAccess: false, user: editor })
    expect(draft.hero?.headline).toBe('Draft only')
    const anonymousDraft = await payload
      .findGlobal({ slug: 'landing-page', draft: true, overrideAccess: false })
      .catch(() => null)
    expect(anonymousDraft?.hero?.headline).not.toBe('Draft only')
    const live = await payload.updateGlobal({
      slug: 'landing-page',
      data: { _status: 'published' },
      overrideAccess: false,
      user: editor,
      context: quiet,
    })
    expect(live.publishedAt).toBeTruthy()
    const by = live.publishedBy
    expect(typeof by === 'object' && by ? by.id : by).toBe(editor.id)
  })

  it('MR-US2-S7 no collection or global uses the slug "mobile" (it would shadow /api/mobile)', async () => {
    const payload = await getTestPayload()
    expect(payload.config.collections.map((c) => c.slug)).not.toContain('mobile')
    expect(payload.config.globals.map((g) => g.slug)).not.toContain('mobile')
  })
})
