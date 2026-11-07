import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTestPayload, quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, type CreatorWorld } from './setup/creators'

/** The real submitBrief action; only Next's request APIs and next-intl/server are stubbed. */
const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
  draftMode: async () => ({ isEnabled: false }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  },
}))
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', () => ({
  redirect: (arg: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(arg)}`)
  },
}))

const { submitBrief } = await import('@/modules/brief/actions')

const form = (entries: Record<string, string | string[]>) => {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) for (const v of Array.isArray(value) ? value : [value]) data.append(key, v)
  return data
}
const briefForm = (extra: Record<string, string | string[]> = {}) =>
  form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: '', duration: '2h', location: 'dubai', shotBy: 'anyone', ...extra })

describe('CP-US2-S2 / CP-FR-009 a brief for a creator', () => {
  let world: CreatorWorld
  const creators: Record<string, { id: number; code: string; name: string }> = {}

  const make = async (key: string, name: string, personas: number[], publishIt = true) => {
    const provider = await makeProvider(world, personas[0])
    const profile = await createDraft(world, provider, { displayName: name, personas })
    if (publishIt) await publish(world, profile.id)
    creators[key] = { id: profile.id, code: profile.code as string, name }
    return profile
  }
  const briefs = async () => (await getTestPayload()).find({ collection: 'briefs', depth: 0, sort: 'createdAt' })
  const whatsappText = (state: { status: string; whatsappUrl?: string }) => decodeURIComponent((state.whatsappUrl ?? '').split('?text=')[1] ?? '')

  beforeAll(async () => {
    world = await creatorWorld()
    await make('photo', 'Sara Khan', [world.personas.photographer])
    await make('both', 'Maya Both', [world.personas.photographer, world.personas.videographer])
    await make('paused', 'Zane Paused', [world.personas.videographer])
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-listings', id: (await listingOf(world, creators.paused!.id))!.id, data: { active: false }, overrideAccess: true, context: quiet })
    const chef = await payload.create({ collection: 'personas', data: { singular: 'Chef', plural: 'Chefs', slug: 'chef' }, context: quiet })
    const provider = await makeProvider(world)
    const unlisted = await payload.create({
      collection: 'creator-profiles',
      data: { displayName: 'Chef Creator', personas: [chef.id], user: provider.id, _status: 'draft' } as never,
      draft: true,
      user: world.admin,
      overrideAccess: false,
      context: quiet,
    })
    await publish(world, unlisted.id)
    creators.unlisted = { id: unlisted.id, code: unlisted.code as string, name: 'Chef Creator' }
  })

  beforeEach(async () => {
    jar.clear()
    const payload = await getTestPayload()
    await payload.delete({ collection: 'briefs', where: { id: { exists: true } }, overrideAccess: true })
    await payload.delete({ collection: 'rate-limits', where: { id: { exists: true } }, overrideAccess: true })
  })

  it('stores the creator and names them, with the current code prefix, on their own last line of the WhatsApp message', async () => {
    const state = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.photo!.code }))
    expect(state.status).toBe('ok')
    if (state.status !== 'ok') return
    expect(whatsappText(state)).toMatch(new RegExp(`\\nCreator: Sara Khan \\(CR-${creators.photo!.code}\\)$`))
    const { docs } = await briefs()
    expect(docs).toHaveLength(1)
    expect(docs[0]?.creator).toBe(creators.photo!.id)
  })

  it('any spelling of the code works', async () => {
    const state = await submitBrief({ status: 'idle' }, briefForm({ creator: ` cr-${creators.photo!.code.toLowerCase()} ` }))
    expect(state.status).toBe('ok')
    expect((await briefs()).docs[0]?.creator).toBe(creators.photo!.id)
  })

  it('a single-type creator\'s professional type is filled in when the form has none', async () => {
    const state = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.photo!.code, persona: '' }))
    expect(state.status).toBe('ok')
    const payload = await getTestPayload()
    const brief = (await payload.find({ collection: 'briefs', depth: 1 })).docs[0]!
    expect((brief.persona as { slug: string }[]).map((p) => p.slug)).toEqual(['photographer'])
  })

  it('a type the creator does not offer is a field error and nothing is stored', async () => {
    const state = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.photo!.code, persona: 'videographer' }))
    expect(state).toMatchObject({ status: 'error', errors: { persona: 'brief.errors.creatorPersona' } })
    expect((await briefs()).docs).toHaveLength(0)
  })

  it('a multi-type creator accepts any subset of their types', async () => {
    const one = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.both!.code, persona: 'videographer' }))
    expect(one.status).toBe('ok')
    const both = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.both!.code, persona: ['photographer', 'videographer'], occasion: 'wedding-engagement' }))
    expect(both.status).toBe('ok')
    expect((await briefs()).docs.map((b) => b.creator)).toEqual([creators.both!.id, creators.both!.id])
  })

  it('an unknown, malformed, paused or unlisted creator is ignored: the brief goes out as a normal brief', async () => {
    for (const code of ['AAAAA', 'not a code', creators.paused!.code, creators.unlisted!.code]) {
      jar.clear()
      const state = await submitBrief({ status: 'idle' }, briefForm({ creator: code, occasion: code === 'AAAAA' ? 'event' : 'portrait' }))
      expect(state.status, code).toBe('ok')
      expect(whatsappText(state), code).not.toContain('Creator:')
    }
    const { docs } = await briefs()
    expect(docs).toHaveLength(4)
    expect(docs.every((b) => !b.creator)).toBe(true)
  })

  it('two briefs to different creators within a minute are not duplicates', async () => {
    const a = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.photo!.code }))
    const b = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.both!.code }))
    expect(a.status === 'ok' && b.status === 'ok' && a.reference !== b.reference).toBe(true)
    expect((await briefs()).docs).toHaveLength(2)
  })

  it('a brief keeps its creator after they pause their profile', async () => {
    const state = await submitBrief({ status: 'idle' }, briefForm({ creator: creators.photo!.code }))
    expect(state.status).toBe('ok')
    const payload = await getTestPayload()
    await payload.update({ collection: 'creator-listings', id: (await listingOf(world, creators.photo!.id))!.id, data: { active: false }, overrideAccess: true, context: quiet })
    const brief = (await briefs()).docs[0]!
    expect(brief.creator).toBe(creators.photo!.id)
    await payload.update({ collection: 'creator-listings', id: (await listingOf(world, creators.photo!.id))!.id, data: { active: true }, overrideAccess: true, context: quiet })
  })
})
