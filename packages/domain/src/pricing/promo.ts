import type { PromoReason, PromoRule } from './types'

const CODE = /^[A-Z0-9]{3,20}$/

/** What the visitor typed → the stored form ("welcome20 " → "WELCOME20"), or null. */
export function normalisePromoCode(input: string): string | null {
  const code = input.trim().toUpperCase()
  return CODE.test(code) ? code : null
}

export function validatePromo(rule: PromoRule | null | undefined, now: Date): { ok: true } | { ok: false; reason: PromoReason } {
  if (!rule) return { ok: false, reason: 'unknown' }
  if (!rule.active) return { ok: false, reason: 'inactive' }
  if (rule.value <= 0 || (rule.kind === 'percent' && rule.value > 100)) return { ok: false, reason: 'invalid' }
  if (rule.startsAt && new Date(rule.startsAt).getTime() > now.getTime()) return { ok: false, reason: 'not-started' }
  if (rule.endsAt && new Date(rule.endsAt).getTime() < now.getTime()) return { ok: false, reason: 'expired' }
  if (rule.usageLimit != null && rule.usedCount >= rule.usageLimit) return { ok: false, reason: 'used-up' }
  return { ok: true }
}

/** The discount in fils for a valid rule: never more than the subtotal. */
export function applyPromo(subtotal: number, rule: PromoRule): number {
  const raw = rule.kind === 'percent' ? Math.round((subtotal * rule.value) / 100) : rule.value
  return Math.min(raw, subtotal)
}
