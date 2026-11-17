import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { briefByRef, offersWorld, setOffers } from './setup/offers'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { getBriefByKey, getMatchPage } = await import('@/modules/booking/match')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { seedDemoOffers } = await import('@/shared/payload/seed/demo-offers')

/** Feature 022 US6: the team switches the model and its numbers; sent briefs keep what they were sent with. */
describe('OF-US6 the team controls the model', () => {
  let world: BookingWorld
  let day = 0
  const send = async () => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })

  beforeAll(async () => {
    world = await offersWorld()
    asVisitor()
  })

  it('OF-US6-S1 with the switch off, step 2 lists everyone free at the fixed price', async () => {
    const payload = await getTestPayload()
    await setOffers(payload, { enabled: false })
    try {
      const b = await send()
      const page = await getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())
      expect(page.mode).toBe('fixed')
      expect(page.sections[0]!.offers).toBeUndefined()
      expect(page.sections[0]!.creators.length).toBe(2)
      expect(page.total.ok).toBe(true)
    } finally {
      await setOffers(payload, { enabled: true })
    }
  })

  it('OF-US6-S2 a brief sent with offers on stays an offers brief after the switch is turned off', async () => {
    const payload = await getTestPayload()
    const b = await send()
    await setOffers(payload, { enabled: false })
    try {
      await answerBrief({ payload, user: world.creators.sara!.user as never, locale: 'en', now: new Date() }, b.ref, { persona: String(world.personas.photographer), decision: 'accept' })
      const page = await getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())
      expect(page.mode).toBe('offers')
      expect(page.sections[0]!.offers!.length).toBe(1)
    } finally {
      await setOffers(payload, { enabled: true })
    }
  })

  it('OF-US6-S3 a changed fee leaves sent briefs at the fee they were sent with', async () => {
    const payload = await getTestPayload()
    const b = await send()
    await setOffers(payload, { enabled: true, feePercent: 15 })
    try {
      expect(((await briefByRef(b.ref)).offers as { feePercent: number }).feePercent).toBe(10)
      const later = await send()
      expect(((await briefByRef(later.ref)).offers as { feePercent: number }).feePercent).toBe(15)
    } finally {
      await setOffers(payload, { enabled: true, feePercent: 10 })
    }
  })

  it('OF-US6-S4 admins read the client prices and every offer with its amount and changes', async () => {
    const payload = await getTestPayload()
    const b = await send()
    await answerBrief({ payload, user: world.creators.omar!.user as never, locale: 'en', now: new Date() }, b.ref, { persona: String(world.personas.photographer), decision: 'accept' })
    const brief = await payload.findByID({ collection: 'briefs', id: (await briefByRef(b.ref)).id as number, depth: 0, overrideAccess: false, user: world.admin as never })
    expect((brief as { budgets?: unknown[] }).budgets?.length).toBe(1)
    const answers = await payload.find({ collection: 'brief-answers', where: { brief: { equals: brief.id } }, depth: 0, overrideAccess: false, user: world.admin as never })
    expect(answers.docs[0]).toMatchObject({ decision: 'accepted', revisions: 0 })
    expect((answers.docs[0] as { amountFils?: number }).amountFils).toBeGreaterThan(0)
  })

  it('OF-US6-S1 the opt-in demo seed turns the switch on, twice the same, and is refused on a real host', async () => {
    const payload = await getTestPayload()
    await setOffers(payload, { enabled: false })
    const log = () => {}
    await expect(seedDemoOffers(payload, { siteUrl: 'https://shoot.example.com', log })).rejects.toThrow()
    await seedDemoOffers(payload, { siteUrl: 'http://localhost:3000', log })
    await seedDemoOffers(payload, { siteUrl: 'http://localhost:3000', log })
    const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as { quickMatch?: { offers?: { enabled?: boolean; feePercent?: number } } }
    expect(settings.quickMatch?.offers).toMatchObject({ enabled: true, feePercent: 10 })
  })
})

