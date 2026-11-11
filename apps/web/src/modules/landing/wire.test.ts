import { ctaV1, landingV1, sectionV1, type SectionV1 } from '@shoot/domain/api/v1'
import type { CreatorSummary } from '@shoot/domain/creators'
import { describe, expect, it, vi } from 'vitest'
import type { Category, LandingPage, Media } from '@/payload-types'
import type { AudienceCategory, AudiencePersona } from '@/modules/personas/queries'
import { toWireCta, toWireHero, toWireLanding, toWireSection, type SectionBlock, type SectionContext } from './wire'

const base = 'https://shoot.example'

const media = (id: number, name: string): Media => ({
  id,
  alt: name,
  url: `/api/media/file/${name}.jpg`,
  width: 1200,
  height: 800,
  uploadedBy: 3,
  updatedAt: '',
  createdAt: '',
  sizes: { card: { url: `/api/media/file/${name}-800.webp`, width: 800, height: 533 } },
})

const persona = (id: string, slug: string, singular: string): AudiencePersona => ({
  id,
  slug,
  singular,
  plural: `${singular}s`,
  order: Number(id),
  active: true,
  copy: { providerPitch: 'internal pitch' },
  glyph: singular[0],
  description: null,
})

const audienceCategory = (id: string, slug: string, name: string): AudienceCategory => ({
  id,
  slug,
  name,
  order: 1,
  active: true,
  personas: ['1'],
  glyph: name[0],
  scene: 'wedding',
  image: null,
  media: null,
  seo: { title: 'seo title' },
})

const creator = (id: string, over: Partial<CreatorSummary> = {}): CreatorSummary => ({
  id,
  code: `K${id}`,
  displayName: `Omar K${id}`,
  bio: 'bio',
  photo: { url: `/api/media/file/omar-${id}.webp`, alt: 'Omar', width: 400, height: 400 },
  personaIds: ['1', '2'],
  specialtyIds: ['11'],
  locationIds: ['31'],
  emirateIds: ['30'],
  languages: ['en', 'ar'],
  sampleCounts: { '11': 3 },
  sampleCount: 3,
  featured: id === '1',
  publishedAt: `2026-01-0${id}T00:00:00.000Z`,
  matchValues: ['woman', 'secret-tag'],
  yearsExperience: 6,
  ...over,
})

function context(over: Partial<SectionContext> = {}): SectionContext {
  return {
    locale: 'en',
    base,
    contact: { whatsappNumber: '+971500000000', whatsappMessage: 'Hi!', phoneNumber: '+97141234567' },
    personas: [persona('1', 'photographer', 'Photographer'), persona('2', 'videographer', 'Videographer')],
    categories: [audienceCategory('11', 'wedding', 'Wedding'), audienceCategory('12', 'events', 'Events')],
    specialtyCounts: { '11': { samples: 9, pros: 2 } },
    creators: [creator('1'), creator('2'), creator('3', { sampleCount: 0, sampleCounts: {} })],
    directory: {
      lookups: {
        personas: new Map([
          ['1', 'Photographer'],
          ['2', 'Videographer'],
        ]),
        specialties: new Map([['11', 'Wedding']]),
        locations: new Map([['31', 'Dubai Marina']]),
      },
      prefix: 'SH',
    },
    ...over,
  }
}

const rich = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1, format: 0 }] }],
  },
})

const manualCategory: Category = {
  id: 99,
  name: 'Drone',
  slug: 'drone',
  personas: [{ id: 5, singular: 'Pilot', plural: 'Pilots', slug: 'pilot', updatedAt: '', createdAt: '' }],
  image: media(8, 'drone'),
  active: true,
  updatedAt: '',
  createdAt: '',
}

/** One block of every type, as Payload stores them. */
const blocks: SectionBlock[] = [
  {
    blockType: 'howItWorks',
    anchor: 'how-it-works',
    heading: 'How it works',
    steps: [{ title: 'Brief', body: 'One line.', visual: 'brief' }, { title: 'Match' }],
    cta: { label: '', kind: 'link', href: '#brief' },
  },
  { blockType: 'features', anchor: 'why-us', heading: 'Why', items: [{ title: 'One sentence', glyph: 'Aa', pointsAt: 'sentence' }, { title: 'Plain' }] },
  { blockType: 'categoriesGrid', anchor: 'specialties', heading: 'What do you need shot?', subheading: 'Start from the shoot', source: 'active' },
  {
    blockType: 'personaBand',
    anchor: 'for-professionals',
    heading: 'Are you a {personas.list}?',
    body: 'Join as a {persona.singular}.',
    layout: 'perPersona',
    cta: { label: 'Join', kind: 'link', href: '/ar/register?type=provider' },
  },
  { blockType: 'faq', anchor: 'faq', heading: 'Questions', items: [{ question: 'Do I need an account?', answer: rich('No.') }] },
  {
    blockType: 'logoCloud',
    anchor: 'clients',
    heading: 'Clients',
    logos: [
      { name: 'Acme', image: media(5, 'acme'), imageDark: null },
      { name: 'Not loaded', image: 6 },
    ],
  },
  { blockType: 'richText', anchor: null, content: rich('Hello') },
  {
    blockType: 'callToAction',
    heading: 'Ready?',
    body: 'Tell us.',
    primary: { label: 'WhatsApp us', kind: 'whatsapp' },
    secondary: { label: 'Call', kind: 'call' },
  },
  { blockType: 'creatorNetwork', anchor: 'our-network', heading: 'Our network', rule: 'featuredThenNewest', count: 3, cta: { label: 'See everyone', kind: 'link', href: '/creators' } },
]

