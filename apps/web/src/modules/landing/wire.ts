import { SITE_PATH, type CtaV1, type HeroV1, type LandingV1, type SectionV1 } from '@shoot/domain/api/v1'
import { networkSelection, type CreatorSummary, type SpecialtyCounts } from '@shoot/domain/creators'
import { interpolatePersonaCopy } from '@shoot/domain/personas'
import { stripLocalePrefix } from '@shoot/domain/content'
import type { Category, LandingPage, Page } from '@/payload-types'
import { whatsappHref } from '@/modules/contact/whatsapp'
import type { Lookups } from '@/modules/creators/describe'
import { toWireCreatorCard } from '@/modules/creators/wire'
import type { AudienceCategory, AudiencePersona } from '@/modules/personas/queries'
import { toWireCategory, toWirePersona } from '@/modules/personas/wire'
import type { ContactDetails, Cta } from '@/shared/components/CtaLink'
import { toWireImage, toWireRichText, type WireContext } from '@/shared/api/wire'

/** A landing or editor-page block, as Payload stores it. */
export type SectionBlock = NonNullable<LandingPage['sections']>[number] | NonNullable<Page['sections']>[number]

/**
 * What the sections resolve against, the same data the website's `getBlockContext` and section
 * components read: contact details for the calls to action, the audience, the real counts, and the
 * listed creators with their lookups for the network.
 */
export interface SectionContext extends WireContext {
  contact: ContactDetails
  personas: readonly AudiencePersona[]
  categories: readonly AudienceCategory[]
  specialtyCounts: Readonly<Record<string, SpecialtyCounts>>
  /** Listed creators; only read when a `creatorNetwork` block is present. */
  creators: readonly CreatorSummary[]
  directory: { lookups: Lookups; prefix: string } | null
  /** Told about a block type the app has no shape for; the block is skipped. */
  onUnknown?: (blockType: string) => void
}

const EXTERNAL = /^(https?:\/\/|tel:|mailto:)\S+$/

/**
 * A CMS call to action resolved as the website's `resolveCta` does: WhatsApp gives the wa.me link,
 * call gives `tel:`, a link gives a site path (no language prefix) or an absolute address. Anything
 * that cannot work (no label, no number, an in-page `#anchor`) is `null`.
 */
export function toWireCta(cta: Cta | null | undefined, contact: ContactDetails): CtaV1 | null {
  if (!cta?.label) return null
  const out = (kind: CtaV1['kind'], path: string | null, url: string | null): CtaV1 => ({ label: cta.label as string, kind, path, url })
  if (cta.kind === 'whatsapp') {
    const href = whatsappHref(contact.whatsappNumber, contact.whatsappMessage)
    return href ? out('whatsapp', null, href) : null
  }
  if (cta.kind === 'call') {
    const phone = contact.phoneNumber?.replace(/\s+/g, '')
    return phone ? out('call', null, `tel:${phone}`) : null
  }
  const href = cta.href?.trim()
  if (!href) return null
  if (href.startsWith('/')) {
    const path = stripLocalePrefix(href)
    return SITE_PATH.test(path) ? out('link', path, null) : null
  }
  return EXTERNAL.test(href) ? out('link', null, href) : null
}

export function toWireHero(hero: LandingPage['hero'], ctx: Pick<SectionContext, 'base' | 'contact'>): HeroV1 {
  const opacity = hero?.overlayOpacity
  return {
    eyebrow: hero?.eyebrow || null,
    headline: hero?.headline ?? '',
    subheadline: hero?.subheadline || null,
    trustChips: (hero?.trustChips ?? []).map((c) => c.text).filter(Boolean),
    layout: hero?.layout === 'ctas' ? 'ctas' : 'briefBuilder',
    primaryCta: toWireCta(hero?.primaryCta, ctx.contact),
    secondaryCta: toWireCta(hero?.secondaryCta, ctx.contact),
    image: toWireImage(hero?.image, ctx.base),
    imageMobile: toWireImage(hero?.imageMobile, ctx.base),
    overlay: toWireImage(hero?.overlay, ctx.base),
    overlayOpacity: typeof opacity === 'number' ? Math.min(100, Math.max(0, opacity)) : null,
  }
}

const fromCategory = (c: Category) => ({
  id: String(c.id),
  slug: c.slug,
  name: c.name,
  glyph: c.glyph,
  description: c.description,
  scene: c.scene ?? null,
  media: c.image && typeof c.image === 'object' ? c.image : null,
  personas: (c.personas ?? []).map((p) => String(typeof p === 'object' ? p.id : p)),
})

