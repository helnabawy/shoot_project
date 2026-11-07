import 'server-only'
import { matchesIntent } from '@shoot/domain/pages'
import type { Page } from '@/payload-types'
import { resolvePresets, type DroppedPreset } from '../brief/preset'
import { getBriefBuilderConfig } from '../brief/queries'
import type { BriefBuilderConfig } from '../brief/types'
import { creatorPath, describeCreator, getDirectoryContext, getPublicCreators } from '../creators'
import type { CreatorListItem } from '../creators/components/CreatorList'
import type { Locale } from '@/shared/lib/locale'
import { getPageBySlug, type PageRedirect, type PageResult } from './queries'

export const INTENT_CREATOR_LIMIT = 6

export interface IntentPage {
  status: 'found'
  page: Page
  slugs: PageResult['slugs']
  /** The brief builder, null when the site has no builder configured. */
  builder: BriefBuilderConfig | null
  preset: Record<string, string>
  dropped: DroppedPreset[]
  /** Up to six listed creators that fit the page; empty means the section is not shown. */
  creators: CreatorListItem[]
  /** How many listed creators fit (shown only when above zero). */
  creatorTotal: number
  faq: { question: string; answer: unknown }[]
  serviceName: string
  areaServed: string | null
  serviceType: string | null
}

const named = (value: unknown): { id: string; slug: string; name: string } | null =>
  value && typeof value === 'object' ? { id: String((value as { id: unknown }).id), slug: String((value as { slug: unknown }).slug), name: String((value as { name?: unknown; singular?: unknown }).name ?? (value as { singular?: unknown }).singular ?? '') } : null

/** An intent page with everything it shows, computed for one language; null when there is no such page. */
export async function getIntentPage(slug: string, locale: Locale, { draft = false }: { draft?: boolean } = {}): Promise<IntentPage | PageRedirect | null> {
  const found = await getPageBySlug(slug, locale, { kind: 'intent', draft })
  if (!found || found.status === 'redirect') return found
  const { page } = found
  const intent = page.intent
  const persona = named(intent?.persona)
  const specialty = named(intent?.specialty)
  const location = named(intent?.location)

  const [builder, creators, context] = await Promise.all([getBriefBuilderConfig(locale, { draft }), getPublicCreators(locale), getDirectoryContext(locale)])
  const { values, dropped } = builder
    ? resolvePresets(builder, { persona: persona?.slug, specialty: specialty?.slug, location: location?.slug, extra: intent?.presets ?? undefined })
    : { values: {}, dropped: [] }

  const key = { personaId: persona?.id, specialtyId: specialty?.id, locationId: location?.id }
  const matching = creators.filter((c) => matchesIntent(c, key))
  return {
    status: 'found',
    page,
    slugs: found.slugs,
    builder,
    preset: values,
    dropped,
    creators: matching.slice(0, INTENT_CREATOR_LIMIT).map((creator) => ({
      creator,
      view: describeCreator(creator, context.lookups, context.prefix, locale),
      href: creatorPath(creator.code, locale),
    })),
    creatorTotal: matching.length,
    faq: (intent?.faq ?? []).map((item) => ({ question: item.question, answer: item.answer })),
    serviceName: intent?.serviceName || page.title,
    areaServed: intent?.areaServed || location?.name || null,
    serviceType: specialty?.name ?? null,
  }
}

/** Intent pages for the sitemap come from the same listing as other pages. */
export { listPagesForSitemap as listIntentForSitemap } from './queries'
