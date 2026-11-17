import 'server-only'
import { emirateOf, inRange, insideUae, offerRange, offersOn, snapPublic, type OfferRange } from '@shoot/domain/booking'
import { quotePrice } from '@shoot/domain/pricing'
import type { Payload } from 'payload'
import { getLandingPage } from '@/modules/landing/queries'
import { getMapsProvider } from '@/modules/maps/providers'
import { getActivePersonas } from '@/modules/personas/queries'
import { getPriceRules } from '@/modules/pricing'
import type { Brief, Location } from '@/payload-types'
import { env } from '@/shared/lib/env'
import type { Locale } from '@/shared/lib/locale'
import { briefFacts } from './match'
import { readQuickMatch } from './settings'

/**
 * Feature 022: what a brief needs to go out as an offers brief (research R1–R4, R15). The client's price per
 * professional type is checked here, on the server (FR-006); the place's emirate comes from the pin through
 * the map provider, never from the client (FR-005), or from the emirate list when maps are off (FR-005d).
 */

export interface PlaceInput {
  lat: number
  lng: number
  placeId?: string
  source: 'search' | 'drag' | 'device'
}

export interface SuggestedPrice {
  personaId: string
  personaSlug: string
  suggestedFils: number | null
  range: OfferRange
}

type Terms =
  | { mode: 'fixed' }
  | {
      mode: 'offers'
      data: {
        offers: { mode: 'offers'; feePercent: number; minPercent: number; maxPercent: number }
        budgets: { persona: number; suggestedFils: number | null; amountFils: number }[]
        place: Record<string, unknown>
      }
      /** The emirate slug the brief is priced and matched by. */
      emirateSlug: string
      /** The brief builder's location slot. */
      locationToken: string
    }
type Refusal = { error: 'brief.errors.budgetRange' | 'brief.errors.emirateRequired' | 'brief.errors.placeOutside'; field: string }

const NO_LABELS = { travel: { en: '', ar: '' }, discount: { en: '', ar: '' } }

/** Locations as matching reads them, with the Google name of each emirate. */
async function loadLocations(payload: Payload) {
  const { docs } = await payload.find({ collection: 'locations', where: { active: { not_equals: false } }, depth: 0, pagination: false, overrideAccess: true, locale: 'en' })
  return (docs as Location[]).map((l) => ({
    id: String(l.id),
    slug: l.slug ?? '',
    parentId: l.parent ? String(typeof l.parent === 'object' ? l.parent.id : l.parent) : null,
    googleName: ((l as { googleName?: string | null }).googleName ?? l.name ?? '').toLowerCase(),
  }))
}

/** The emirate and area of a pin, read on the server (FR-005); null: outside the emirates served. */
export async function placeOfPin(payload: Payload, pin: PlaceInput, locale: Locale) {
  if (!insideUae(pin.lat, pin.lng)) return null
  const provider = getMapsProvider(env())
  const found = await provider.reverse(pin.lat, pin.lng, locale)
  if (!found || !found.reachable) return null
  const emirate = (await loadLocations(payload)).find((l) => !l.parentId && l.googleName === found.emirateName.toLowerCase())
  if (!emirate) return null
  return { emirate, area: found.area, address: found.address }
}

/** The suggested price and range per type of a brief (or of the answers so far), from today's price rules. */
export async function suggestedPrices(
  brief: Pick<Brief, 'persona' | 'selections' | 'date'>,
  locale: Locale,
  emirateSlug: string | null,
  settings: { minPercent: number; maxPercent: number },
): Promise<SuggestedPrice[]> {
  const [landing, personas, rules] = await Promise.all([getLandingPage({ locale }), getActivePersonas(locale), getPriceRules()])
  const facts = briefFacts(brief, landing.briefBuilder?.slots ?? [])
  const location = emirateSlug ?? (facts.location && !facts.location.custom ? facts.location.value : '')
  return facts.personaIds.map((personaId) => {
    const quote = quotePrice(rules, {
      personaIds: [personaId],
      duration: facts.duration?.value ?? '',
      location,
      custom: { duration: facts.duration?.custom },
      labels: NO_LABELS,
      now: new Date(),
    })
    const suggestedFils = quote.ok && quote.total > 0 ? quote.total : null
    return { personaId, personaSlug: personas.find((p) => p.id === personaId)?.slug ?? personaId, suggestedFils, range: offerRange(suggestedFils, settings) }
  })
}

/**
 * Decides the mode and, for offers, the frozen settings, the client's prices and the place (FR-003–FR-006).
 * `budgets` are whole fils keyed by persona slug or id; a missing one is the suggestion (older apps, FR-025).
 */