/**
 * One block as a v1 section, resolved as the website renders it. An unknown block type gives `null`
 * (the caller skips it) and is reported through `ctx.onUnknown`.
 */
export function toWireSection(block: SectionBlock, ctx: SectionContext): SectionV1 | null {
  const anchor = block.anchor || null
  const cta = (value: Cta | null | undefined) => toWireCta(value, ctx.contact)
  switch (block.blockType) {
    case 'howItWorks':
      return {
        type: 'howItWorks',
        anchor,
        heading: block.heading,
        subheading: block.subheading || null,
        steps: (block.steps ?? []).map((s) => ({ title: s.title, body: s.body || null, visual: s.visual ?? 'none' })),
        cta: cta(block.cta),
      }
    case 'features':
      return {
        type: 'features',
        anchor,
        heading: block.heading,
        subheading: block.subheading || null,
        items: (block.items ?? []).map((i) => ({ title: i.title, body: i.body || null, glyph: i.glyph || null, pointsAt: i.pointsAt ?? 'none' })),
      }
    case 'categoriesGrid': {
      const manual = (block.categories ?? []).filter((c): c is Category => typeof c === 'object' && c !== null && c.active !== false)
      const items = block.source === 'manual' ? manual.map(fromCategory) : ctx.categories
      // A specialty page exists for every category the audience offers; a hand-picked one outside it has none.
      const audience = new Set(ctx.categories.map((c) => String(c.id)))
      return {
        type: 'categoriesGrid',
        anchor,
        heading: block.heading,
        subheading: block.subheading || null,
        tiles: items.map((c) => {
          const counts = ctx.specialtyCounts[String(c.id)]
          return {
            category: toWireCategory(c, ctx.base),
            counts: { samples: counts?.samples ?? 0, professionals: counts?.pros ?? 0 },
            hasPage: audience.has(String(c.id)),
          }
        }),
        cta: cta(block.cta),
      }
    }
    case 'personaBand': {
      const fill = (text: string | null | undefined) =>
        text && ctx.personas.length > 0 ? interpolatePersonaCopy(text, ctx.personas, { locale: ctx.locale }) : (text ?? '')
      return {
        type: 'personaBand',
        anchor,
        heading: fill(block.heading),
        body: block.body ? fill(block.body) : null,
        layout: block.layout === 'perPersona' ? 'perPersona' : 'combined',
        personas: ctx.personas.map(toWirePersona),
        cta: cta(block.cta),
      }
    }
    case 'faq':
      return {
        type: 'faq',
        anchor,
        heading: block.heading,
        items: (block.items ?? []).map((i) => ({ question: i.question, answer: toWireRichText(i.answer, ctx.base) })),
      }
    case 'logoCloud':
      return {
        type: 'logoCloud',
        anchor,
        heading: block.heading,
        logos: (block.logos ?? []).flatMap((l) => {
          const image = toWireImage(l.image, ctx.base)
          return image ? [{ name: l.name, image, imageDark: toWireImage(l.imageDark, ctx.base) }] : []
        }),
      }
    case 'richText':
      return { type: 'richText', anchor, content: toWireRichText(block.content, ctx.base) }
    case 'callToAction':
      return {
        type: 'callToAction',
        anchor,
        heading: block.heading,
        body: block.body || null,
        primary: cta(block.primary),
        secondary: cta(block.secondary),
      }
    case 'creatorNetwork': {
      const directory = ctx.directory
      const creators = directory
        ? networkSelection(ctx.creators, block.rule, block.count).map((c) => toWireCreatorCard(c, directory.lookups, directory.prefix, ctx))
        : []
      return {
        type: 'creatorNetwork',
        anchor,
        heading: block.heading,
        subheading: block.subheading || null,
        creators,
        cta: cta(block.cta),
      }
    }
    default: {
      ctx.onUnknown?.(String((block as { blockType?: unknown }).blockType))
      return null
    }
  }
}

/** Every known block in CMS order; unknown ones are skipped. */
export function toWireSections(blocks: readonly SectionBlock[] | null | undefined, ctx: SectionContext): SectionV1[] {
  return (blocks ?? []).map((b) => toWireSection(b, ctx)).filter((s): s is SectionV1 => s !== null)
}

/** The landing page: hero, in-page anchors (without `#`) and sections (FR-024). */
export function toWireLanding(landing: LandingPage, ctx: SectionContext): LandingV1 {
  return {
    locale: ctx.locale,
    hero: toWireHero(landing.hero, ctx),
    navigation: (landing.navigation ?? [])
      .map((n) => ({ label: n.label, target: n.target.replace(/^#/, '') }))
      .filter((n) => n.label && n.target),
    sections: toWireSections(landing.sections, ctx),
  }
}