const map = (block: SectionBlock, ctx = context()) => sectionV1.parse(toWireSection(block, ctx))
const ofType = <T extends SectionV1['type']>(s: SectionV1, type: T) => {
  expect(s.type).toBe(type)
  return s as Extract<SectionV1, { type: T }>
}

describe('MR-US1-S5 landing sections', () => {
  it('maps each of the nine block types to a valid section', () => {
    const types = blocks.map((b) => map(b).type)
    expect(types).toEqual(['howItWorks', 'features', 'categoriesGrid', 'personaBand', 'faq', 'logoCloud', 'richText', 'callToAction', 'creatorNetwork'])
  })

  it('maps how-it-works steps and drops an unusable call to action', () => {
    const s = ofType(map(blocks[0]!), 'howItWorks')
    expect(s.steps).toEqual([
      { title: 'Brief', body: 'One line.', visual: 'brief' },
      { title: 'Match', body: null, visual: 'none' },
    ])
    expect(s.cta).toBeNull()
    expect(s.subheading).toBeNull()
  })

  it('maps features with their defaults', () => {
    const s = ofType(map(blocks[1]!), 'features')
    expect(s.items[1]).toEqual({ title: 'Plain', body: null, glyph: null, pointsAt: 'none' })
  })

  it('categoriesGrid tiles carry the counts and whether a page exists', () => {
    const s = ofType(map(blocks[2]!), 'categoriesGrid')
    expect(s.tiles.map((t) => [t.category.slug, t.counts, t.hasPage])).toEqual([
      ['wedding', { samples: 9, professionals: 2 }, true],
      ['events', { samples: 0, professionals: 0 }, true],
    ])
    expect(JSON.stringify(s)).not.toContain('seo')
  })

  it('a hand-picked category outside the audience has no page, and an inactive one is left out', () => {
    const block: SectionBlock = {
      blockType: 'categoriesGrid',
      anchor: 'picked',
      heading: 'Picked',
      source: 'manual',
      categories: [manualCategory, { ...manualCategory, id: 100, slug: 'old', active: false }, 12],
    }
    const s = ofType(map(block), 'categoriesGrid')
    expect(s.tiles).toHaveLength(1)
    expect(s.tiles[0]).toMatchObject({ hasPage: false, category: { slug: 'drone', personaIds: ['5'] } })
    expect(s.tiles[0]?.category.image?.sizes.map((x) => x.width)).toEqual([800, 1200])
  })

  it('personaBand fills the persona placeholders and lists the audience without its copy', () => {
    const s = ofType(map(blocks[3]!), 'personaBand')
    expect(s.heading).toBe('Are you a photographer or videographer?')
    expect(s.body).toBe('Join as a Photographer.')
    expect(s.layout).toBe('perPersona')
    expect(s.personas.map((p) => p.slug)).toEqual(['photographer', 'videographer'])
    expect(s.cta).toEqual({ label: 'Join', kind: 'link', path: '/register?type=provider', url: null })
    expect(JSON.stringify(s)).not.toContain('internal pitch')
  })

  it('maps the faq answers as rich text and skips an unloaded logo', () => {
    const faq = ofType(map(blocks[4]!), 'faq')
    expect(faq.items[0]?.answer.nodes[0]).toMatchObject({ type: 'paragraph' })
    const logos = ofType(map(blocks[5]!), 'logoCloud')
    expect(logos.logos.map((l) => l.name)).toEqual(['Acme'])
    expect(JSON.stringify(logos)).not.toContain('uploadedBy')
  })

  it('callToAction resolves WhatsApp and call', () => {
    const s = ofType(map(blocks[7]!), 'callToAction')
    expect(s.anchor).toBeNull()
    expect(s.primary).toMatchObject({ kind: 'whatsapp', path: null })
    expect(s.primary?.url).toMatch(/^https:\/\/wa\.me\/971500000000/)
    expect(s.secondary).toEqual({ label: 'Call', kind: 'call', path: null, url: 'tel:+97141234567' })
  })

  it('creatorNetwork carries the cards picked by the rule and count, without private fields', () => {
    const s = ofType(map(blocks[8]!), 'creatorNetwork')
    // featuredThenNewest, creators with samples only.
    expect(s.creators.map((c) => c.code)).toEqual(['K1', 'K2'])
    expect(s.creators[0]).toEqual({
      code: 'K1',
      displayCode: 'SH-K1',
      name: 'Omar K1',
      initials: 'OK',
      photo: { alt: 'Omar', width: 400, height: 400, sizes: [{ url: 'https://shoot.example/api/media/file/omar-1.webp', width: 400, height: 400 }] },
      types: 'Photographer and Videographer',
      places: ['Dubai Marina'],
      specialties: ['Wedding'],
      languages: ['English', 'Arabic'],
      yearsExperience: 6,
      sampleCount: 3,
      featured: true,
    })
    const json = JSON.stringify(s)
    for (const hidden of ['matchValues', 'secret-tag', 'woman', 'gender']) expect(json).not.toContain(hidden)
    expect(ofType(map(blocks[8]!, context({ directory: null })), 'creatorNetwork').creators).toEqual([])
  })

  it('an unknown block is skipped and reported', () => {
    const onUnknown = vi.fn()
    const unknown = { blockType: 'testimonials', anchor: 'x', heading: 'Kind words' } as unknown as SectionBlock
    expect(toWireSection(unknown, context({ onUnknown }))).toBeNull()
    expect(onUnknown).toHaveBeenCalledWith('testimonials')
  })
})

