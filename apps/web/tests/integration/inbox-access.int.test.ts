import { beforeAll, describe, expect, it, vi } from 'vitest'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { createUser, getTestPayload, readable } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')

type U = Awaited<ReturnType<typeof createUser>>

describe('BI-FR-015 brief answers and push devices are never readable or writable by the wrong person', () => {
  let world: BookingWorld
  let seeker: U
  let editor: U
  let answerId: number

  beforeAll(async () => {
    world = await bookingWorld()
    seeker = await createUser(['member'])
    editor = await createUser(['editor'])
    asVisitor()
    const brief = await briefFor(submitBrief as never, world)
    const payload = await getTestPayload()
    const briefId = (await payload.find({ collection: 'briefs', where: { reference: { equals: brief.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!.id
    answerId = (
      await payload.create({
        collection: 'brief-answers',
        data: { brief: briefId, creator: world.creators.sara!.id, persona: world.personas.photographer, decision: 'accepted', answeredAt: new Date().toISOString() },
        overrideAccess: true,
      })
    ).id
    await payload.create({ collection: 'push-devices', data: { user: seeker.id, token: 'token-access-1', platform: 'ios', locale: 'en' }, overrideAccess: true })
  })

  const count = async (collection: 'brief-answers' | 'push-devices', user?: U) =>
    readable(async () => (await getTestPayload()).find({ collection, user, overrideAccess: false, depth: 0 }))

  it('a creator reads only their own answers; others, editors and visitors read none; admins read all', async () => {
    expect(await count('brief-answers', world.creators.sara!.user as never)).toBe(1)
    for (const user of [undefined, seeker, editor, world.creators.omar!.user as never]) expect(await count('brief-answers', user)).toBe(0)
    expect(await count('brief-answers', world.admin)).toBe(1)
  })

  it('push devices are readable by admins only', async () => {
    for (const user of [undefined, seeker, editor]) expect(await count('push-devices', user)).toBe(0)
    expect(await count('push-devices', world.admin)).toBe(1)
  })

  it('nobody writes answers or devices through the API, admins included', async () => {
    const payload = await getTestPayload()
    for (const user of [undefined, seeker, world.creators.sara!.user as never, world.admin]) {
      await expect(payload.create({ collection: 'brief-answers', data: {} as never, user, overrideAccess: false })).rejects.toThrow()
      await expect(payload.update({ collection: 'brief-answers', id: answerId, data: { decision: 'rejected' }, user, overrideAccess: false })).rejects.toThrow()
      await expect(payload.create({ collection: 'push-devices', data: {} as never, user, overrideAccess: false })).rejects.toThrow()
    }
  })

  it('an acceptance cannot carry a reason or a note', async () => {
    const payload = await getTestPayload()
    await expect(payload.update({ collection: 'brief-answers', id: answerId, data: { reason: 'too-far' }, overrideAccess: true })).rejects.toThrow()
  })

  it('BI-FR-011 BI-US2-S8 the team sees where each answer stands now', async () => {
    const payload = await getTestPayload()
    const read = async () => (await payload.findByID({ collection: 'brief-answers', id: answerId, depth: 0, overrideAccess: true })) as { statusNow?: string }
    expect((await read()).statusNow).toBe('listed')
    const brief = (await payload.findByID({ collection: 'brief-answers', id: answerId, depth: 1, overrideAccess: true })).brief as { date: string }
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, date: String(brief.date).slice(0, 10), kind: 'blocked', user: world.creators.sara!.user.id }, overrideAccess: true })
    expect((await read()).statusNow).toBe('not free any more')
    await payload.update({ collection: 'brief-answers', id: answerId, data: { withdrawnAt: new Date().toISOString() }, overrideAccess: true })
    expect((await read()).statusNow).toBe('withdrawn')
  })
})
