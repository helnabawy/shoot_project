export interface Localized {
  en: string
  ar: string
}

export interface LocalizedList {
  en: string[]
  ar: string[]
}

/** A service tier: one professional type for one duration (a `durations` option value). */
export interface Tier {
  id: string
  personaId: string
  duration: string
  /** Fils. */
  price: number
  title: Localized
  deliverables: LocalizedList
  active: boolean
}

/** Travel fee per location (a `locations` option value), charged per professional. */
export interface TravelFee {
  location: string
  fee: number
  active: boolean
}

export interface AddOn {
  id: string
  title: Localized
  price: number
  /** Empty: offered with every professional type. */
  personaIds: string[]
  active: boolean
}

export type PromoKind = 'percent' | 'fixed'

export interface PromoRule {
  code: string
  kind: PromoKind
  /** Percent (1–100) or fils. */
  value: number
  startsAt?: string | null
  endsAt?: string | null
  usageLimit?: number | null
  usedCount: number
  active: boolean
}

export interface PriceRules {
  tiers: Tier[]
  travelFees: TravelFee[]
  addOns: AddOn[]
}

export type LineKind = 'tier' | 'travel' | 'addon' | 'discount' | 'adjustment'

export interface PriceLine {
  kind: LineKind
  label: Localized
  amount: number
  personaId?: string
  deliverables?: LocalizedList
}

export type PromoReason = 'unknown' | 'inactive' | 'invalid' | 'not-started' | 'expired' | 'used-up'

export interface QuoteInput {
  /** In the brief's order. */
  personaIds: string[]
  duration: string
  location: string
  /** True when the visitor typed their own words for that slot. */
  custom?: { duration?: boolean; location?: boolean }
  addOnIds?: string[]
  /** The code the visitor typed and the rule found for it (null: no such code). */
  promo?: { code: string; rule: PromoRule | null } | null
  /** Line labels the caller translates: the travel line and the discount line ("Code WELCOME20"). */
  labels: { travel: Localized; discount: Localized }
  now: Date
}

export type QuoteFailure = 'no-tier' | 'no-travel-fee' | 'custom-value'

export type QuoteResult =
  | {
      ok: true
      lines: PriceLine[]
      subtotal: number
      discount: number
      total: number
      currency: 'AED'
      promo: { code: string; applied: boolean; reason?: PromoReason } | null
    }
  | { ok: false; reason: QuoteFailure }
