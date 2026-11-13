import 'server-only'
import { briefMatchesCreator, renderTemplate } from '@shoot/domain/booking'
import { formatBriefDate } from '@shoot/domain/brief/message'
import type { Payload } from 'payload'
import { briefFacts, unavailableOn } from '@/modules/booking'
import { getLocations, getPublicCreators } from '@/modules/creators'
import { getLandingPage } from '@/modules/landing/queries'
import { pushToUser } from '@/modules/push'
import type { Brief } from '@/payload-types'
import { later, PUSH_TITLES, templateText, writeRow } from './notify-brief'

type Lang = 'en' | 'ar'
type Localized = Partial<Record<Lang, string | null>> | string | null | undefined
const pick = (value: Localized, locale: Lang) => (typeof value === 'string' ? value : (value?.[locale] ?? value?.en ?? ''))
const relId = (v: unknown): number | null => (v == null ? null : typeof v === 'object' ? Number((v as { id: unknown }).id) : Number(v))

export const INBOX_PATH = '/account/inbox'

/**
 * A new brief (US5, FR-018): every live creator it matches by the Quick Match rules (only the named creator
 * for a brief sent to one) gets an in-app row and one push in their device's language. Returns how many
 * creators were told. Never throws into the brief flow.
 */
export async function announceBrief(payload: Payload, briefId: number): Promise<number> {
  try {
    const brief = (await payload.findByID({ collection: 'briefs', id: briefId, depth: 0, overrideAccess: true })) as Brief
    if (brief.status !== 'new') return 0
    const [landing, creators, locations, settings, personas] = await Promise.all([
      getLandingPage({ locale: 'en' }),
      getPublicCreators('en', { listedOnly: true }),
      getLocations('en'),
      payload.findGlobal({ slug: 'site-settings', locale: 'all' as never, depth: 0, overrideAccess: true }) as unknown as Promise<{ quickMatch?: { templates?: Parameters<typeof templateText>[0] | null } | null }>,
      payload.find({ collection: 'personas', depth: 0, pagination: false, locale: 'all' as never, overrideAccess: true }),
    ])
    const facts = briefFacts(brief, landing.briefBuilder?.slots ?? [])
    const emirate = facts.location && !facts.location.custom ? (locations.find((l) => l.slug === facts.location?.value && !l.parentId)?.id ?? null) : null
    const blocks = facts.date ? ((await unavailableOn([facts.date])).get(facts.date) ?? new Set<string>()) : new Set<string>()
    const input = { personaIds: facts.personaIds, emirateId: emirate, date: facts.date, namedCreatorId: brief.creator ? String(relId(brief.creator)) : null, filters: facts.filters }
    const matched = creators
      .map((c) => ({ creator: c, personas: briefMatchesCreator(c, input, blocks.has(c.id) && facts.date ? new Set([facts.date]) : new Set()) }))
      .filter((m) => m.personas.length)
    if (!matched.length) return 0

    const owners = await payload.find({ collection: 'creator-profiles', where: { id: { in: matched.map((m) => Number(m.creator.id)) } }, depth: 0, pagination: false, draft: true, overrideAccess: true, select: { user: true } })
    const ownerOf = new Map(owners.docs.map((d) => [String(d.id), relId(d.user)]))
    const templates = settings.quickMatch?.templates ?? []
    const label = (token: string) => (brief.selections ?? []).find((s) => s.token === token)
    const occasion = (brief.selections ?? []).find((s) => !['persona', 'date', 'duration', 'location', 'shotBy'].includes(s.token))
    const text = (locale: Lang, personaId: string) =>
      renderTemplate(templateText(templates, 'brief-new', 'creator', locale), {
        type: pick((personas.docs.find((p) => String(p.id) === personaId) as { singular?: Localized } | undefined)?.singular, locale),
        occasion: occasion?.label ?? occasion?.value ?? '',
        emirate: label('location')?.label ?? label('location')?.value ?? '',
        date: facts.date ? formatBriefDate(facts.date, locale) : '',
        reference: brief.reference ?? '',
      })

    let told = 0
    for (const { creator, personas: matchedPersonas } of matched) {
      const user = ownerOf.get(creator.id)
      if (!user) continue
      const personaId = matchedPersonas[0]!
      await writeRow(payload, { brief: brief.id, event: 'brief-new', audience: 'creator', channel: 'in-app', locale: 'en', user, text: text('en', personaId), link: INBOX_PATH })
      // The push row is the dedupe guard: one push per creator and brief.
      if (!(await writeRow(payload, { brief: brief.id, event: 'brief-new', audience: 'creator', channel: 'push', locale: 'en', user, text: text('en', personaId), link: INBOX_PATH }))) continue
      told += 1
      await pushToUser(payload, user, (locale) => ({ title: PUSH_TITLES['brief-new'][locale], body: text(locale, personaId), data: { event: 'brief-new', path: INBOX_PATH } }))
    }
    return told
  } catch (error) {
    console.warn(`[inbox] announce skipped: ${(error as Error).message.slice(0, 80)}`)
    return 0
  }
}

/** For the two brief writers: announce after the response, never delaying or failing the brief. */
export async function announceLater(payload: Payload, briefId: number): Promise<void> {
  await later(() => announceBrief(payload, briefId))
}
