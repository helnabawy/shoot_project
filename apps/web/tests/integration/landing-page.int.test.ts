import { revalidatePath, revalidateTag } from 'next/cache'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getLandingPage } from '@/modules/landing/queries'
import { seed } from '@/shared/payload/seed/seed'
import { getTestPayload, resetDatabase } from './setup/payload'

describe('US1 / US3 landing page content', () => {
  beforeAll(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('FR-014 publishing revalidates the landing tag and both locale paths', async () => {
    const payload = await getTestPayload()
    vi.mocked(revalidateTag).mockClear()
    await payload.updateGlobal({ slug: 'landing-page', data: { hero: { subheadline: 'Updated' }, _status: 'published' } })
    expect(revalidateTag).toHaveBeenCalledWith('landing-page', 'max')
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]')
  })

  it('FR-015 published reads ignore drafts; draft reads see them', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'landing-page', data: { hero: { headline: 'Draft headline' } }, draft: true })
    expect((await getLandingPage({ locale: 'en' })).hero?.headline).toBe('You brief. We shoot.')
    expect((await getLandingPage({ locale: 'en', draft: true })).hero?.headline).toBe('Draft headline')
  })

  it('US3-S2 section order follows the CMS', async () => {
    const payload = await getTestPayload()
    const current = await payload.findGlobal({ slug: 'landing-page', depth: 0 })
    const reversed = [...(current.sections ?? [])].reverse()
    await payload.updateGlobal({ slug: 'landing-page', data: { sections: reversed, _status: 'published' } })
    const after = await getLandingPage({ locale: 'en' })
    expect(after.sections?.map((s) => s.blockType)).toEqual(reversed.map((s) => s.blockType))
  })

  it('the brief sentence and slots must agree in every language', async () => {
    const payload = await getTestPayload()
    await expect(
      payload.updateGlobal({ slug: 'landing-page', locale: 'ar', data: { briefBuilder: { sentence: 'أحتاج {persona} في {city}' } } }),
    ).rejects.toThrow()
  })
})
