import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { answerOf, briefByRef, offersWorld } from './setup/offers'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { getBriefByKey, getMatchPage, matchStamp } = await import('@/modules/booking/match')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { declineOffer } = await import('@/modules/inbox/commands/decline-offer')
const { announceBrief } = await import('@/modules/inbox')

/** Feature 022 US4: the client's offers page (step 2). */
describe('OF-US4 the client sees the offers and chooses', () => {
  let world: BookingWorld
  let photo: string
  let day = 0
  const send = async (over: Record<string, string> = {}) => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)), ...over })
  const actor = async (key: string) => ({ payload: await getTestPayload(), user: world.creators[key]!.user as never, locale: 'en' as const, now: new Date() })
  const page = async (b: { ref: string; key: string }) => getMatchPage((await getBriefByKey(b.ref, b.key))!, 'en', new Date())
  const budgetOf = async (ref: string) => ((await briefByRef(ref)).budgets as { amountFils: number }[])[0]!.amountFils

  beforeAll(async () => {
    world = await offersWorld()
    photo = String(world.personas.photographer)
    asVisitor()
  })

  it('OF-US4-S1 before any offer: offers mode, how many it went to, and no creators listed', async () => {
    const b = await send()
    await announceBrief(await getTestPayload(), (await briefByRef(b.ref)).id as number)
    const p = await page(b)
    expect(p.mode).toBe('offers')
    expect(p.sentTo).toBe(2)
    expect(p.sections[0]!.offers).toEqual([])
    expect(p.sections[0]!.creators).toEqual([])
    expect(p.sections[0]!.budgetFils).toBe(await budgetOf(b.ref))
  })

  it('OF-US4-S3 OF-US4-S4 offers lowest total first, each with the fee and the total; the client price is marked', async () => {
    const b = await send()
    const budget = await budgetOf(b.ref)
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept', amountFils: budget + 10_000 })
    await answerBrief(await actor('omar'), b.ref, { persona: photo, decision: 'accept' })
    const offers = (await page(b)).sections[0]!.offers!
    expect(offers.map((o) => o.creator.code)).toEqual([world.creators.omar!.code, world.creators.sara!.code])
    expect(offers[0]).toMatchObject({ amountFils: budget, feeFils: Math.round(budget * 0.1 / 100) * 100, atYourPrice: true })
    expect(offers[0]!.totalFils).toBe(offers[0]!.amountFils + offers[0]!.feeFils)
    expect(offers[1]!.atYourPrice).toBe(false)
  })

  it('OF-US4-S2 the stamp changes when an offer arrives or changes, and not otherwise', async () => {
    const b = await send()
    const before = await matchStamp(b.ref, b.key, 'en', new Date())
    expect(await matchStamp(b.ref, b.key, 'en', new Date())).toBe(before)
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const after = await matchStamp(b.ref, b.key, 'en', new Date())
    expect(after).not.toBe(before)
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept', amountFils: (await budgetOf(b.ref)) + 1000 })
    expect(await matchStamp(b.ref, b.key, 'en', new Date())).not.toBe(after)
    expect(await matchStamp(b.ref, 'wrong-key', 'en', new Date())).toBeNull()
  })

  it('OF-US4-S5 declining hides the offer, tells the creator, and blocks a new offer from them', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const brief = (await getBriefByKey(b.ref, b.key))!
    expect(await declineOffer(await getTestPayload(), brief, { personaId: photo, creatorId: String(world.creators.sara!.id), now: new Date() })).toEqual({ ok: true })
    expect((await page(b)).sections[0]!.offers).toEqual([])
    expect((await answerOf(b.ref, world.creators.sara!.id))!.clientDecision).toBe('declined')
    const told = await (await getTestPayload()).find({ collection: 'notifications', where: { and: [{ brief: { equals: brief.id } }, { event: { equals: 'offer-declined' } }] }, depth: 0, overrideAccess: true })
    expect(told.totalDocs).toBeGreaterThan(0)
    expect(await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept', amountFils: (await budgetOf(b.ref)) + 1000 })).toMatchObject({ status: 409, code: 'offers.errors.declined' })
  })

  it('OF-US4-S8 a creator who blocks the date drops out of the offers', async () => {
    const b = await send()
    await answerBrief(await actor('omar'), b.ref, { persona: photo, decision: 'accept' })
    const payload = await getTestPayload()
    const date = String((await briefByRef(b.ref)).date).slice(0, 10)
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.omar!.id, user: (world.creators.omar!.user as { id: number }).id, date, kind: 'blocked' } as never, overrideAccess: true, context: quiet })
    expect((await page(b)).sections[0]!.offers!.map((o) => o.creator.code)).not.toContain(world.creators.omar!.code)
  })

  it('OF-US4-S8 no creator in the emirate: nobody was told, the page shows no one', async () => {
    const b = await send({ location: 'fujairah' })
    await announceBrief(await getTestPayload(), (await briefByRef(b.ref)).id as number)
    const p = await page(b)
    expect(p.sentTo).toBe(0)
    expect(p.sections[0]!.offers).toEqual([])
  })

  it('OF-EC-01 once the shoot date passes, the offers close for the client: none listed, decline refused', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    const brief = (await getBriefByKey(b.ref, b.key))!
    const later = new Date(Date.parse(`${String(brief.date).slice(0, 10)}T12:00:00Z`) + 2 * 86_400_000)
    const p = await getMatchPage(brief, 'en', later)
    expect(p.closed).toBe(true)
    expect(p.sections[0]!.offers).toEqual([])
    const open = await getMatchPage(brief, 'en', new Date())
    expect(open.closed).toBeUndefined()
    expect(open.stamp).not.toBe(p.stamp)
    const refused = await declineOffer(await getTestPayload(), brief as never, { personaId: photo, creatorId: String(world.creators.sara!.id), now: later })
    expect(refused).toMatchObject({ status: 409, code: 'inbox.errors.briefClosed' })
  })

  it('OF-EC-03 one creator offering on two types appears in both lists, each its own offer', async () => {
    const payload = await getTestPayload()
    const video = String(world.personas.videographer)
    const sara = world.creators.sara!
    const profile = await payload.findByID({ collection: 'creator-profiles', id: sara.id, depth: 0, overrideAccess: true })
    const before = (profile.personas ?? []) as unknown[]
    await payload.update({ collection: 'creator-profiles', id: sara.id, data: { personas: [...before, Number(video)] } as never, overrideAccess: true, context: quiet })
    try {
      const b = await send()
      const brief = await briefByRef(b.ref)
      // The seeded builder asks one type; a two-type brief is set up directly (both types, a price each).
      const budgets = brief.budgets as { persona: unknown; amountFils: number; suggestedFils?: number | null }[]
      await payload.update({ collection: 'briefs', id: brief.id as number, data: { persona: [Number(photo), Number(video)], budgets: [...budgets, { ...budgets[0]!, id: undefined, persona: Number(video) }] } as never, overrideAccess: true, context: quiet })
      await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
      await answerBrief(await actor('sara'), b.ref, { persona: video, decision: 'accept', amountFils: budgets[0]!.amountFils + 10000 })
      const p = await page(b)
      expect(p.sections.map((x) => x.offers!.map((o) => o.creator.code))).toEqual([[sara.code], [sara.code]])
      expect(p.sections[1]!.offers![0]!.amountFils).toBe(p.sections[0]!.offers![0]!.amountFils + 10000)
    } finally {
      await payload.update({ collection: 'creator-profiles', id: sara.id, data: { personas: before } as never, overrideAccess: true, context: quiet })
    }
  })

  it('OF-US4-S1 while waiting, step 2 lists who can still answer; offering or "not for me" takes a creator off it', async () => {
    const b = await send()
    const codes = async () => (await page(b)).sections[0]!.waiting!.map((c) => c.code).sort()
    const sara = world.creators.sara!.code
    const omar = world.creators.omar!.code
    expect(await codes()).toEqual([omar, sara].sort())
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    expect(await codes()).toEqual([omar])
    await answerBrief(await actor('omar'), b.ref, { persona: photo, decision: 'reject' })
    expect(await codes()).toEqual([])
  })
})

