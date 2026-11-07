import 'server-only'
import { fils, normalisePromoCode, type Localized, type PriceRules, type PromoRule } from '@shoot/domain/pricing'
import { refId, type Ref } from '@shoot/domain/personas'
import { cachedQuery } from '@/shared/lib/cache'
import { getPayloadClient } from '@/shared/lib/payload'

type MaybeLocalized = string | Partial<Record<'en' | 'ar', string | null>> | null | undefined

/** A field read with `locale: 'all'` as both languages, English filling a missing Arabic value. */
export function both(value: MaybeLocalized): Localized {
  if (value && typeof value === 'object') {
    const en = value.en ?? ''
    return { en, ar: value.ar || en }
  }
  return { en: value ?? '', ar: value ?? '' }
}

interface RawTier {
  id: number
  persona: Ref
  duration: string
  price: number
  title?: MaybeLocalized
  deliverables?: { text?: MaybeLocalized }[] | null
  active?: boolean | null
}

/** Active price rules in fils with both languages (QM-FR-009); cached under the `pricing` tag. */
export function getPriceRules(): Promise<PriceRules> {
  return cachedQuery(['pricing', 'personas'], ['price-rules'], async () => {
    const payload = await getPayloadClient()
    const common = { depth: 0, pagination: false, locale: 'all', overrideAccess: true, where: { active: { equals: true } } } as const
    const [tiers, fees, addOns] = await Promise.all([
      payload.find({ collection: 'service-tiers', ...common, sort: 'order' }),
      payload.find({ collection: 'travel-fees', ...common }),
      payload.find({ collection: 'add-ons', ...common, sort: 'order' }),
    ])
    return {
      tiers: (tiers.docs as unknown as RawTier[]).map((t) => {
        const items = (t.deliverables ?? []).map((d) => both(d.text))
        return {
          id: String(t.id),
          personaId: refId(t.persona),
          duration: t.duration,
          price: fils(t.price),
          title: both(t.title),
          deliverables: { en: items.map((i) => i.en), ar: items.map((i) => i.ar) },
          active: true,
        }
      }),
      travelFees: fees.docs.map((f) => ({ location: f.location, fee: fils(f.fee), active: true })),
      addOns: (addOns.docs as unknown as { id: number; title?: MaybeLocalized; price: number; personas?: Ref[] | null }[]).map((a) => ({
        id: String(a.id),
        title: both(a.title),
        price: fils(a.price),
        personaIds: (a.personas ?? []).map(refId),
        active: true,
      })),
    }
  })
}

/** Extras offered for these professional types, in one language, for the step 3 form. */
export async function getAddOnsFor(personaIds: readonly string[], locale: 'en' | 'ar') {
  const rules = await getPriceRules()
  return rules.addOns
    .filter((a) => !a.personaIds.length || a.personaIds.some((p) => personaIds.includes(p)))
    .map((a) => ({ id: a.id, title: a.title[locale], price: a.price }))
}

/** The rule for a typed code (server only, never cached: `usedCount` must be current). */
export async function findPromo(input: string): Promise<{ code: string; rule: PromoRule | null } | null> {
  const code = normalisePromoCode(input)
  if (!code) return input.trim() ? { code: input.trim().toUpperCase().slice(0, 20), rule: null } : null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'promo-codes', where: { code: { equals: code } }, limit: 1, depth: 0, overrideAccess: true })
  const doc = docs[0]
  if (!doc) return { code, rule: null }
  return {
    code,
    rule: {
      code,
      kind: doc.kind,
      value: doc.kind === 'fixed' ? fils(doc.value) : doc.value,
      startsAt: doc.startsAt ?? null,
      endsAt: doc.endsAt ?? null,
      usageLimit: doc.usageLimit ?? null,
      usedCount: doc.usedCount ?? 0,
      active: doc.active !== false,
    },
  }
}
