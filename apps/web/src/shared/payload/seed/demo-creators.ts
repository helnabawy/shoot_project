import { randomUUID } from 'node:crypto'
import type { CollectionSlug, Payload } from 'payload'
import sharp from 'sharp'

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

interface Demo {
  code: string
  email: string
  name: { en: string; ar: string }
  bio: { en: string; ar: string }
  personas: string[]
  specialties: string[]
  cities: string[]
  languages: string[]
  samples: number
  state: 'live' | 'live-featured' | 'in-review' | 'paused'
}

const DEMOS: Demo[] = [
  { code: 'D2222', email: 'demo-sara@demo.test', name: { en: 'Sara Demo', ar: 'سارة (تجريبي)' }, bio: { en: 'Demo profile. Portraits and weddings.', ar: 'ملف تجريبي. بورتريه وأعراس.' }, personas: ['photographer'], specialties: ['portrait', 'wedding-engagement'], cities: ['dubai-marina'], languages: ['en', 'ar'], samples: 4, state: 'live-featured' },
  { code: 'D3333', email: 'demo-omar@demo.test', name: { en: 'Omar Demo', ar: 'عمر (تجريبي)' }, bio: { en: 'Demo profile. Events and corporate video.', ar: 'ملف تجريبي. فعاليات وفيديو للشركات.' }, personas: ['videographer'], specialties: ['events', 'corporate-branding'], cities: ['al-ain'], languages: ['en', 'ar', 'ur'], samples: 4, state: 'live' },
  { code: 'D4444', email: 'demo-lina@demo.test', name: { en: 'Lina Demo', ar: 'لينا (تجريبي)' }, bio: { en: 'Demo profile. Fashion and beauty.', ar: 'ملف تجريبي. أزياء وجمال.' }, personas: ['photographer'], specialties: ['fashion-beauty', 'portrait'], cities: ['sharjah'], languages: ['en', 'fr'], samples: 4, state: 'live' },
  { code: 'D5555', email: 'demo-noor@demo.test', name: { en: 'Noor Demo', ar: 'نور (تجريبي)' }, bio: { en: 'Demo profile awaiting review.', ar: 'ملف تجريبي بانتظار المراجعة.' }, personas: ['photographer'], specialties: ['portrait'], cities: ['dubai'], languages: ['en'], samples: 2, state: 'in-review' },
  { code: 'D6666', email: 'demo-kareem@demo.test', name: { en: 'Kareem Demo', ar: 'كريم (تجريبي)' }, bio: { en: 'Demo profile with no samples yet.', ar: 'ملف تجريبي بلا نماذج بعد.' }, personas: ['photographer'], specialties: ['real-estate-architecture'], cities: ['dubai'], languages: ['en', 'ar'], samples: 0, state: 'live' },
  { code: 'D7777', email: 'demo-maya@demo.test', name: { en: 'Maya Demo', ar: 'مايا (تجريبي)' }, bio: { en: 'Demo profile. Photo and video.', ar: 'ملف تجريبي. صور وفيديو.' }, personas: ['photographer', 'videographer'], specialties: ['events', 'portrait'], cities: ['dubai', 'abu-dhabi'], languages: ['en', 'ar', 'hi'], samples: 4, state: 'live' },
  { code: 'D8888', email: 'demo-zane@demo.test', name: { en: 'Zane Demo', ar: 'زين (تجريبي)' }, bio: { en: 'Demo profile, paused by its owner.', ar: 'ملف تجريبي أوقفه صاحبه.' }, personas: ['videographer'], specialties: ['events'], cities: ['sharjah'], languages: ['en'], samples: 3, state: 'paused' },
]

const PALETTE = ['#B9A58F', '#8FA8B9', '#A8B98F', '#B98F9C', '#9C8FB9', '#B9B08F']

/** A flat colour square with its number: obviously a placeholder, never mistaken for photography. */
async function placeholderImage(index: number): Promise<Buffer> {
  const colour = PALETTE[index % PALETTE.length]!
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${colour}"/><text x="600" y="520" font-family="sans-serif" font-size="260" fill="#1D1D1F" text-anchor="middle">${index + 1}</text></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
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
  for (const demo of DEMOS) {
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
    const photo = await uploadPlaceholder('portrait')
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
  options.log(`Demo creators: ${DEMOS.map((d) => d.code).join(', ')}`)
}

export const demoPassword = (fromEnv: string | undefined): string => fromEnv || randomUUID()
