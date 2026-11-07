import { beforeAll, describe, expect, it } from 'vitest'
import { getSpecialtyPage, getSpecialtyCounts } from '@/modules/creators/queries'
import sitemap from '@/app/sitemap'
import { quiet } from './setup/payload'
import { getPublicCreators } from '@/modules/creators'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'

describe('CP-US4 specialty pages', () => {
  let world: CreatorWorld
  const ids: Record<string, number> = {}

  /** A creator offering `specialties`, with one sample row per entry of `samples` (category → rows). */
  const make = async (name: string, samples: Record<'portrait' | 'events', number>, { publishIt = true, specialties }: { publishIt?: boolean; specialties?: number[] } = {}) => {
    const provider = await makeProvider(world)
    const image = await uploadImage(world, provider, `${name}.png`, `${name} work`)
    const rows = [
      ...Array.from({ length: samples.portrait }, (_, i) => ({ kind: 'image', image: image.id, category: world.category, caption: `${name} portrait ${i + 1}` })),
      ...Array.from({ length: samples.events }, (_, i) => ({ kind: 'image', image: image.id, category: world.otherCategory, caption: `${name} event ${i + 1}` })),
    ]
    const profile = await createDraft(world, provider, { displayName: name, specialties: specialties ?? [world.category, world.otherCategory], samples: rows })
    if (publishIt) await publish(world, profile.id)
    ids[name] = profile.id
    return profile
  }

  beforeAll(async () => {
    world = await creatorWorld()
  })

  it('CP-US4-S2 returns the specialty\'s title, description and intro from the CMS in the visitor\'s language', async () => {
    const en = await getSpecialtyPage('portrait', 'en')
    expect(en!.category.name).toBe('Portrait')
    expect(en!.title).toBe('Portrait photographers and videographers in the UAE')
    expect(en!.description).toContain('portrait shoot')
    expect(en!.intro).toContain('Portraits of people')
    const ar = await getSpecialtyPage('portrait', 'ar')
    expect(ar!.category.name).toBe('بورتريه')
    expect(ar!.title).toBe('مصورو بورتريه في الإمارات')
    expect(ar!.title).not.toBe(en!.title)
  })

  it('CP-US4-S2 falls back to English for text with no translation, and says nothing when the editor wrote none', async () => {
    const payload = world.payload
    const created = await payload.create({
      collection: 'categories',
      data: { name: 'Food', slug: 'food', personas: [world.personas.photographer], seo: { title: 'Food photography in the UAE' } },
      context: quiet,
    })
    const ar = await getSpecialtyPage('food', 'ar')
    expect(ar!.title).toBe('Food photography in the UAE')
    expect(ar!.description).toBe('')
    expect(ar!.intro).toBe('')
    await payload.delete({ collection: 'categories', id: created.id, context: quiet })
  })

  it('CP-US4-S1 a specialty with nobody listed has no counts, no creators and no samples (never invented)', async () => {
    const page = await getSpecialtyPage('portrait', 'en')
    expect(page!.counts).toEqual({ samples: 0, pros: 0 })
    expect(page!.creators).toEqual([])
    expect(page!.samples).toEqual([])
    expect(await getSpecialtyCounts('en')).toEqual({})
  })

  it('CP-US4-S1 counts the samples and professionals computed from the listed creators of that specialty', async () => {
    await make('Alma', { portrait: 2, events: 1 })
    await make('Basel', { portrait: 1, events: 0 })
    await make('Carla', { portrait: 0, events: 3 }, { specialties: [world.otherCategory] })
    const portrait = await getSpecialtyPage('portrait', 'en')
    expect(portrait!.counts).toEqual({ samples: 3, pros: 2 })
    expect(portrait!.creators.map((c) => c.displayName).sort()).toEqual(['Alma', 'Basel'])
    const events = await getSpecialtyPage('events', 'en')
    // Basel offers events too (a pro without a single events sample), so he counts as a pro and adds no sample.
    expect(events!.counts).toEqual({ samples: 4, pros: 3 })
    expect(events!.creators.map((c) => c.displayName).sort()).toEqual(['Alma', 'Basel', 'Carla'])
    expect(await getSpecialtyCounts('en')).toMatchObject({ [String(world.category)]: { samples: 3, pros: 2 }, [String(world.otherCategory)]: { samples: 4, pros: 3 } })
  })

  it('CP-US1 a creator\'s photo reaches the cached summaries with a usable url (populate must select the filename)', async () => {
    const provider = await makeProvider(world)
    const photo = await uploadImage(world, provider, 'face.png', 'Her face')
    const profile = await createDraft(world, provider, { displayName: 'Photo Pro', photo: photo.id })
    await publish(world, profile.id)
    const summary = (await getPublicCreators('en')).find((c) => c.displayName === 'Photo Pro')
    expect(summary!.photo?.url).toMatch(/face/)
    await world.payload.delete({ collection: 'creator-profiles', id: profile.id, overrideAccess: true, context: quiet })
  })

  it('CP-US4-S1 shows one sample per creator before a second, only of that specialty, with who shot it', async () => {
    const page = await getSpecialtyPage('portrait', 'en')
    // Alma (older, 2 portrait rows) and Basel (newer, 1): Basel first, then Alma, then Alma's second.
    expect(page!.samples.map((s) => s.caption)).toEqual(['Basel portrait 1', 'Alma portrait 1', 'Alma portrait 2'])
    expect(page!.samples.every((s) => !s.caption.includes('event'))).toBe(true)
    const first = page!.samples[0]!
    expect(first.creatorName).toBe('Basel')
    expect(first.code).toMatch(/^[A-Z0-9]{5}$/)
    expect(first.alt).toBe('Basel work')
    expect(first.thumb.url).toBeTruthy()
    expect(first.thumb.width).toBeGreaterThan(0)
  })

  it('CP-US4-S1 unpublished, paused and suspended creators change neither the counts nor the list', async () => {
    await make('Draftee', { portrait: 5, events: 0 }, { publishIt: false })
    const hidden = await make('Hidden', { portrait: 4, events: 0 })
    const suspended = await make('Banned', { portrait: 4, events: 0 })
    expect((await getSpecialtyPage('portrait', 'en'))!.counts).toEqual({ samples: 11, pros: 4 })
    await world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, hidden.id))!.id, data: { active: false }, overrideAccess: true, context: quiet })
    await world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, suspended.id))!.id, data: { suspended: true }, overrideAccess: true, context: quiet })
    const page = await getSpecialtyPage('portrait', 'en')
    expect(page!.counts).toEqual({ samples: 3, pros: 2 })
    expect(page!.creators.map((c) => c.displayName).sort()).toEqual(['Alma', 'Basel'])
    expect(page!.samples).toHaveLength(3)
  })

  it('CP-US4-S1 never shows more than 24 samples', async () => {
    await make('Zed', { portrait: 30, events: 0 })
    const page = await getSpecialtyPage('portrait', 'en')
    expect(page!.counts.samples).toBe(33)
    expect(page!.samples).toHaveLength(24)
    // One sample per creator first: all three listed creators appear before Zed's second.
    expect(page!.samples.slice(0, 3).map((s) => s.creatorName).sort()).toEqual(['Alma', 'Basel', 'Zed'])
  })

  it('CP-US4-S1 an unknown, inactive or out-of-audience category is not found', async () => {
    const payload = world.payload
    expect(await getSpecialtyPage('no-such-thing', 'en')).toBeNull()
    const events = (await payload.find({ collection: 'categories', where: { slug: { equals: 'events' } }, limit: 1, depth: 0 })).docs[0]!
    await payload.update({ collection: 'categories', id: events.id, data: { active: false }, context: quiet })
    expect(await getSpecialtyPage('events', 'en')).toBeNull()
    await payload.update({ collection: 'categories', id: events.id, data: { active: true }, context: quiet })
    expect(await getSpecialtyPage('events', 'en')).not.toBeNull()

    const teacher = await payload.create({ collection: 'personas', data: { singular: 'Teacher', plural: 'Teachers', slug: 'teacher' }, context: quiet })
    await payload.create({ collection: 'categories', data: { name: 'Math', slug: 'math', personas: [teacher.id] }, context: quiet })
    expect(await getSpecialtyPage('math', 'en')).toBeNull()
  })

  it('CP-US4-S2 the sitemap lists each specialty page with both languages, once creators are listed', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls.some((u) => u.endsWith('/work/portrait'))).toBe(true)
    expect(urls.some((u) => u.endsWith('/work/math'))).toBe(false)
    const portrait = (await sitemap()).find((e) => e.url.endsWith('/work/portrait'))!
    expect(portrait.alternates?.languages).toMatchObject({ ar: expect.stringContaining('/ar/work/portrait') })
  })
})
