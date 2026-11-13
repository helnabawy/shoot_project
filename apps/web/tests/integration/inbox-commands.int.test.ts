import type { CreatorBriefsV1 } from '@shoot/domain/api/v1'
import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { withdrawAnswer } = await import('@/modules/inbox/commands/withdraw-answer')

const isInbox = (v: unknown): v is CreatorBriefsV1 => typeof v === 'object' && v !== null && 'open' in v

describe('BI-US2 BI-US3 creators accept, reject, undo and withdraw', () => {
  let world: BookingWorld
  let photo: string
  const actor = async (key: string) => ({ payload: await getTestPayload(), user: world.creators[key]!.user as never, locale: 'en' as const, now: new Date() })
  const inbox = async (key: string, run: (a: Awaited<ReturnType<typeof actor>>) => Promise<unknown>) => {
    const result = await run(await actor(key))
    if (!isInbox(result)) throw new Error(`expected an inbox, got ${JSON.stringify(result)}`)
    return result
  }
  const refs = (list: CreatorBriefsV1['open']) => list.map((i) => i.ref)
  const answers = async (ref: string) => {
    const payload = await getTestPayload()
    const brief = (await payload.find({ collection: 'briefs', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    return (await payload.find({ collection: 'brief-answers', where: { brief: { equals: brief.id } }, depth: 0, pagination: false, overrideAccess: true })).docs
  }
  // An identical brief from the same visitor is a replay of the first one: each test brief gets its own day.
  let day = 0
  const send = async (over: Record<string, string> = {}) => (await briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)), ...over })).ref

  beforeAll(async () => {
    world = await bookingWorld()
    photo = String(world.personas.photographer)
    asVisitor()
  })

  it('BI-US2-S1 accepting records the answer once and leaves the waiting list; repeating it is harmless', async () => {
    const ref = await send()
    const after = await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    expect(refs(after.open)).not.toContain(ref)
    expect(after.accepted.find((i) => i.ref === ref)).toMatchObject({ answer: 'accepted', outcome: 'open' })
    await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    const rows = await answers(ref)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ decision: 'accepted', reason: null, note: null, withdrawnAt: null })
  })

  it('BI-US2-S2 several creators accept the same brief', async () => {
    const ref = await send()
    await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    await inbox('omar', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    expect((await answers(ref)).map((r) => r.decision)).toEqual(['accepted', 'accepted'])
  })

  it('BI-US2-S7 a closed brief or one that no longer matches is refused with a plain reason', async () => {
    const payload = await getTestPayload()
    const closed = await send()
    await payload.update({ collection: 'briefs', where: { reference: { equals: closed } }, data: { status: 'closed' }, overrideAccess: true, context: quiet })
    expect(await answerBrief(await actor('sara'), closed, { persona: photo, decision: 'accept' }, undefined)).toMatchObject({ status: 409, code: 'inbox.errors.briefClosed' })
    const abuDhabi = await send({ location: 'abu-dhabi' })
    expect(await answerBrief(await actor('sara'), abuDhabi, { persona: photo, decision: 'accept' })).toMatchObject({ status: 409, code: 'inbox.errors.notMatching' })
    expect(await answerBrief(await actor('sara'), 'B-NOPE', { persona: photo, decision: 'accept' })).toMatchObject({ status: 409, code: 'inbox.errors.briefClosed' })
    expect(await answerBrief({ ...(await actor('sara')), user: world.admin as never }, abuDhabi, { persona: photo, decision: 'accept' })).toMatchObject({ status: 403 })
  })

  it('BI-US2-S9 an acceptance can be withdrawn until the client picks that creator', async () => {
    const ref = await send()
    await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    const back = await inbox('sara', (a) => withdrawAnswer(a, ref, photo))
    expect(refs(back.open)).toContain(ref)
    expect((await answers(ref))[0]!.withdrawnAt).toBeTruthy()
    const picked = await briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })
    await inbox('sara', (a) => answerBrief(a, picked.ref, { persona: photo, decision: 'accept' }))
    await quoteFor(requestQuotation as never, picked, { pick: `photographer:${world.creators.sara!.code}` })
    expect(await withdrawAnswer(await actor('sara'), picked.ref, photo)).toMatchObject({ status: 409, code: 'inbox.errors.alreadyPicked' })
    jar.clear()
    asVisitor()
  })

  it('BI-US3-S1 BI-US3-S3 a rejected brief disappears for that creator only, and the client is not told', async () => {
    const ref = await send()
    const after = await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'reject' }))
    expect(refs(after.open)).not.toContain(ref)
    expect(after.rejected.find((i) => i.ref === ref)).toMatchObject({ answer: 'rejected', reason: null })
    const omar = await inbox('omar', (a) => withdrawAnswer(a, ref, photo))
    expect(refs(omar.open)).toContain(ref)
    const payload = await getTestPayload()
    const brief = (await payload.find({ collection: 'briefs', where: { reference: { equals: ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    expect((await payload.count({ collection: 'notifications', where: { brief: { equals: brief.id } }, overrideAccess: true })).totalDocs).toBe(0)
  })

  it('BI-US3-S2 a reason is optional and must come from the content list; the note is kept for the team', async () => {
    const ref = await send()
    expect(await answerBrief(await actor('sara'), ref, { persona: photo, decision: 'reject', reason: 'bored' })).toMatchObject({ status: 422, code: 'inbox.errors.reasonUnknown' })
    const after = await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'reject', reason: 'too-far', note: '  Only Dubai Marina this month.  ' }))
    expect(after.rejected.find((i) => i.ref === ref)!.reason).toBe('too-far')
    expect(after.reasons.map((r) => r.label)).toContain('Too far')
    expect((await answers(ref))[0]).toMatchObject({ reason: 'too-far', note: 'Only Dubai Marina this month.' })
  })

  it('BI-US3-S4 a rejection can be undone while the brief is open, and a creator may change their mind', async () => {
    const ref = await send()
    await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'reject', reason: 'not-free' }))
    const undone = await inbox('sara', (a) => withdrawAnswer(a, ref, photo))
    expect(refs(undone.open)).toContain(ref)
    expect(refs(undone.rejected)).not.toContain(ref)
    const yes = await inbox('sara', (a) => answerBrief(a, ref, { persona: photo, decision: 'accept' }))
    expect(refs(yes.accepted)).toContain(ref)
    expect((await answers(ref))[0]).toMatchObject({ decision: 'accepted', reason: null, withdrawnAt: null })
  })
})
