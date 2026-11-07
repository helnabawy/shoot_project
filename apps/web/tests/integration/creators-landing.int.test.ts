import { beforeAll, describe, expect, it } from 'vitest'
import { CreatorNetwork } from '@/modules/landing/components/sections/CreatorNetwork'
import sitemap from '@/app/sitemap'
import { quiet } from './setup/payload'
import { createDraft, creatorWorld, listingOf, makeProvider, publish, uploadImage, type CreatorWorld } from './setup/creators'

type Block = Parameters<typeof CreatorNetwork>[0]['block']
const block = (over: Partial<Block> = {}): Block => ({
  blockType: 'creatorNetwork',
  anchor: 'our-network',
  heading: 'Our network',
  rule: 'featuredThenNewest',
  count: 3,
  cta: { label: 'See everyone', kind: 'link', href: '/creators' },
  ...over,
})

describe('CP-US1-S1 / CP-FR-003 landing network block', () => {
  let world: CreatorWorld
  const ids: Record<string, number> = {}

  const make = async (name: string, { samples = true, publishIt = true }: { samples?: boolean; publishIt?: boolean } = {}) => {
    const provider = await makeProvider(world)
    const image = samples ? await uploadImage(world, provider, `${name}.png`) : null
    const profile = await createDraft(world, provider, {
      displayName: name,
      samples: image ? [{ kind: 'image', image: image.id, category: world.category }] : [],
    })
    if (publishIt) await publish(world, profile.id)
    ids[name] = profile.id
    return profile
  }
  const shown = async (b: Block) => {
    const element = (await CreatorNetwork({ block: b, contact: {}, locale: 'en' })) as { props: { items: { creator: { displayName: string } }[] } }
    return element.props.items.map((i) => i.creator.displayName)
  }

  beforeAll(async () => {
    world = await creatorWorld()
  })

  it('renders nothing until a creator is listed', async () => {
    expect(await shown(block())).toEqual([])
  })

  it('shows up to the editor\'s count, featured first and then newest, never a creator without samples', async () => {
    await make('Alma')
    await make('Basel')
    await make('Carla')
    await make('Dina')
    await make('Empty', { samples: false })
    const listing = (await listingOf(world, ids.Alma!))!
    await world.payload.update({ collection: 'creator-listings', id: listing.id, data: { featured: true }, overrideAccess: true, context: quiet })
    const names = await shown(block({ count: 3 }))
    expect(names).toHaveLength(3)
    expect(names[0]).toBe('Alma')
    expect(names).not.toContain('Empty')
  })

  it('follows the rule: featured only, and newest', async () => {
    expect(await shown(block({ rule: 'featuredOnly', count: 6 }))).toEqual(['Alma'])
    const newest = await shown(block({ rule: 'newest', count: 6 }))
    expect(newest).toEqual(['Dina', 'Carla', 'Basel', 'Alma'])
  })

  it('clamps the count to 3–12', async () => {
    expect(await shown(block({ rule: 'newest', count: 1 }))).toHaveLength(3)
  })

  it('an unpublished or hidden creator is gone from the next read', async () => {
    await world.payload.update({ collection: 'creator-profiles', id: ids.Dina!, data: { _status: 'draft' } as never, draft: false, user: world.admin, overrideAccess: false, context: quiet })
    expect(await shown(block({ rule: 'newest', count: 6 }))).toEqual(['Carla', 'Basel', 'Alma'])
    const listing = (await listingOf(world, ids.Carla!))!
    await world.payload.update({ collection: 'creator-listings', id: listing.id, data: { active: false }, overrideAccess: true, context: quiet })
    expect(await shown(block({ rule: 'newest', count: 6 }))).toEqual(['Basel', 'Alma'])
  })
})

describe('CP-US1-S3 sitemap', () => {
  it('lists the directory and each listed creator, excluding unlisted ones', async () => {
    const world = await creatorWorld()
    const listed = await makeProvider(world)
    const hidden = await makeProvider(world)
    const a = await createDraft(world, listed)
    await publish(world, a.id)
    const b = await createDraft(world, hidden)
    await publish(world, b.id)
    await world.payload.update({ collection: 'creator-listings', id: (await listingOf(world, b.id))!.id, data: { suspended: true }, overrideAccess: true, context: quiet })
    const draftOnly = await createDraft(world, await makeProvider(world))

    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('http://localhost:3000/creators')
    expect(urls).toContain(`http://localhost:3000/creators/${String(a.code).toLowerCase()}`)
    expect(urls).not.toContain(`http://localhost:3000/creators/${String(b.code).toLowerCase()}`)
    expect(urls).not.toContain(`http://localhost:3000/creators/${String(draftOnly.code).toLowerCase()}`)
    const entry = (await sitemap()).find((e) => e.url.endsWith(String(a.code).toLowerCase()))
    expect(entry?.alternates?.languages?.ar).toBe(`http://localhost:3000/ar/creators/${String(a.code).toLowerCase()}`)
  })
})
