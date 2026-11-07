import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingWorld, type BookingWorld } from './setup/booking'
import { asVisitor, form, redirectOf } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { previewMatches } = await import('@/modules/booking/preview-action')
const { submitBrief } = await import('@/modules/brief/actions')

describe('QM-US1-S7 matches in the brief bar', () => {
  let world: BookingWorld
  const answers = (over: Record<string, string> = {}) => ({
    locale: 'en',
    values: { persona: 'photographer', occasion: 'event', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone', ...over },
    custom: {},
  })

  beforeAll(async () => {
    world = await bookingWorld()
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-profiles', id: world.creators.sara!.id, data: { gender: 'woman', yearsExperience: 8 } as never, draft: false, overrideAccess: true, context: quiet })
    await payload.update({ collection: 'creator-profiles', id: world.creators.omar!.id, data: { gender: 'man' } as never, draft: false, overrideAccess: true, context: quiet })
  })
  beforeEach(() => asVisitor())

  it('QM-FR-014 previews free, matching creators with the one price, and saves nothing', async () => {
    const payload = await getTestPayload()
    const before = (await payload.count({ collection: 'briefs' })).totalDocs
    const preview = await previewMatches(answers())
    expect(preview?.sections).toHaveLength(1)
    expect(preview!.sections[0]).toMatchObject({ persona: 'photographer', price: expect.stringMatching(/AED/), total: 2 })
    expect(preview!.sections[0]!.creators.map((c) => c.pick).sort()).toEqual([`photographer:${world.creators.omar!.code}`, `photographer:${world.creators.sara!.code}`].sort())
    expect((await payload.count({ collection: 'briefs' })).totalDocs).toBe(before)
  })

  it('uses the same rules as step 2: "shot by a woman" lists only women, with their experience', async () => {
    const preview = await previewMatches(answers({ shotBy: 'woman' }))
    // The years label is next-intl's plural message; the test stand-in leaves the template, so check it is there.
    expect(preview!.sections[0]!.creators).toEqual([expect.objectContaining({ code: world.creators.sara!.code, meta: expect.stringMatching(/^Portrait · \S/) })])
  })

  it('returns nothing when Quick Match is off or no professional is chosen', async () => {
    expect(await previewMatches(answers({ persona: '' }))).toBeNull()
    expect(await previewMatches(answers({ persona: 'astronaut' }))).toBeNull()
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: false } } as never, context: quiet })
    expect(await previewMatches(answers())).toBeNull()
    await payload.updateGlobal({ slug: 'site-settings', data: { quickMatch: { enabled: true } } as never, context: quiet })
  })

  it('choosing a creator in the bar saves the brief and goes straight to step 3 with them', async () => {
    const pick = `photographer:${world.creators.sara!.code}`
    const url = await redirectOf(() =>
      submitBrief({ status: 'idle' }, form({ locale: 'en', sourcePath: '/', persona: 'photographer', occasion: 'portrait', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone', pick })),
    )
    expect(url).toMatch(new RegExp(`^/match/B-[A-Z0-9]{5}/[A-Za-z0-9_-]{43}/details\\?pick=${encodeURIComponent(pick).replace(/%/g, '%')}$`))
  })

  it('several types: a creator chosen for one type keeps step 2 for the other', async () => {
    const pick = `photographer:${world.creators.sara!.code}`
    const state = await submitBrief({ status: 'idle' }, form({ locale: 'en', js: '1', sourcePath: '/', persona: ['photographer', 'videographer'], occasion: 'clinic', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone', pick }))
    expect(state.status === 'ok' && state.matchUrl).toMatch(/^\/match\/B-[A-Z0-9]{5}\/[A-Za-z0-9_-]{43}\?pick=photographer%3A/)
  })

  it('ignores a pick for a type the brief does not have', async () => {
    const state = await submitBrief({ status: 'idle' }, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'car', date: world.date, duration: '2h', location: 'dubai', shotBy: 'anyone', pick: `videographer:${world.creators.vera!.code}` }))
    expect(state.status === 'ok' && state.matchUrl).toMatch(/^\/match\/B-[A-Z0-9]{5}\/[A-Za-z0-9_-]{43}$/)
  })
})
