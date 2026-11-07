import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { getBriefByKey, getMatchPage } = await import('@/modules/booking/match')
const { matchView } = await import('@/modules/booking/views')
const { getDirectoryContext } = await import('@/modules/creators')

describe('CP-FR-011 gender, nationality and experience', () => {
  let world: BookingWorld
  const set = async (key: string, data: Record<string, unknown>) =>
    (await getTestPayload()).update({ collection: 'creator-profiles', id: world.creators[key]!.id, data: data as never, draft: false, overrideAccess: true, context: quiet })
  const codes = async (over: Record<string, string>) => {
    const b = await briefFor(submitBrief as never, world, over)
    const page = await getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())
    return page.sections[0]!.creators.map((c) => c.code).sort()
  }

  beforeAll(async () => {
    world = await bookingWorld()
    await set('sara', { gender: 'woman', nationality: 'AE', yearsExperience: 8 })
    await set('omar', { gender: 'man', nationality: 'EG', yearsExperience: 12 })
  })
  beforeEach(() => asVisitor())

  it('QM-US1-S1 "shot by a woman/man" matches the creator\'s gender with no editor tagging; no gender never matches', async () => {
    expect(await codes({ occasion: 'event', shotBy: 'woman' })).toEqual([world.creators.sara!.code])
    expect(await codes({ occasion: 'portrait', shotBy: 'man' })).toEqual([world.creators.omar!.code])
    expect(await codes({ occasion: 'clinic', shotBy: 'anyone' })).toEqual([world.creators.omar!.code, world.creators.sara!.code].sort())
  })

  it('CP-FR-011 step 2 rows show years of experience after the specialties', async () => {
    const b = await briefFor(submitBrief as never, world, { occasion: 'products', shotBy: 'woman' })
    const page = await getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())
    const payload = await getTestPayload()
    const view = matchView(page, { ref: b.ref, key: b.key, locale: 'en', picks: [], date: world.date, ctx: await getDirectoryContext('en'), settings: await payload.findGlobal({ slug: 'site-settings', depth: 1 }), sentence: '', experience: (n) => `${n} years` })
    expect(view.sections[0]!.creators.map((c) => c.meta)).toEqual([expect.stringMatching(/ · 8 years$/)])
  })

  it('gender is never publicly readable; nationality and experience are', async () => {
    const payload = await getTestPayload()
    const anonymous = await payload.findByID({ collection: 'creator-profiles', id: world.creators.sara!.id, overrideAccess: false, depth: 0 })
    expect(anonymous).not.toHaveProperty('gender')
    expect(anonymous).toMatchObject({ nationality: 'AE', yearsExperience: 8 })
    const other = await payload.findByID({ collection: 'creator-profiles', id: world.creators.sara!.id, user: world.creators.omar!.user, overrideAccess: false, depth: 0 })
    expect(other).not.toHaveProperty('gender')
    const owner = await payload.findByID({ collection: 'creator-profiles', id: world.creators.sara!.id, user: world.creators.sara!.user, overrideAccess: false, depth: 0, draft: true })
    expect(owner.gender).toBe('woman')
    expect((await payload.findByID({ collection: 'creator-profiles', id: world.creators.sara!.id, user: world.admin, overrideAccess: false, depth: 0 })).gender).toBe('woman')
  })

  it('rejects a nationality outside the list and experience outside 0–60', async () => {
    await expect(set('sara', { nationality: 'XX' })).rejects.toThrow()
    await expect(set('sara', { yearsExperience: 61 })).rejects.toThrow()
  })
})
