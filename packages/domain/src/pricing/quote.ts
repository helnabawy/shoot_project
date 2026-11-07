import { CURRENCY, sumAmounts } from './money'
import { applyPromo, validatePromo } from './promo'
import type { PriceLine, PriceRules, PromoReason, PromoRule, QuoteInput, QuoteResult } from './types'

/**
 * The one price of a brief (research §3): per professional type the active tier for the duration plus the
 * travel fee for the location, then add-ons once, then the promo code. Same price for every creator listed.
 */
export function quotePrice(rules: PriceRules, input: QuoteInput): QuoteResult {
  if (input.custom?.duration || input.custom?.location) return { ok: false, reason: 'custom-value' }
  if (input.personaIds.length === 0) return { ok: false, reason: 'no-tier' }
  const fee = rules.travelFees.find((f) => f.active && f.location === input.location)
  if (!fee) return { ok: false, reason: 'no-travel-fee' }

  const lines: PriceLine[] = []
  for (const personaId of input.personaIds) {
    const tier = rules.tiers.find((t) => t.active && t.personaId === personaId && t.duration === input.duration)
    if (!tier) return { ok: false, reason: 'no-tier' }
    lines.push({ kind: 'tier', label: tier.title, amount: tier.price, personaId, deliverables: tier.deliverables })
    if (fee.fee > 0) lines.push({ kind: 'travel', label: input.labels.travel, amount: fee.fee, personaId })
  }

  for (const id of new Set(input.addOnIds ?? [])) {
    const addOn = rules.addOns.find((a) => a.id === id && a.active)
    if (!addOn) continue
    if (addOn.personaIds.length && !addOn.personaIds.some((p) => input.personaIds.includes(p))) continue
    lines.push({ kind: 'addon', label: addOn.title, amount: addOn.price })
  }

  const subtotal = sumAmounts(lines)
  let discount = 0
  let promo: { code: string; applied: boolean; reason?: PromoReason } | null = null
  if (input.promo) {
    const check = validatePromo(input.promo.rule, input.now)
    if (!check.ok) {
      promo = { code: input.promo.code, applied: false, reason: check.reason }
    } else {
      // validatePromo only passes a rule that exists.
      discount = applyPromo(subtotal, input.promo.rule as PromoRule)
      lines.push({ kind: 'discount', label: input.labels.discount, amount: -discount })
      promo = { code: input.promo.code, applied: true }
    }
  }
  return { ok: true, lines, subtotal, discount, total: subtotal - discount, currency: CURRENCY, promo }
}
