import type { CreatorSummary } from './types'

export type NetworkRule = 'featuredThenNewest' | 'newest' | 'featuredOnly'
export const NETWORK_COUNT_MIN = 3
export const NETWORK_COUNT_MAX = 12
const NETWORK_COUNT_DEFAULT = 6

const hasSamples = (c: CreatorSummary) => c.sampleCount > 0
/** A creator without samples is never treated as featured (spec edge case). */
const isFeatured = (c: CreatorSummary) => c.featured && hasSamples(c)
const newestFirst = (a: CreatorSummary, b: CreatorSummary) =>
  b.publishedAt.localeCompare(a.publishedAt) || a.code.localeCompare(b.code)

/**
 * The directory order (CP-US1-S2): featured first, then the most recently verified, ties by code;
 * creators without samples last. Featuring is the editor's way to set the order.
 */
export function orderCreators(creators: readonly CreatorSummary[]): CreatorSummary[] {
  return [...creators].sort(
    (a, b) =>
      Number(hasSamples(b)) - Number(hasSamples(a)) || Number(isFeatured(b)) - Number(isFeatured(a)) || newestFirst(a, b),
  )
}

function clampCount(count: number | null | undefined): number {
  if (typeof count !== 'number' || !Number.isFinite(count)) return NETWORK_COUNT_DEFAULT
  return Math.min(NETWORK_COUNT_MAX, Math.max(NETWORK_COUNT_MIN, Math.round(count)))
}

/** The landing "Our network" block (CP-FR-003): the editor's rule and count; only creators with samples. */
export function networkSelection(
  creators: readonly CreatorSummary[],
  rule: NetworkRule | null | undefined,
  count: number | null | undefined,
): CreatorSummary[] {
  const eligible = creators.filter(hasSamples)
  const limit = clampCount(count)
  if (rule === 'newest') return [...eligible].sort(newestFirst).slice(0, limit)
  if (rule === 'featuredOnly') return eligible.filter(isFeatured).sort(newestFirst).slice(0, limit)
  return orderCreators(eligible).slice(0, limit)
}
