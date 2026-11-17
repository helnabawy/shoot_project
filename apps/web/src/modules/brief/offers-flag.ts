import type { SiteSetting } from '@/payload-types'

/**
 * 022: the brief bar ends with the client's price when Quick Match and "Creators offer prices" are both on.
 * Read from the cached site settings; the server checks again when the brief is sent.
 */
export function offersOf(settings: SiteSetting): { feePercent: number } | null {
  const qm = settings.quickMatch as { enabled?: boolean | null; offers?: { enabled?: boolean | null; feePercent?: number | null } | null } | null | undefined
  if (qm?.enabled !== true || qm.offers?.enabled !== true) return null
  return { feePercent: qm.offers.feePercent ?? 10 }
}
