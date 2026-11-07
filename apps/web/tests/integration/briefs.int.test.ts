import type { Brief } from '@/payload-types'
import { beforeEach, describe, expect, it } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { isBriefReference } from '@shoot/domain/brief'
import { createUser, getTestPayload, quiet, resetDatabase } from './setup/payload'

async function personaId(slug = 'photographer') {
  const payload = await getTestPayload()
  const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: slug } } })
  return docs[0]!.id
}

async function sendBrief(options: { visitorId?: string; user?: Awaited<ReturnType<typeof createUser>>; website?: string; personas?: number[] } = {}) {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'briefs',
    data: {
      persona: options.personas ?? [await personaId()],
      selections: [{ token: 'occasion', value: 'event', label: 'an event', custom: false }],
      sentence: 'I need a photographer for an event.',
      locale: 'en',
      sourcePath: '/',
      website: options.website,
      // A client cannot pick these; the hook decides them.
      status: 'closed',
      reference: 'B-AAAAA',
    } as never,
    overrideAccess: false,
    user: options.user,
    context: { ...quiet, visitorId: options.visitorId ?? 'visitor-1' },
  })
}

describe('US8 briefs', () => {
  beforeEach(async () => {
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })

  it('FR-049 an anonymous visitor can send a brief; reference, status and member are set by the server', async () => {
    const brief = await sendBrief()
    expect(isBriefReference(brief.reference ?? '')).toBe(true)
    expect(brief.reference).not.toBe('B-AAAAA')
    expect(brief.status).toBe('new')
    expect(brief.member ?? null).toBeNull()
    expect(brief.fingerprint).toMatch(/^[0-9a-f]{8}$/)
    expect(brief.selections?.[0]).toMatchObject({ token: 'occasion', value: 'event', label: 'an event' })
  })

  it('FR-050 refuses the 6th anonymous brief in an hour from the same visitor, not from others', async () => {
    for (let i = 0; i < 5; i += 1) await sendBrief({ visitorId: 'busy' })
    await expect(sendBrief({ visitorId: 'busy' })).rejects.toMatchObject({ status: 429 })
    await expect(sendBrief({ visitorId: 'someone-else' })).resolves.toBeTruthy()
  })

  it('FR-050 members are not limited', async () => {
    const member = await createUser(['member'])
    for (let i = 0; i < 7; i += 1) await sendBrief({ user: member, visitorId: 'member-visitor' })
    const payload = await getTestPayload()
    expect((await payload.count({ collection: 'briefs' })).totalDocs).toBe(7)
  })

  it('FR-063 a brief keeps several professional types in order, finds by either, and protects them from deletion', async () => {
    const payload = await getTestPayload()
    const [photographer, videographer] = [await personaId('photographer'), await personaId('videographer')]
    const brief = await sendBrief({ personas: [videographer, photographer] })
    const stored = await payload.findByID({ collection: 'briefs', id: brief.id, depth: 0 })
    expect(stored.persona).toEqual([videographer, photographer])
    const byVideographer = await payload.find({ collection: 'briefs', where: { persona: { in: [videographer] } }, depth: 0 })
    expect(byVideographer.docs.map((b) => b.id)).toEqual([brief.id])
    await expect(payload.delete({ collection: 'personas', id: videographer, context: quiet })).rejects.toThrow(/brief/)
  })

  it('rejects the honeypot', async () => {
    await expect(sendBrief({ website: 'spam.example' })).rejects.toMatchObject({ status: 400 })
  })

  it('FR-052 members read only their own briefs; admins read all and set the status; visitors read none', async () => {
    const payload = await getTestPayload()
    const alice = await createUser(['member'])
    const bob = await createUser(['member'])
    const admin = await createUser(['admin'])
    const mine = await sendBrief({ user: alice })
    await sendBrief({ user: bob })
    await sendBrief()

    const forAlice = await payload.find({ collection: 'briefs', overrideAccess: false, user: alice })
    expect(forAlice.docs.map((b: Brief) => b.id)).toEqual([mine.id])
    expect((await payload.find({ collection: 'briefs', overrideAccess: false, user: admin })).totalDocs).toBe(3)
    await expect(payload.find({ collection: 'briefs', overrideAccess: false })).rejects.toThrow()

    const updated = await payload.update({ collection: 'briefs', id: mine.id, data: { status: 'contacted' }, overrideAccess: false, user: admin })
    expect(updated.status).toBe('contacted')
    await expect(payload.update({ collection: 'briefs', id: mine.id, data: { status: 'closed' }, overrideAccess: false, user: alice })).rejects.toThrow()
    const memberValue = mine.member
    expect(typeof memberValue === 'object' && memberValue ? memberValue.id : memberValue).toBe(alice.id)
  })

  it('FR-047 option-set persona filters are stored as relationships', async () => {
    const payload = await getTestPayload()
    const videographer = await personaId('videographer')
    const { docs } = await payload.find({ collection: 'option-sets', where: { slug: { equals: 'occasions' } } })
    const set = docs[0]!
    await payload.update({
      collection: 'option-sets',
      id: set.id,
      data: { options: [...(set.options ?? []), { label: 'drone shots', value: 'drone-only', personas: [videographer] }] },
      context: quiet,
    })
    const found = await payload.find({ collection: 'option-sets', where: { 'options.personas': { in: [videographer] } } })
    expect(found.totalDocs).toBe(1)
  })
})
