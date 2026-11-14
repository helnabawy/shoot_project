import { addDays, dubaiToday } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, quoteFor, setMatchValues, type BookingWorld } from './setup/booking'
import { listingOf } from './setup/creators'
import { asVisitor, form, jar, redirectOf } from './setup/next-mocks'
import { getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation, acceptQuotation } = await import('@/modules/booking/actions')
const { creatorInbox, briefsSummary } = await import('@/modules/inbox')

const CONTACT = ['Layla', '+971', 'whatsapp', 'member', 'contact', '@']

describe('BI-US1 a creator sees the open briefs that match them', () => {
  let world: BookingWorld
  const ctx = async () => ({ payload: await getTestPayload(), locale: 'en' as const, now: new Date() })
  const refsOf = async (key: string) => (await creatorInbox(await ctx(), world.creators[key]!.user.id))?.open.map((i) => i.ref) ?? null
  const send = async (over: Record<string, string> = {}) => (await briefFor(submitBrief as never, world, over)).ref
  let dubai: string
  let abuDhabi: string
  let video: string
  let woman: string
  let undated: string
  let named: string

  beforeAll(async () => {
    world = await bookingWorld()
    asVisitor()
    dubai = await send({ name: 'Layla Hassan', whatsapp: '+971501234567' })
    abuDhabi = await send({ location: 'abu-dhabi' })
    video = await send({ persona: 'videographer' })
    woman = await send({ shotBy: 'woman' })
    undated = await send({ date: '' })
    named = await send({ creator: world.creators.omar!.code })
    jar.clear()
  })

  it('BI-US1-S1 the creator sees the matching briefs, soonest first, and Up next counts them', async () => {
    const refs = await refsOf('sara')
    expect(refs).toEqual(expect.arrayContaining([dubai, undated]))
    expect(refs!.at(-1)).toBe(undated)
    const summary = await briefsSummary(await ctx(), world.creators.sara!.user.id)
    expect(summary!.count).toBe(refs!.length)
    expect(summary!.soonest!.ref).toBe(refs![0])
  })

  it('BI-US1-S2 another type, another emirate, an unmet filter, a named brief or a blocked day: not shown', async () => {
    const sara = await refsOf('sara')
    for (const ref of [abuDhabi, video, woman, named]) expect(sara).not.toContain(ref)
    expect(await refsOf('abu')).toContain(abuDhabi)
    expect(await refsOf('vera')).toContain(video)
    expect(await refsOf('omar')).toContain(named)
    await setMatchValues(world, 'omar', ['woman'])
    expect(await refsOf('omar')).toContain(woman)
    const payload = await getTestPayload()
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.omar!.id, date: world.date, kind: 'blocked', user: world.creators.omar!.user.id }, overrideAccess: true, context: quiet })
    expect(await refsOf('omar')).not.toContain(dubai)
    expect(await refsOf('omar')).toContain(undated)
  })

  it('BI-US1-S3 BI-SC-002 the creator sees what, where and when, never who the client is', async () => {
    const inbox = await creatorInbox(await ctx(), world.creators.sara!.user.id)
    const item = inbox!.open.find((i) => i.ref === dubai)!
    expect(item).toMatchObject({ profession: 'Photographer', emirate: 'Dubai', date: world.date, answer: null, outcome: 'open' })
    expect(item.occasion).toBe('an event')
    const json = JSON.stringify(inbox)
    for (const word of CONTACT) expect(json).not.toContain(word)
    expect(inbox!.reasons.map((r) => r.value)).toEqual(['not-free', 'too-far', 'not-my-work', 'other'])
  })

  it('BI-US1-S4 a hidden profile sees no briefs at all', async () => {
    const payload = await getTestPayload()
    const listing = await listingOf(world, world.creators.abu!.id)
    await payload.update({ collection: 'creator-listings', id: listing!.id, data: { suspended: true }, overrideAccess: true, context: quiet })
    expect(await creatorInbox(await ctx(), world.creators.abu!.user.id)).toBeNull()
    expect(await briefsSummary(await ctx(), world.creators.abu!.user.id)).toBeNull()
  })

  it('a past date, a closed status or an undated brief older than the window is not open', async () => {
    const payload = await getTestPayload()
    // Distinct answers: an identical brief from the same visitor is a replay of an earlier one.
    const old = await send({ date: '', duration: '3h' })
    const closed = await send({ date: addDays(world.date, 2) })
    await payload.update({ collection: 'briefs', where: { reference: { equals: closed } }, data: { status: 'closed' }, overrideAccess: true, context: quiet })
    const later = new Date(Date.parse(`${addDays(dubaiToday(new Date()), 31)}T08:00:00Z`))
    const refs = (await creatorInbox({ ...(await ctx()), now: later }, world.creators.sara!.user.id))!.open.map((i) => i.ref)
    expect(refs).not.toContain(old)
    expect(refs).not.toContain(dubai)
    expect(await refsOf('sara')).not.toContain(closed)
  })

  it('BI-US2-S6 once the client books another creator, an accepting creator sees "went to another creator"', async () => {
    const payload = await getTestPayload()
    asVisitor()
    // Omar blocked the usual date above: this brief is for the day after.
    const b = await briefFor(submitBrief as never, world, { date: addDays(world.date, 1) })
    const briefId = (await payload.find({ collection: 'briefs', where: { reference: { equals: b.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
    await payload.create({ collection: 'brief-answers', data: { brief: briefId, creator: world.creators.sara!.id, persona: world.personas.photographer, decision: 'accepted', answeredAt: new Date().toISOString() }, overrideAccess: true })
    const quote = await quoteFor(requestQuotation as never, b, { pick: `photographer:${world.creators.omar!.code}` })
    expect((await creatorInbox(await ctx(), world.creators.sara!.user.id))!.accepted.find((i) => i.ref === b.ref)!.outcome).toBe('open')
    await redirectOf(() => acceptQuotation(form({ locale: 'en', ref: quote.ref, key: quote.key })))
    const item = (await creatorInbox(await ctx(), world.creators.sara!.user.id))!.accepted.find((i) => i.ref === b.ref)!
    expect(item.outcome).toBe('other-creator')
    expect(JSON.stringify(item)).not.toContain('Omar')
    jar.clear()
  })

  it('BI-SC-001 the inbox reads 200 open briefs in under 2 seconds', async () => {
    const payload = await getTestPayload()
    const template = (await payload.find({ collection: 'briefs', where: { reference: { equals: dubai } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    const data = {
      persona: template.persona,
      sentence: template.sentence,
      date: template.date,
      locale: 'en',
      selections: (template.selections ?? []).map(({ token, value, label, custom }) => ({ token, value, label, custom })),
    }
    for (let i = 0; i < 200; i += 1) await payload.create({ collection: 'briefs', data: data as never, user: world.admin, overrideAccess: true, context: quiet })
    const started = performance.now()
    const inbox = await creatorInbox(await ctx(), world.creators.sara!.user.id)
    expect(performance.now() - started).toBeLessThan(2000)
    expect(inbox!.open.length).toBeGreaterThanOrEqual(150)
  })
})
