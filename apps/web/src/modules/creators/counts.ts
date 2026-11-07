import type { SpecialtyCounts } from '@shoot/domain/creators'

/** Translates `creators.specialty.samples` or `.pros` for a count (plural forms live in the messages). */
export type CountTranslate = (key: 'samples' | 'pros', values: { count: number }) => string

/**
 * "428 samples · 43 pros": each part only when it is above zero, never a zero or an invented number
 * (Principle IX); null when there is nothing true to say.
 */
export function countsLine(t: CountTranslate, counts: SpecialtyCounts | undefined): string | null {
  if (!counts) return null
  const parts = [
    ...(counts.samples > 0 ? [t('samples', { count: counts.samples })] : []),
    ...(counts.pros > 0 ? [t('pros', { count: counts.pros })] : []),
  ]
  return parts.length ? parts.join(' · ') : null
}
