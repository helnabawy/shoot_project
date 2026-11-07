import { randomUUID } from 'node:crypto'
import type { CollectionSlug, Payload } from 'payload'
import sharp from 'sharp'
import { avatarSvg } from './avatars'
import { DEMO_CREATORS } from './demo-creators.data'

const context = { disableRevalidate: true }

/** Demo creators are for local development, e2e and Lighthouse CI only: never invented proof on a live site. */
export function assertDemoHostAllowed(siteUrl: string | undefined): void {
  let host = ''
  try {
    host = new URL(siteUrl ?? '').hostname
  } catch {
    // falls through to the refusal below
  }
  const local = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost') || host.endsWith('.test')
  if (!local) {
    throw new Error(`Refusing to seed demo creators: NEXT_PUBLIC_SITE_URL (${siteUrl ?? 'unset'}) is not a local or test host.`)
  }
}

const PALETTE = ['#B9A58F', '#8FA8B9', '#A8B98F', '#B98F9C', '#9C8FB9', '#B9B08F']

/** A flat colour square with its number: obviously a placeholder, never mistaken for photography. */
async function placeholderImage(index: number): Promise<Buffer> {
  const colour = PALETTE[index % PALETTE.length]!
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${colour}"/><text x="600" y="520" font-family="sans-serif" font-size="260" fill="#1D1D1F" text-anchor="middle">${index + 1}</text></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** The creator's illustrated portrait as a 512 px WebP. */
function portraitImage(demo: (typeof DEMO_CREATORS)[number]): Promise<Buffer> {
  return sharp(Buffer.from(avatarSvg(demo.avatar))).webp({ quality: 86 }).toBuffer()
}

/**
 * Removes every demo creator (any profile whose account is on @demo.test) and what hangs off them:
 * their bookings and those bookings' records, their briefs, availability, photos and samples, and
 * their accounts. Local and test hosts only; used before re-seeding a fresh demo set.
 */
export async function removeDemoCreators(payload: Payload, options: { siteUrl?: string; log: (message: string) => void }): Promise<void> {
  assertDemoHostAllowed(options.siteUrl)
  const all = { depth: 0, limit: 0, pagination: false, overrideAccess: true } as const
  const users = await payload.find({ collection: 'users', where: { email: { like: '@demo.test' } }, ...all })
  const userIds = users.docs.filter((u) => u.email.endsWith('@demo.test')).map((u) => u.id)
  if (userIds.length === 0) return options.log('Demo creators: none to remove')

  const profiles = await payload.find({ collection: 'creator-profiles', where: { user: { in: userIds } }, draft: true, ...all })
  const profileIds = profiles.docs.map((p) => p.id)
  const mediaIds = new Set<number>()
  for (const p of profiles.docs) {
    if (typeof p.photo === 'number') mediaIds.add(p.photo)
    for (const sample of p.samples ?? []) if (typeof sample.image === 'number') mediaIds.add(sample.image)
  }

  const bookings = profileIds.length ? await payload.find({ collection: 'bookings', where: { 'assignments.creator': { in: profileIds } }, ...all }) : { docs: [] }
  const bookingIds = bookings.docs.map((b) => b.id)
  const briefIds = new Set<number>(bookings.docs.map((b) => (typeof b.brief === 'number' ? b.brief : b.brief.id)))
  if (profileIds.length) {
    const briefs = await payload.find({ collection: 'briefs', where: { creator: { in: profileIds } }, ...all })
    for (const b of briefs.docs) briefIds.add(b.id)
  }

  const remove = (collection: CollectionSlug, where: Record<string, unknown>) => payload.delete({ collection, where: where as never, overrideAccess: true, context })
  if (bookingIds.length) {
    for (const collection of ['payments', 'booking-events', 'notifications', 'quotations', 'availability-blocks'] as const) {
      await remove(collection, { booking: { in: bookingIds } })
    }
    await remove('bookings', { id: { in: bookingIds } })
  }
  if (profileIds.length) await remove('availability-blocks', { creator: { in: profileIds } })
  if (briefIds.size) await remove('briefs', { id: { in: [...briefIds] } })
  if (profileIds.length) await remove('creator-profiles', { id: { in: profileIds } })
  if (mediaIds.size) await remove('media', { id: { in: [...mediaIds] } })
  await remove('users', { id: { in: userIds } })
  options.log(`Demo creators removed: ${profileIds.length} profiles, ${bookingIds.length} bookings, ${briefIds.size} briefs, ${mediaIds.size} images`)
}

/** Creates the demo creators. Idempotent by code; throws on a non-local host. */
export async function seedDemoCreators(
  payload: Payload,
  options: { siteUrl?: string; password: string; log: (message: string) => void },
): Promise<void> {
  assertDemoHostAllowed(options.siteUrl)
  const bySlug = async (collection: CollectionSlug, slug: string) => {
    const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
    if (!found.docs[0]) throw new Error(`Seed the default content first: ${collection} "${slug}" is missing.`)
    return found.docs[0].id as number
  }

  let imageCounter = 0
  for (const demo of DEMO_CREATORS) {
    const existing = await payload.find({ collection: 'creator-profiles', where: { code: { equals: demo.code } }, limit: 1, depth: 0, draft: true })
    if (existing.docs[0]) continue

    const personas = await Promise.all(demo.personas.map((s) => bySlug('personas', s)))
    const user = await payload.create({
      collection: 'users',
      data: { name: demo.name.en, email: demo.email, password: options.password, accountType: 'provider', persona: personas[0] } as never,
      context,
    })
    const uploadPlaceholder = async (label: string) => {
      const data = await placeholderImage(imageCounter)
      imageCounter += 1
      return payload.create({
        collection: 'media',
        data: { alt: `Placeholder image ${imageCounter}, not a real photograph (${label})` },
        file: { data, mimetype: 'image/png', name: `demo-${demo.code.toLowerCase()}-${imageCounter}.png`, size: data.length },
        context,
      })
    }

    const specialties = await Promise.all(demo.specialties.map((s) => bySlug('categories', s)))
    const portrait = await portraitImage(demo)
    const photo = await payload.create({
      collection: 'media',
      data: { alt: `Illustrated portrait of ${demo.name.en}, a demo creator` },
      file: { data: portrait, mimetype: 'image/webp', name: `demo-${demo.code.toLowerCase()}-portrait.webp`, size: portrait.length },
      context,
    })
    const samples = []
    for (let i = 0; i < demo.samples; i += 1) {
      const image = await uploadPlaceholder(`sample ${i + 1}`)
      samples.push({ kind: 'image', image: image.id, category: specialties[i % specialties.length], caption: `Demo sample ${i + 1}` })
    }

    const base = {
      user: user.id,
      code: demo.code,
      personas,
      specialties,
      cities: await Promise.all(demo.cities.map((s) => bySlug('locations', s))),
      languages: demo.languages,
      gender: demo.gender,
      nationality: demo.nationality,
      yearsExperience: demo.yearsExperience,
      photo: photo.id,
      samples,
    }
    const profile = await payload.create({
      collection: 'creator-profiles',
      data: { ...base, displayName: demo.name.en, bio: demo.bio.en, _status: 'draft' } as never,
      locale: 'en',
      draft: true,
      context: { ...context, seedFixedCode: true },
    })
    // Arabic text on the same draft; the sample captions are Arabic-agnostic placeholders.
    await payload.update({
      collection: 'creator-profiles',
      id: profile.id,
      data: { displayName: demo.name.ar, bio: demo.bio.ar } as never,
      locale: 'ar',
      draft: true,
      context,
    })

    const listings = await payload.find({ collection: 'creator-listings', where: { profile: { equals: profile.id } }, limit: 1, depth: 0 })
    const listing = listings.docs[0]!
    if (demo.state === 'in-review') {
      await payload.update({ collection: 'creator-listings', id: listing.id, data: { submittedAt: new Date().toISOString() }, context })
      continue
    }
    await payload.update({ collection: 'creator-profiles', id: profile.id, data: { _status: 'published' } as never, draft: false, context })
    if (demo.state === 'live-featured') await payload.update({ collection: 'creator-listings', id: listing.id, data: { featured: true }, context })
    if (demo.state === 'paused') await payload.update({ collection: 'creator-listings', id: listing.id, data: { active: false }, context })
  }
  options.log(`Demo creators: ${DEMO_CREATORS.length} (${DEMO_CREATORS.map((d) => d.code).join(', ')})`)
}

export const demoPassword = (fromEnv: string | undefined): string => fromEnv || randomUUID()
