import type { CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { answerOf, briefByRef, offersWorld } from './setup/offers'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { withdrawAnswer } = await import('@/modules/inbox/commands/withdraw-answer')
const { creatorInbox } = await import('@/modules/inbox/queries')

const isInbox = (v: unknown): v is CreatorBriefsV1 => typeof v === 'object' && v !== null && 'open' in v

/** Feature 022 US2 and US3: creators see the client's price and accept it or offer another, within the rules. */
describe('OF-US2 OF-US3 creators answer with a price', () => {
  let world: BookingWorld
  let photo: string
  let day = 0
  const send = async (over: Record<string, string> = {}) => briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)), ...over })
  const actor = async (key: string) => ({ payload: await getTestPayload(), user: world.creators[key]!.user as never, locale: 'en' as const, now: new Date() })
  const budgetOf = async (ref: string) => ((await briefByRef(ref)).budgets as { amountFils: number }[])[0]!.amountFils

  beforeAll(async () => {
    world = await offersWorld()
    photo = String(world.personas.photographer)
    asVisitor()
  })

  it('OF-US2-S1 the card shows the client price and range, never the client or the fee', async () => {
    const { ref } = await send()
    const inbox = (await creatorInbox({ payload: await getTestPayload(), locale: 'en', now: new Date() }, (world.creators.sara!.user as { id: number }).id))!
    const item = inbox.open.find((i) => i.ref === ref)!
    expect(item.budgetFils).toBe(await budgetOf(ref))
    expect(item.range?.minFils).toBeLessThan(item.budgetFils!)
    expect(item.revisionsLeft).toBe(3)
    const json = JSON.stringify(item)
    expect(json).not.toMatch(/whatsapp|\+971|fee|Layla/i)
  })

  it('OF-US2-S2 a creator in another emirate does not see it', async () => {
    const { ref } = await send()
    const inbox = await creatorInbox({ payload: await getTestPayload(), locale: 'en', now: new Date() }, (world.creators.abu!.user as { id: number }).id)
    expect(inbox?.open.map((i) => i.ref) ?? []).not.toContain(ref)
  })

  it('OF-US2-S3 the announcement records how many creators it went to', async () => {
    const { ref } = await send()
    const { announceBrief } = await import('@/modules/inbox')
    await announceBrief(await getTestPayload(), (await briefByRef(ref)).id as number)
    expect(((await briefByRef(ref)).offers as { sentTo?: number }).sentTo).toBe(2)
  })

  it('OF-US3-S1 OF-US3-S8 accepting without an amount offers the client price', async () => {
    const { ref } = await send()
    const result = await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept' })
    expect(isInbox(result)).toBe(true)
    expect((await answerOf(ref, world.creators.sara!.id))!.amountFils).toBe(await budgetOf(ref))
    expect((result as CreatorBriefsV1).accepted.find((i) => i.ref === ref)?.offerFils).toBe(await budgetOf(ref))
  })

  it('OF-US3-S2 OF-US3-S3 another price inside the range is recorded; outside it is refused', async () => {
    const { ref } = await send()
    const budget = await budgetOf(ref)
    const higher = Math.round((budget * 1.2) / 100) * 100
    await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept', amountFils: higher })
    expect((await answerOf(ref, world.creators.sara!.id))!.amountFils).toBe(higher)
    expect(await answerBrief(await actor('omar'), ref, { persona: photo, decision: 'accept', amountFils: budget * 10 })).toMatchObject({ status: 422, code: 'offers.errors.outOfRange' })
    expect(await answerOf(ref, world.creators.omar!.id)).toBeUndefined()
  })

  it('OF-US3-S4 at most three changes', async () => {
    const { ref } = await send()
    const budget = await budgetOf(ref)
    await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept' })
    for (const step of [1, 2, 3]) {
      const r = await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept', amountFils: budget + step * 1000 })
      expect(isInbox(r)).toBe(true)
    }
    expect((await answerOf(ref, world.creators.sara!.id))!.revisions).toBe(3)
    expect(await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept', amountFils: budget + 9000 })).toMatchObject({ status: 409, code: 'offers.errors.tooManyChanges' })
  })

  it('OF-US3-S5 withdrawing removes the offer', async () => {
    const { ref } = await send()
    await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept' })
    await withdrawAnswer(await actor('sara'), ref, photo)
    expect((await answerOf(ref, world.creators.sara!.id))!.withdrawnAt).toBeTruthy()
  })

  it('OF-US3-S6 locked while an issued quotation includes it', async () => {
    const b = await send()
    await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept' })
    await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.sara!.code}` })
    expect(await answerBrief(await actor('sara'), b.ref, { persona: photo, decision: 'accept', amountFils: (await budgetOf(b.ref)) + 1000 })).toMatchObject({ status: 409, code: 'inbox.errors.alreadyPicked' })
    expect(await withdrawAnswer(await actor('sara'), b.ref, photo)).toMatchObject({ status: 409, code: 'inbox.errors.alreadyPicked' })
    // Once that quotation expires, the offer is the creator's to change again.
    const payload = await getTestPayload()
    await payload.update({ collection: 'bookings', where: { brief: { equals: (await briefByRef(b.ref)).id } }, data: { state: 'expired' }, overrideAccess: true, context: { ...quiet, transition: true } })
    expect(isInbox(await withdrawAnswer(await actor('sara'), b.ref, photo))).toBe(true)
  })

  it('OF-US3-S7 not for me works as before', async () => {
    const { ref } = await send()
    const r = await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'reject' })
    expect((r as CreatorBriefsV1).rejected.map((i) => i.ref)).toContain(ref)
    expect((await answerOf(ref, world.creators.sara!.id))!.amountFils ?? null).toBeNull()
  })

  it('OF-US4-S9 the client hears about each new or changed offer once', async () => {
    const payload = await getTestPayload()
    const { ref } = await send()
    const brief = await briefByRef(ref)
    await payload.update({ collection: 'briefs', id: brief.id as number, data: { member: (world.creators.vera!.user as { id: number }).id } as never, overrideAccess: true, context: quiet })
    await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept' })
    await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept', amountFils: (await budgetOf(ref)) + 1000 })
    const rows = await payload.find({ collection: 'notifications', where: { and: [{ brief: { equals: brief.id } }, { event: { equals: 'offer-new' } }, { channel: { equals: 'in-app' } }] }, depth: 0, overrideAccess: true })
    expect(rows.totalDocs).toBe(2)
    expect(rows.docs.map((d) => d.text).join(' ')).not.toMatch(/fee/i)
  })

  it('OF-EC-01 a closed brief refuses new offers', async () => {
    const payload = await getTestPayload()
    const { ref } = await send()
    await payload.update({ collection: 'briefs', where: { reference: { equals: ref } }, data: { status: 'closed' }, overrideAccess: true, context: quiet })
    expect(await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'accept' })).toMatchObject({ status: 409, code: 'inbox.errors.briefClosed' })
  })
})