export async function offerTerms(
  payload: Payload,
  brief: Pick<Brief, 'persona' | 'selections' | 'date'>,
  locale: Locale,
  input: { budgets: Record<string, number>; place?: PlaceInput | null },
): Promise<Terms | Refusal> {
  const qm = await readQuickMatch(payload)
  if (!offersOn({ quickMatchEnabled: qm.enabled, offersEnabled: qm.offers.enabled })) return { mode: 'fixed' }

  const landing = await getLandingPage({ locale })
  const slots = landing.briefBuilder?.slots ?? []
  const facts = briefFacts(brief, slots)
  const locationToken = slots.find((s) => typeof s.optionSet === 'object' && s.optionSet?.slug === 'locations')?.token ?? 'location'

  // The place: a pin when maps are on (FR-005), else the emirate list (FR-005d).
  let emirateSlug: string | null = null
  let emirateId: string | null = null
  let place: Record<string, unknown>
  const mapsOn = getMapsProvider(env()).name !== 'off'
  if (mapsOn && input.place) {
    const found = await placeOfPin(payload, input.place, locale)
    if (!found) return { error: 'brief.errors.placeOutside', field: locationToken }
    emirateSlug = found.emirate.slug
    emirateId = found.emirate.id
    place = { lat: input.place.lat, lng: input.place.lng, address: found.address, area: found.area, emirate: Number(found.emirate.id), placeId: input.place.placeId ?? null, source: input.place.source, ...snapPublic(input.place.lat, input.place.lng) }
  } else if (mapsOn) {
    return { error: 'brief.errors.placeOutside', field: locationToken }
  } else {
    const locations = await loadLocations(payload)
    emirateId = emirateOf(facts.location?.value, facts.location?.custom ?? false, locations, { cityToEmirate: true })
    if (!emirateId) return { error: 'brief.errors.emirateRequired', field: locationToken }
    emirateSlug = locations.find((l) => l.id === emirateId)?.slug ?? null
    const city = locations.find((l) => l.slug === facts.location?.value && l.parentId)
    place = { area: city ? city.slug : emirateSlug, emirate: Number(emirateId), source: 'fallback', lat: null, lng: null, address: null, publicLat: null, publicLng: null }
  }

  const prices = await suggestedPrices(brief, locale, emirateSlug, qm.offers)
  const budgets: { persona: number; suggestedFils: number | null; amountFils: number }[] = []
  for (const p of prices) {
    const amount = input.budgets[p.personaSlug] ?? input.budgets[p.personaId] ?? p.suggestedFils
    if (amount == null || !inRange(amount, p.range)) return { error: 'brief.errors.budgetRange', field: `budget.${p.personaSlug}` }
    budgets.push({ persona: Number(p.personaId), suggestedFils: p.suggestedFils, amountFils: amount })
  }
  return {
    mode: 'offers',
    emirateSlug: emirateSlug as string,
    locationToken,
    data: { offers: { mode: 'offers', feePercent: qm.offers.feePercent, minPercent: qm.offers.minPercent, maxPercent: qm.offers.maxPercent }, budgets, place },
  }
}

/** Stores the offer terms on a brief just created (the fields are server-only, so this bypasses access). */
export async function saveOfferTerms(payload: Payload, briefId: number | string, terms: Extract<Terms, { mode: 'offers' }>, selections: { token: string; value: string; label?: string; custom?: boolean }[]) {
  const { locationToken } = terms
  // The brief's location selection names the pin's emirate, so travel pricing and matching read it unchanged.
  const fixed = selections.map((s) => (s.token === locationToken ? { ...s, value: terms.emirateSlug, custom: false } : s))
  await payload.update({ collection: 'briefs', id: briefId, data: { ...terms.data, selections: fixed } as never, overrideAccess: true, context: { disableRevalidate: true } })
}

/** The client's prices and pin as the website's brief form posts them (`budget.<slug>` in AED, `place.*`). */
export function offerFieldsFromForm(form: FormData): { budgets: Record<string, number>; place: PlaceInput | null } {
  const budgets: Record<string, number> = {}
  for (const [key, value] of form.entries()) {
    if (!key.startsWith('budget.')) continue
    const fils = aedToFils(value)
    if (fils !== null) budgets[key.slice('budget.'.length)] = fils
  }
  const lat = Number(form.get('place.lat'))
  const lng = Number(form.get('place.lng'))
  const source = String(form.get('place.source') ?? '')
  const place =
    form.get('place.lat') !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? { lat, lng, placeId: String(form.get('place.placeId') ?? '').slice(0, 300) || undefined, source: (['search', 'drag', 'device'].includes(source) ? source : 'drag') as PlaceInput['source'] }
      : null
  return { budgets, place }
}

/** Whole AED from a form field → fils; anything else is null. */
export function aedToFils(raw: unknown): number | null {
  const text = String(raw ?? '').replace(/[,\s]/g, '')
  if (!/^\d{1,7}$/.test(text)) return null
  return Number(text) * 100
}
