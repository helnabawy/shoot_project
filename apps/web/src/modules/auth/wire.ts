import type { MeV1 } from '@shoot/domain/api/v1'
import type { User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'

/**
 * The member's own account as `meV1` (contracts/auth-api.md "GET me"). Built field by field, so
 * `sessions`, `hash`, `salt`, `loginAttempts`, `lockUntil`, `roles` and legal records are never sent.
 * Personas must be populated (depth ≥ 1) to give their slugs.
 */
export function toWireMe(user: User, locale: Locale): MeV1 {
  const personas = (user.persona ?? []).flatMap((p) => (typeof p === 'object' && p !== null && typeof p.slug === 'string' ? [p.slug] : []))
  return {
    id: String(user.id),
    name: user.name ?? null,
    phone: user.username ?? null,
    email: user.email ?? null,
    accountType: user.accountType === 'provider' ? 'provider' : 'seeker',
    personas,
    locale,
  }
}
