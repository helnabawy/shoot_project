import 'server-only'
import { dubaiToday, matchCreators, nearbyDates, type MatchFilter } from '@shoot/domain/booking'
import type { CreatorSummary } from '@shoot/domain/creators'
import { quotePrice, type QuoteResult } from '@shoot/domain/pricing'
import { getTranslations } from 'next-intl/server'
import { getLocations, getPublicCreators } from '@/modules/creators'
import { getLandingPage } from '@/modules/landing/queries'
import { getActivePersonas, type AudiencePersona } from '@/modules/personas/queries'
import { getPriceRules } from '@/modules/pricing'
import type { Brief, OptionSet } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { keyMatches } from './keys'

/** Price rules are keyed on these two option sets (research §4); every other slot is plain brief text. */
export const DURATION_SET = 'durations'
export const LOCATION_SET = 'locations'

export interface BriefFacts {
  personaIds: string[]
  duration: { value: string; custom: boolean } | null
  location: { value: string; custom: boolean } | null
  date: string | null
  filters: MatchFilter[]
  categoryId: string | null
}

type Selection = NonNullable<Brief['selections']>[number]
type Slot = NonNullable<NonNullable<Awaited<ReturnType<typeof getLandingPage>>['briefBuilder']>['slots']>[number]

const idOf = (v: unknown) => String(v && typeof v === 'object' ? (v as { id: unknown }).id : v)

/** What a saved brief means for matching and pricing, read through the slots' option sets (persona-safe). */
export function briefFacts(brief: Pick<Brief, 'persona' | 'selections' | 'date'>, slots: readonly Slot[]): BriefFacts {
  const selections = brief.selections ?? []
  const pick = (slot: Slot): Selection | undefined => selections.find((s) => s.token === slot.token)
  const setOf = (slot: Slot) => (slot.optionSet && typeof slot.optionSet === 'object' ? (slot.optionSet as OptionSet) : null)
  const facts: BriefFacts = {
    personaIds: (brief.persona ?? []).map(idOf),
    duration: null,
    location: null,
    date: brief.date ? String(brief.date).slice(0, 10) : null,
    filters: [],
    categoryId: null,
  }
  for (const slot of slots) {
    const set = setOf(slot)
    const selection = pick(slot)
    if (!set || !selection?.value) continue
    const value = { value: selection.value, custom: Boolean(selection.custom) }
    const option = selection.custom ? undefined : (set.options ?? []).find((o) => o.value === selection.value)
    if (set.slug === DURATION_SET) facts.duration = value
    if (set.slug === LOCATION_SET) facts.location = value
    if (slot.filtersCreators && !selection.custom) facts.filters.push({ value: selection.value, matchesAny: Boolean(option?.matchesAny) })
    if (option?.category && !facts.categoryId) facts.categoryId = idOf(option.category)
  }
  return facts
}

export interface BriefRecord extends Brief {
  accessSalt?: string | null
}

/** The brief behind a private link, or null (unknown reference, wrong key: the same 404, research §2). */
export async function getBriefByKey(ref: string, key: string, memberId?: number | null): Promise<BriefRecord | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'briefs', where: { reference: { equals: ref.toUpperCase() } }, limit: 1, depth: 0, overrideAccess: true, showHiddenFields: true })
  const brief = docs[0] as BriefRecord | undefined
  if (!brief) return null
  const member = brief.member ? Number(idOf(brief.member)) : null
  if (keyMatches(key, brief.accessSalt, 'brief') || (memberId != null && member === memberId)) return brief
  return null
}

/** Creators not free on a day: blocked by themselves or already booked (one indexed query). */
export async function unavailableOn(dates: readonly string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>(dates.map((d) => [d, new Set<string>()]))
  if (!dates.length) return out
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'availability-blocks', where: { date: { in: dates } }, depth: 0, pagination: false, overrideAccess: true, select: { creator: true, date: true } })
  for (const block of docs) out.get(block.date)?.add(idOf(block.creator))
  return out
}

export interface MatchSection {
  persona: AudiencePersona
  price: QuoteResult
  creators: CreatorSummary[]
}

export interface MatchPage {
  brief: BriefRecord
  facts: BriefFacts
  sections: MatchSection[]
  /** One price for the whole brief (every type), or the reason it is "price on request". */
  total: QuoteResult
  /** Other days with someone free, when a section is empty on the chosen date (US1-S2). */
  nearby: string[]
}

/** Labels for the travel and discount lines, frozen in both languages. */
export async function lineLabels(promoCode?: string) {
  const [en, ar] = await Promise.all([getTranslations({ locale: 'en', namespace: 'quote' }), getTranslations({ locale: 'ar', namespace: 'quote' })])
  return {
    travel: { en: en('travelLine'), ar: ar('travelLine') },
    discount: { en: en('discountLine', { code: promoCode ?? '' }), ar: ar('discountLine', { code: promoCode ?? '' }) },
  }
}

/** Step 2: per professional type the fixed price and the creators free that day (US1, FR-002, FR-003). */
export async function getMatchPage(brief: BriefRecord, locale: Locale, now: Date, options: { date?: string | null } = {}): Promise<MatchPage> {
  const [landing, personas, creators, locations, rules, labels] = await Promise.all([
    getLandingPage({ locale }),
    getActivePersonas(locale),
    getPublicCreators(locale, { listedOnly: true }),
    getLocations(locale),
    getPriceRules(),
    lineLabels(),
  ])
  const facts = briefFacts(brief, landing.briefBuilder?.slots ?? [])
  const date = options.date !== undefined ? options.date : facts.date
  const emirate = facts.location && !facts.location.custom ? (locations.find((l) => l.slug === facts.location?.value && !l.parentId)?.id ?? null) : null
  const base = { duration: facts.duration?.value ?? '', location: facts.location?.value ?? '', custom: { duration: facts.duration?.custom, location: facts.location?.custom }, labels, now }

  const today = dubaiToday(now)
  const window = date ? Array.from({ length: 15 }, (_, i) => new Date(Date.parse(`${date}T00:00:00Z`) + (i - 7) * 86_400_000).toISOString().slice(0, 10)) : []
  const blocks = await unavailableOn(window)
  const freeFor = (personaId: string, day: string | null) =>
    matchCreators(creators, { personaId, emirateId: emirate, blocked: day ? (blocks.get(day) ?? new Set()) : new Set(), filters: facts.filters, categoryId: facts.categoryId })

  const sections = facts.personaIds
    .map((id) => personas.find((p) => p.id === id))
    .filter((p): p is AudiencePersona => Boolean(p))
    .map((persona) => ({ persona, price: quotePrice(rules, { ...base, personaIds: [persona.id] }), creators: freeFor(persona.id, date) }))

  const nearby =
    date && sections.some((s) => s.creators.length === 0)
      ? nearbyDates(date, (day) => sections.every((s) => freeFor(s.persona.id, day).length > 0), { today })
      : []
  return { brief, facts, sections, total: quotePrice(rules, { ...base, personaIds: sections.map((s) => s.persona.id) }), nearby }
}
