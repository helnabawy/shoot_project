import { categoryV1, personasV1, personaV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import type { Media } from '@/payload-types'
import type { AudienceCategory, AudiencePersona } from './queries'
import { toWireCategory, toWirePersona } from './wire'

const base = 'https://shoot.example'

const persona = (id: string, slug: string, order: number): AudiencePersona => ({
  id,
  slug,
  singular: slug[0]!.toUpperCase() + slug.slice(1),
  plural: `${slug}s`,
  order,
  active: true,
  copy: { seekerCta: 'I need a {persona.singular}', providerCta: 'Join', providerPitch: 'Secret pitch' },
  glyph: slug.slice(0, 2).toUpperCase(),
  description: null,
})

const media: Media = {
  id: 7,
  alt: 'Rings',
  url: '/api/media/file/rings.jpg',
  width: 1600,
  height: 1200,
  uploadedBy: 3,
  updatedAt: '',
  createdAt: '',
  sizes: { card: { url: '/api/media/file/rings-800.webp', width: 800, height: 600 } },
}

const category = (over: Partial<AudienceCategory> = {}): AudienceCategory => ({
  id: '11',
  slug: 'wedding',
  name: 'Wedding',
  order: 1,
  active: true,
  personas: ['1', '2'],
  glyph: 'W',
  description: 'Ceremonies',
  scene: 'wedding',
  image: { url: '/api/media/file/rings-800.webp', width: 800, height: 600, alt: 'Rings' },
  media,
  seo: { title: 'Wedding photographers', description: 'SEO', intro: 'Intro' },
  ...over,
})

describe('personas mappers', () => {
  it('MR-US1-S4 keeps the order, never sends copy, and gives categories their persona ids', () => {
    const personas = [persona('2', 'videographer', 2), persona('1', 'photographer', 1)]
    const wire = personasV1.parse({ locale: 'en', personas: personas.map(toWirePersona), categories: [toWireCategory(category(), base)] })
    expect(wire.personas.map((p) => p.slug)).toEqual(['videographer', 'photographer'])
    const json = JSON.stringify(wire)
    for (const hidden of ['copy', 'Secret pitch', 'providerCta', 'order', 'active', 'seo', 'uploadedBy']) expect(json).not.toContain(hidden)
    expect(wire.categories[0]?.personaIds).toEqual(['1', '2'])
  })

  it('maps a persona field by field with null for empty values', () => {
    expect(personaV1.parse(toWirePersona({ ...persona('1', 'photographer', 1), glyph: '' }))).toEqual({
      id: '1',
      slug: 'photographer',
      singular: 'Photographer',
      plural: 'photographers',
      glyph: null,
      description: null,
    })
  })

  it('prefers the media document with every size, and falls back to the card source', () => {
    const full = categoryV1.parse(toWireCategory(category(), base))
    expect(full.image?.sizes.map((s) => s.width)).toEqual([800, 1600])
    const single = categoryV1.parse(toWireCategory(category({ media: null }), base))
    expect(single.image?.sizes).toEqual([{ url: 'https://shoot.example/api/media/file/rings-800.webp', width: 800, height: 600 }])
    const none = categoryV1.parse(toWireCategory(category({ media: null, image: null, scene: null, glyph: null, description: null }), base))
    expect(none).toMatchObject({ image: null, scene: null, glyph: null, description: null })
  })
})
