import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createDraft, creatorWorld, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'

class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound()
  },
}))
vi.mock('next-intl/server', () => import('../setup/server-intl'))

const page = await import('@/app/(site)/[locale]/work/[specialty]/page')
const props = (specialty: string, locale = 'en', search: Record<string, string> = {}) => ({ params: Promise.resolve({ locale, specialty }), searchParams: Promise.resolve(search) })

describe('CP-US4 /work/[specialty] page', () => {
  let world: CreatorWorld

  beforeAll(async () => {
    world = await creatorWorld()
  })

  it('CP-US4-S2 an unknown specialty is the site\'s 404, and has no metadata of its own', async () => {
    await expect(page.default(props('nope'))).rejects.toBeInstanceOf(NotFound)
    expect(await page.generateMetadata(props('nope'))).toEqual({})
  })

  it('CP-US4-S2 with nobody listed it renders, says so, and is not indexed', async () => {
    expect(await page.default(props('portrait'))).toBeTruthy()
    const meta = await page.generateMetadata(props('portrait'))
    expect(meta.title).toBe('Portrait photographers and videographers in the UAE')
    expect(meta.robots).toEqual({ index: false, follow: true })
  })

  it('CP-US4-S2 once a creator is listed it is indexed with the editor\'s text and both languages as alternates', async () => {
    const provider = await makeProvider(world)
    const image = await uploadImage(world, provider)
    const profile = await createDraft(world, provider, { displayName: 'Sara Khan', samples: [{ kind: 'image', image: image.id, category: world.category }] })
    await publish(world, profile.id)
    const en = await page.generateMetadata(props('portrait'))
    expect(en.robots).toBeUndefined()
    expect(en.description).toContain('portrait shoot')
    expect(en.alternates).toMatchObject({ languages: { en: expect.stringMatching(/\/work\/portrait$/), ar: expect.stringMatching(/\/ar\/work\/portrait$/) } })
    const ar = await page.generateMetadata(props('portrait', 'ar'))
    expect(ar.title).toBe('مصورو بورتريه في الإمارات')
    expect(await page.default(props('portrait'))).toBeTruthy()
  })

  it('CP-US4-S1 a narrowed or paged view of the page is not indexed', async () => {
    expect((await page.generateMetadata(props('portrait', 'en', { place: 'dubai' }))).robots).toEqual({ index: false, follow: true })
    expect((await page.generateMetadata(props('portrait', 'en', { page: '2' }))).robots).toEqual({ index: false, follow: true })
  })

  it('CP-US4-S2 falls back to words of its own when the editor wrote no title or description', async () => {
    const created = await world.payload.create({ collection: 'categories', data: { name: 'Food', slug: 'food', personas: [world.personas.photographer] }, context: { disableRevalidate: true } })
    const meta = await page.generateMetadata(props('food'))
    expect(meta.title).toBe('Food professionals')
    expect(meta.description).toBe('See who shoots Food and send a brief.')
    await world.payload.delete({ collection: 'categories', id: created.id, context: { disableRevalidate: true } })
  })
})
