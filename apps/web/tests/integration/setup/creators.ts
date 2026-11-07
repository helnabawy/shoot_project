import type { Payload } from 'payload'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, quiet, resetDatabase } from './payload'

export interface CreatorWorld {
  payload: Payload
  admin: Awaited<ReturnType<typeof createUser>>
  personas: { photographer: number; videographer: number }
  category: number
  otherCategory: number
  dubai: number
  abuDhabi: number
  city: number
}

/** Runs the default seed (001 content plus the locations tree) and adds an admin. */
export async function creatorWorld(): Promise<CreatorWorld> {
  await resetDatabase()
  const payload = await getTestPayload()
  await seed(payload, { log: () => {} })
  const admin = await createUser(['admin'])
  const find = async (collection: 'personas' | 'categories', slug: string) =>
    (await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]!.id
  const location = async (slug: string) =>
    (await payload.find({ collection: 'locations', where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]!.id
  const dubai = await location('dubai')
  const abuDhabi = await location('abu-dhabi')
  const city = await location('al-ain')
  return {
    payload,
    admin,
    personas: { photographer: await find('personas', 'photographer'), videographer: await find('personas', 'videographer') },
    category: await find('categories', 'portrait'),
    otherCategory: await find('categories', 'events'),
    dubai,
    abuDhabi,
    city,
  }
}

export async function makeProvider(world: CreatorWorld, persona: number = world.personas.photographer) {
  return createUser(['member'], { accountType: 'provider', persona })
}

/** A complete profile body (valid for publishing). */
export function profileBody(world: CreatorWorld, over: Record<string, unknown> = {}) {
  return {
    displayName: 'Sara Khan',
    bio: 'Weddings and portraits.',
    personas: [world.personas.photographer],
    specialties: [world.category],
    cities: [world.dubai],
    languages: ['en', 'ar'],
    ...over,
  }
}

/** The provider creates their own profile: stored as a draft with a code and a listing. */
export async function createDraft(world: CreatorWorld, provider: CreatorUser, over: Record<string, unknown> = {}) {
  return world.payload.create({
    collection: 'creator-profiles',
    data: { ...profileBody(world, over), _status: 'draft' } as never,
    draft: true,
    user: provider,
    overrideAccess: false,
    context: quiet,
  })
}

export type CreatorUser = Awaited<ReturnType<typeof createUser>>

/** Publishing is the admin's verification (research §2). */
export async function publish(world: CreatorWorld, id: number, data: Record<string, unknown> = {}, context: Record<string, unknown> = quiet) {
  return world.payload.update({
    collection: 'creator-profiles',
    id,
    data: { ...data, _status: 'published' } as never,
    draft: false,
    user: world.admin,
    overrideAccess: false,
    context,
  })
}

export async function listingOf(world: CreatorWorld, profileId: number) {
  const { docs } = await world.payload.find({ collection: 'creator-listings', where: { profile: { equals: profileId } }, limit: 1, depth: 0 })
  return docs[0]
}

/** What an anonymous visitor reads. */
export async function publicProfiles(world: CreatorWorld, locale: 'en' | 'ar' = 'en') {
  return world.payload.find({ collection: 'creator-profiles', overrideAccess: false, locale, fallbackLocale: 'en', depth: 0, limit: 100 })
}

import sharp from 'sharp'

/** A real (tiny) PNG uploaded to the media library. */
export async function uploadImage(world: CreatorWorld, user: CreatorUser, name = 'sample.png', alt = 'A sample') {
  const data = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#888888' } }).png().toBuffer()
  return world.payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/png', name, size: data.length },
    user,
    overrideAccess: false,
    context: quiet,
  })
}
