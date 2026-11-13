import { addDays } from '@shoot/domain/booking'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar, signIn } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { answerBrief } = await import('@/modules/inbox/commands/answer-brief')
const { onAccepted } = await import('@/modules/inbox/commands/notify-brief')
const { consoleProvider, setPushProvider } = await import('@/modules/push')

type U = Awaited<ReturnType<typeof createUser>>

describe('BI-US4 the client and the team hear that a creator said yes', () => {
  let world: BookingWorld
  let client: U
  let day = 0
  const pushes = consoleProvider(() => {})
  const payload = () => getTestPayload()

  const memberBrief = async (who: U, over: Record<string, string> = {}) => {
    asVisitor()
    await signIn((await payload()) as never, who.email!)
    const b = await briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)), ...over })
    jar.clear()
    const doc = (await (await payload()).find({ collection: 'briefs', where: { reference: { equals: b.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    return { ...b, id: doc.id }
  }
  const accept = async (key: string, ref: string) =>
    answerBrief({ payload: await payload(), user: world.creators[key]!.user as never, locale: 'en', now: new Date() }, ref, { persona: String(world.personas.photographer), decision: 'accept' }, onAccepted)
  const rows = async (briefId: number) =>
    (await (await payload()).find({ collection: 'notifications', where: { and: [{ brief: { equals: briefId } }, { event: { equals: 'brief-accepted' } }] }, depth: 0, pagination: false, sort: 'createdAt', overrideAccess: true })).docs

  beforeAll(async () => {
    world = await bookingWorld()
    setPushProvider(pushes)
    client = await createUser(['member'])
    await (await payload()).create({ collection: 'push-devices', data: { user: client.id, token: 'client-phone-token-1', platform: 'ios', locale: 'ar' }, overrideAccess: true })
  })
  afterAll(() => setPushProvider(undefined))

  it('BI-US4-S1 the team gets an in-app row linking to the brief, and a WhatsApp link to forward to the client', async () => {
    const b = await memberBrief(client)
    await (await payload()).update({ collection: 'briefs', id: b.id, data: { contact: { name: 'Layla Hassan', whatsapp: '+971501234567' } }, overrideAccess: true, context: quiet })
    await accept('sara', b.ref)
    const admin = (await rows(b.id)).filter((r) => r.audience === 'admin')
    expect(admin.map((r) => r.channel).sort()).toEqual(['in-app', 'whatsapp'])
    expect(admin.find((r) => r.channel === 'in-app')!.link).toContain(`/admin/collections/briefs/${b.id}`)
    expect(admin.find((r) => r.channel === 'whatsapp')!.link).toMatch(/^https:\/\/wa\.me\/971501234567\?text=/)
    expect(admin[0]!.text).toContain('Sara Khan')
  })

  it('BI-US4-S2 BI-US4-S3 the member client gets one push in the device language and an in-app row; the tap opens step 2', async () => {
    pushes.sent.length = 0
    const b = await memberBrief(client)
    await accept('omar', b.ref)
    const mine = (await rows(b.id)).filter((r) => r.audience === 'client')
    expect(mine.map((r) => r.channel).sort()).toEqual(['in-app', 'push'])
    expect(mine.find((r) => r.channel === 'in-app')!.user).toBe(client.id)
    expect(pushes.sent).toHaveLength(1)
    expect(pushes.sent[0]).toMatchObject({ token: 'client-phone-token-1', title: 'محترف وافق على طلبك', data: { event: 'brief-accepted', path: `/match/${b.ref}/${b.key}` } })
    expect(pushes.sent[0]!.body).toContain('Omar Ali')
  })

  it('BI-US4-S6 BI-SC-005 one push per creator who says yes, never two for the same creator', async () => {
    pushes.sent.length = 0
    const b = await memberBrief(client)
    await accept('sara', b.ref)
    await accept('sara', b.ref)
    await answerBrief({ payload: await payload(), user: world.creators.sara!.user as never, locale: 'en', now: new Date() }, b.ref, { persona: String(world.personas.photographer), decision: 'reject' })
    await accept('sara', b.ref)
    await accept('omar', b.ref)
    expect(pushes.sent).toHaveLength(2)
    expect((await rows(b.id)).filter((r) => r.channel === 'push')).toHaveLength(2)
  })

  it('BI-US4-S5 push off, or no device: no push, and the in-app row is still there', async () => {
    pushes.sent.length = 0
    const quiet1 = await createUser(['member'], { pushEnabled: false })
    await (await payload()).create({ collection: 'push-devices', data: { user: quiet1.id, token: 'muted-token-1', platform: 'android', locale: 'en' }, overrideAccess: true })
    const noDevice = await createUser(['member'])
    for (const who of [quiet1, noDevice]) {
      const b = await memberBrief(who)
      await accept('sara', b.ref)
      expect((await rows(b.id)).some((r) => r.audience === 'client' && r.channel === 'in-app')).toBe(true)
    }
    expect(pushes.sent).toHaveLength(0)
  })

  it('BI-US4-S7 no push or row carries the client’s name, number or email', async () => {
    pushes.sent.length = 0
    const b = await memberBrief(client)
    await (await payload()).update({ collection: 'briefs', id: b.id, data: { contact: { name: 'Layla Hassan', whatsapp: '+971501234567' } }, overrideAccess: true, context: quiet })
    await accept('omar', b.ref)
    const text = JSON.stringify(pushes.sent) + JSON.stringify((await rows(b.id)).filter((r) => r.channel !== 'whatsapp').map((r) => r.text))
    for (const word of ['Layla', '+971', '971501234567', client.email!]) expect(text).not.toContain(word)
  })

  it('a visitor without an account gets no push and no in-app row; the team still hears', async () => {
    pushes.sent.length = 0
    asVisitor()
    const b = await briefFor(submitBrief as never, world, { date: addDays(world.date, (day += 1)) })
    await accept('sara', b.ref)
    const id = (await (await payload()).find({ collection: 'briefs', where: { reference: { equals: b.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
    expect((await rows(id)).map((r) => r.audience)).toEqual(['admin'])
    expect(pushes.sent).toHaveLength(0)
  })
})
