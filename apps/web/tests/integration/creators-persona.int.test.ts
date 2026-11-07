import { beforeAll, describe, expect, it } from 'vitest'
import { buildDirectory, getCreatorByCode, getDirectoryContext, getPublicCreators, getSpecialtyPage } from '@/modules/creators'
import { createDraft, creatorWorld, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'
import { quiet } from './setup/payload'

/**
 * CP-FR-009 / persona-extensibility: a profession the code has never heard of gets profiles, a
 * directory entry and a specialty page through the CMS alone. "Tutors" and "Algebra" appear nowhere in the source.
 */
describe('CP-FR-009 a new persona gets creator profiles with no code change', () => {
  let world: CreatorWorld
  let tutor: number
  let algebra: number
  let profileId: number
  let code: string

  const audience = (ids: number[]) => world.payload.updateGlobal({ slug: 'site-settings', data: { activePersonas: ids }, context: quiet })

  beforeAll(async () => {
    world = await creatorWorld()
    const { payload } = world
    const persona = await payload.create({ collection: 'personas', data: { singular: 'Tutor', plural: 'Tutors', slug: 'tutor' }, context: quiet })
    tutor = persona.id
    const category = await payload.create({
      collection: 'categories',
      data: { name: 'Algebra', slug: 'algebra', personas: [tutor], seo: { title: 'Algebra tutors', intro: 'Learn it properly.' } },
      context: quiet,
    })
    algebra = category.id
    await audience([world.personas.photographer, world.personas.videographer, tutor])
  })

  it('a provider registered for it creates a profile in its own specialties, and an admin publishes it', async () => {
    const provider = await makeProvider(world, tutor)
    const image = await uploadImage(world, provider, 'lesson.png', 'A lesson')
    const profile = await createDraft(world, provider, {
      displayName: 'Maha Tutor',
      personas: [tutor],
      specialties: [algebra],
      samples: [{ kind: 'image', image: image.id, category: algebra }],
    })
    profileId = profile.id
    code = profile.code as string
    await publish(world, profile.id)
    expect(code).toMatch(/^[A-Z0-9]{5}$/)
  })

  it('it is in the directory, filterable by the new type and the new specialty', async () => {
    const [creators, context] = await Promise.all([getPublicCreators('en'), getDirectoryContext('en')])
    expect(creators.map((c) => c.displayName)).toContain('Maha Tutor')
    expect(context.personas.map((p) => p.slug)).toContain('tutor')
    expect(context.specialties.map((s) => s.slug)).toContain('algebra')
    const view = buildDirectory({ creators, context, params: { type: 'tutor', specialty: 'algebra' }, locale: 'en' })
    expect(view.total).toBe(1)
    expect(view.topHit?.displayName).toBe('Maha Tutor')
  })

  it('it has a specialty page with its own text, counts and samples', async () => {
    const page = await getSpecialtyPage('algebra', 'en')
    expect(page!.title).toBe('Algebra tutors')
    expect(page!.intro).toBe('Learn it properly.')
    expect(page!.counts).toEqual({ samples: 1, pros: 1 })
    expect(page!.creators.map((c) => c.displayName)).toEqual(['Maha Tutor'])
    expect(page!.samples).toHaveLength(1)
  })

  it('it can be booked as the new type, so the booking step offers only types the creator has', async () => {
    const found = await getCreatorByCode(code, 'en')
    expect(found!.canBook).toBe(true)
  })

  it('Edge: when the persona leaves the audience the direct link still works, but the creator is not listed or bookable', async () => {
    await audience([world.personas.photographer, world.personas.videographer])
    expect((await getPublicCreators('en')).map((c) => c.displayName)).not.toContain('Maha Tutor')
    expect((await getPublicCreators('en', { listedOnly: false })).map((c) => c.displayName)).toContain('Maha Tutor')
    const found = await getCreatorByCode(code, 'en')
    expect(found!.creator.displayName).toBe('Maha Tutor')
    expect(found!.canBook).toBe(false)
    // Its specialty page is gone with it: no category of the audience offers it.
    expect(await getSpecialtyPage('algebra', 'en')).toBeNull()
    expect(profileId).toBeGreaterThan(0)
  })
})
