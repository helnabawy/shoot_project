import 'server-only'
import type { MatchCreatorV1, MatchV1 } from '@shoot/domain/api/v1'
import type { Payload } from 'payload'
import { getDirectoryContext, toWireCreatorCard } from '@/modules/creators'
import { THUMB_MAX_WIDTH, upTo } from '@/modules/creators/wire'
import type { Locale } from '@/shared/lib/locale'
import { toWireImage, wireContext } from '@/shared/api/wire'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { getLandingPage } from '@/modules/landing/queries'
import type { OptionSet } from '@/payload-types'
import { DURATION_SET, getBriefByKey, getMatchPage } from '../match'

/**
 * Step 2 for the app (012 US1): the website's match page as the `matchV1` answer. The brief is found
 * by its private link; `null` is the same 404 for an unknown reference and a wrong key.
 */

interface SampleRow {
  kind?: string | null
  image?: unknown
}

/** Up to three pieces of work per creator, thumbnails only (research R8). */
async function galleries(payload: Payload, ids: string[], ctx: ReturnType<typeof wireContext>): Promise<Map<string, MatchCreatorV1['gallery']>> {
  const out = new Map<string, MatchCreatorV1['gallery']>()
  if (!ids.length) return out
  const { docs } = await payload.find({
    collection: 'creator-profiles',
    where: { id: { in: ids.map(Number) } },
    depth: 1,
    pagination: false,
    overrideAccess: true,
    select: { samples: true },
  })
  for (const doc of docs) {
    const rows: MatchCreatorV1['gallery'] = []
    for (const raw of ((doc as { samples?: SampleRow[] | null }).samples ?? []) as SampleRow[]) {
      const image = toWireImage(raw.image as never, ctx.base)
      if (!image) continue
      rows.push({ kind: raw.kind === 'video' ? 'video' : 'image', thumb: upTo(image, THUMB_MAX_WIDTH) })
      if (rows.length === 3) break
    }
    out.set(String(doc.id), rows)
  }
  return out
}

export interface MatchInput {
  ref: string
  key: string
  userId?: number | null
  date?: string
  duration?: string
  locale: Locale
  now: Date
}

export async function matchView(payload: Payload, input: MatchInput): Promise<MatchV1 | null> {
  const brief = await getBriefByKey(input.ref, input.key, input.userId)
  if (!brief) return null
  const { locale } = input
  const page = await getMatchPage(brief, locale, input.now, { date: input.date, duration: input.duration })
  const context = await getDirectoryContext(locale)
  const ctx = wireContext(locale)
  const shown = page.sections.flatMap((s) => s.creators.map((c) => c.id))
  const [gallery, settings, landing] = await Promise.all([galleries(payload, [...new Set(shown)], ctx), getSiteSettings(locale), getLandingPage({ locale })])
  const durationSet = (landing.briefBuilder?.slots ?? []).map((s) => s.optionSet).find((set): set is OptionSet => typeof set === 'object' && set !== null && set.slug === DURATION_SET)
  return {
    locale,
    brief: {
      reference: brief.reference ?? input.ref,
      sentence: brief.sentence ?? '',
      date: page.facts.date,
      duration: page.facts.duration?.value ?? null,
    },
    date: input.date !== undefined ? input.date : page.facts.date,
    priceOnRequest: !page.total.ok,
    durations: (durationSet?.options ?? []).filter((o) => o.active !== false).map((o) => ({ value: o.value, label: o.label })),
    totalFils: page.total.ok ? page.total.total : null,
    sections: page.sections.map((s) => {
      const tier = s.price.ok ? s.price.lines.find((l) => l.kind === 'tier') : undefined
      return {
        persona: { slug: s.persona.slug, singular: s.persona.singular, plural: s.persona.plural },
        priceFils: s.price.ok ? s.price.total : null,
        includes: tier?.deliverables?.[locale] ?? [],
        creators: s.creators.map((c) => ({ ...toWireCreatorCard(c, context.lookups, context.prefix, ctx), gallery: gallery.get(c.id) ?? [] })),
      }
    }),
    nearby: page.nearby.map((date) => ({ date, free: page.nearbyFree[date] ?? 0 })),
    whatsappUrl: whatsappHref(settings.whatsappNumber, brief.sentence ?? ''),
  }
}
