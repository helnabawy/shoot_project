import { revalidateTag } from 'next/cache'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getActivePersonas, getCategoriesForAudience } from '@/modules/personas/queries'
import { getBriefBuilderConfig } from '@/modules/brief/queries'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, quiet, resetDatabase } from './setup/payload'

describe('US5 audience is CMS data', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('US5-S1 adding and activating "Teacher" reaches every audience listing with no code change', async () => {
    const payload = await getTestPayload()
    vi.mocked(revalidateTag).mockClear()
    const teacher = await payload.create({
      collection: 'personas',
      data: { singular: 'Teacher', plural: 'Teachers', slug: 'teacher', glyph: 'TE', order: 3 },
    })
    expect(revalidateTag).toHaveBeenCalledWith('personas', 'max')
    await payload.update({ collection: 'personas', id: teacher.id, locale: 'ar', data: { singular: 'معلّم', plural: 'معلّمون' } })
    await payload.create({ collection: 'categories', data: { name: 'Mathematics', slug: 'mathematics', personas: [teacher.id] } })
    await payload.create({ collection: 'categories', data: { name: 'Physics', slug: 'physics', personas: [teacher.id] } })
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
    await payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: [teacher.id, ...((settings.activePersonas ?? []) as number[])] } })

    const active = await getActivePersonas('en')
    expect(active.map((p) => p.slug)).toEqual(['teacher', 'photographer', 'videographer'])
    expect((await getActivePersonas('ar'))[0]?.singular).toBe('معلّم')
    const categories = await getCategoriesForAudience('en')
    expect(categories.map((c) => c.slug)).toEqual(expect.arrayContaining(['mathematics', 'physics', 'portrait']))
    const builder = await getBriefBuilderConfig('en')
    expect(builder?.slots.find((s) => s.kind === 'persona')?.options.map((o) => o.value)).toEqual(['teacher', 'photographer', 'videographer'])
  })

  it('US5-S3 a deactivated persona disappears from listings while its accounts remain', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: 'photographer' } } })
    const photographer = docs[0]!
    const provider = await createUser(['member'], { accountType: 'provider', persona: [photographer.id] })
    await payload.update({ collection: 'personas', id: photographer.id, data: { active: false }, context: quiet })
    expect((await getActivePersonas('en')).map((p) => p.slug)).not.toContain('photographer')
    const still = await payload.findByID({ collection: 'users', id: provider.id, depth: 0 })
    expect(still.persona).toEqual([photographer.id])
  })

  it('US5-S4 refuses to delete a referenced persona and a referenced category', async () => {
    const payload = await getTestPayload()
    const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: 'teacher' } } })
    await expect(payload.delete({ collection: 'personas', id: docs[0]!.id })).rejects.toThrow(/still used by/)
    const category = (await payload.find({ collection: 'categories', where: { slug: { equals: 'physics' } } })).docs[0]!
    await createUser(['member'], { accountType: 'provider', persona: [docs[0]!.id], categories: [category.id] })
    await expect(payload.delete({ collection: 'categories', id: category.id })).rejects.toThrow(/still used by/)
  })
})
