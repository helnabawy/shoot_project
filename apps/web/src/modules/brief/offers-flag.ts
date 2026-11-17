import { mapsEnabled } from '@/modules/maps/providers'
import type { SiteSetting } from '@/payload-types'
import { env } from '@/shared/lib/env'

/**
 * 022: the brief bar ends with the client's price when Quick Match and "Creators offer prices" are both on.
 * Read from the cached site settings; the server checks again when the brief is sent.
 */
export function offersOf(settings: SiteSetting): { feePercent: number; maps: boolean } | null {
  const qm = settings.quickMatch as { enabled?: boolean | null; offers?: { enabled?: boolean | null; feePercent?: number | null } | null } | null | undefined
  if (qm?.enabled !== true || qm.offers?.enabled !== true) return null
  // The place step shows when this deployment has map keys (R15); without them the emirate list stays.
  return { feePercent: qm.offers.feePercent ?? 10, maps: mapsEnabled(env()) }
}