describe('MR-US1-S5 landing page', () => {
  const landing = {
    id: 1,
    hero: {
      eyebrow: 'Quick match',
      headline: 'You brief. We shoot.',
      trustChips: [{ text: 'No account needed' }],
      layout: 'ctas',
      primaryCta: { label: 'Start', kind: 'link', href: 'https://shoot.example/start' },
      secondaryCta: { label: 'Bad', kind: 'link', href: 'javascript:alert(1)' },
      image: media(1, 'hero'),
      overlayOpacity: 140,
    },
    navigation: [{ label: 'How it works', target: '#how-it-works' }],
    sections: [blocks[1], { blockType: 'testimonials' }, blocks[0]],
    publishedBy: 4,
    seo: { title: 'SEO' },
  } as unknown as LandingPage

  it('maps the hero, anchors and sections in CMS order, skipping the unknown one', () => {
    const wire = landingV1.parse(toWireLanding(landing, context()))
    expect(wire.hero).toMatchObject({ eyebrow: 'Quick match', subheadline: null, trustChips: ['No account needed'], layout: 'ctas', overlayOpacity: 100, imageMobile: null })
    expect(wire.hero.primaryCta).toEqual({ label: 'Start', kind: 'link', path: null, url: 'https://shoot.example/start' })
    expect(wire.hero.secondaryCta).toBeNull()
    expect(wire.navigation).toEqual([{ label: 'How it works', target: 'how-it-works' }])
    expect(wire.sections.map((s) => s.type)).toEqual(['features', 'howItWorks'])
    expect(JSON.stringify(wire)).not.toMatch(/publishedBy|uploadedBy|seo/)
  })

  it('defaults the hero layout and overlay', () => {
    const hero = toWireHero({ headline: 'Hi' }, context())
    expect(hero).toMatchObject({ layout: 'briefBuilder', overlayOpacity: null, image: null, primaryCta: null })
  })
})

describe('toWireCta', () => {
  const contact = context().contact
  it.each([
    [{ label: 'Go', kind: 'link' as const, href: '/creators' }, { label: 'Go', kind: 'link', path: '/creators', url: null }],
    [{ label: 'Go', href: '/en/creators' }, { label: 'Go', kind: 'link', path: '/creators', url: null }],
    [{ label: 'Mail', kind: 'link' as const, href: 'mailto:hi@shoot.example' }, { label: 'Mail', kind: 'link', path: null, url: 'mailto:hi@shoot.example' }],
  ])('resolves %o', (cta, expected) => {
    expect(ctaV1.parse(toWireCta(cta, contact))).toEqual(expected)
  })

  it.each([
    [null, contact],
    [{ label: '', kind: 'link' as const, href: '/x' }, contact],
    [{ label: 'Go', kind: 'link' as const }, contact],
    [{ label: 'Go', kind: 'link' as const, href: '#brief' }, contact],
    [{ label: 'Go', kind: 'link' as const, href: '//evil.example' }, contact],
    [{ label: 'WA', kind: 'whatsapp' as const }, { whatsappNumber: null }],
    [{ label: 'Call', kind: 'call' as const }, { phoneNumber: null }],
  ])('gives null for %o', (cta, details) => {
    expect(toWireCta(cta, details)).toBeNull()
  })
})
