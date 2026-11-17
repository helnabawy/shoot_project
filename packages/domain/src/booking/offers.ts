import { sumAmounts } from '../pricing/money'
import type { Localized, PriceLine } from '../pricing/types'

/**
 * Feature 022, creator offers: the client names a price, creators accept it or answer with their own,
 * the client pays the chosen offers plus a platform fee. Amounts are fils (AED × 100).
 */

/** Offers mode needs Quick Match and the "Creators offer prices" switch (FR-001). */
export function offersOn(settings: { quickMatchEnabled?: boolean | null; offersEnabled?: boolean | null }): boolean {
  return settings.quickMatchEnabled === true && settings.offersEnabled === true
}

export interface OfferRange {
  min: number
  /** Null: no suggestion, so no ceiling (US1-S5). */
  max: number | null
}

const DIRHAM = 100
const toDirhams = (fils: number) => Math.round(fils / DIRHAM) * DIRHAM

/** Floor and ceiling as percentages of the suggested price, whole dirhams; without a suggestion, AED 1 and up. */
export function offerRange(suggestedFils: number | null, settings: { minPercent: number; maxPercent: number }): OfferRange {
  if (suggestedFils === null || suggestedFils <= 0) return { min: DIRHAM, max: null }
  return { min: toDirhams((suggestedFils * settings.minPercent) / 100), max: toDirhams((suggestedFils * settings.maxPercent) / 100) }
}

/** A price is a whole number of dirhams within the range (FR-006, FR-009). */
export function inRange(amountFils: number, range: OfferRange): boolean {
  if (!Number.isInteger(amountFils) || amountFils % DIRHAM !== 0) return false
  return amountFils >= range.min && (range.max === null || amountFils <= range.max)
}

/** The platform fee on one offer, whole dirhams (FR-021: everything VAT-inclusive). */
export function feeOf(amountFils: number, feePercent: number): number {
  return toDirhams((amountFils * feePercent) / 100)
}

export interface OfferPick {
  personaId: string
  /** "{profession} · {creator}", both languages. */
  label: Localized
  amount: number
}

/**
 * The quotation of an offers-mode booking (FR-017): one `offer` line per chosen offer and one `fee` line
 * equal to the sum of the per-offer fees, so the totals the client saw on each card add up (SC-004).
 */
export function offerQuote(picks: readonly OfferPick[], feePercent: number, feeLabel: Localized): { lines: PriceLine[]; subtotal: number; discount: number; total: number } {
  const lines: PriceLine[] = picks.map((p) => ({ kind: 'offer', label: p.label, amount: p.amount, personaId: p.personaId }))
  const fee = picks.reduce((sum, p) => sum + feeOf(p.amount, feePercent), 0)
  if (fee > 0) lines.push({ kind: 'fee', label: feeLabel, amount: fee })
  const subtotal = sumAmounts(lines)
  return { lines, subtotal, discount: 0, total: subtotal }
}

/** A creator may change their price this many times on one brief (FR-010). */
export const MAX_OFFER_CHANGES = 3

/** What the rules need to know about a creator's current answer to one brief and type. */
export interface OfferState {
  decision: 'accepted' | 'rejected'
  withdrawn: boolean
  /** The client declined this offer (FR-014): final. */
  declined: boolean
  revisions: number
  /** An issued, unexpired quotation (or a later booking) of the brief names this creator for this type. */
  locked: boolean
}

export type OfferRefusal = 'tooManyChanges' | 'declined' | 'picked'

/** May the creator make or change an offer? Null: nothing answered yet. */
export function canChange(current: OfferState | null): 'ok' | OfferRefusal {
  if (!current) return 'ok'
  if (current.declined) return 'declined'
  if (current.locked) return 'picked'
  if (current.withdrawn || current.decision !== 'accepted') return 'ok'
  return current.revisions >= MAX_OFFER_CHANGES ? 'tooManyChanges' : 'ok'
}

/** May the creator withdraw? Allowed until a quotation including the offer is issued (FR-010). */
export function canWithdraw(current: OfferState | null): 'ok' | Exclude<OfferRefusal, 'tooManyChanges'> {
  if (!current) return 'ok'
  if (current.declined) return 'declined'
  return current.locked ? 'picked' : 'ok'
}

/** Lowest total first, then whoever answered first (FR-013). Returns a new array. */
export function sortOffers<T extends { totalFils: number; answeredAt: string }>(offers: readonly T[]): T[] {
  return [...offers].sort((a, b) => a.totalFils - b.totalFils || a.answeredAt.localeCompare(b.answeredAt))
}

/** A short, stable fingerprint of what a live list shows (research R9): FNV-1a over the parts. */
export function offerStamp(parts: readonly string[]): string {
  let hash = 0x811c9dc5
  const text = parts.join('|')
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}
