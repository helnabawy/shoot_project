import { randomBytes } from 'node:crypto'
import type { SignupV1 } from '@shoot/domain/api/v1'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { recordAcceptances } from '../../legal'
import { getActivePersonas } from '../../personas/queries'

export type Signup = SignupV1

/** True for a unique-index violation (two first verifies of one new number, research R12). */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string }; name?: string; data?: unknown; message?: string }
  if (e?.code === '23505' || e?.cause?.code === '23505') return true
  return e?.name === 'ValidationError' && JSON.stringify(e.data ?? '').includes('username')
}

/** The active personas by slug, in the order chosen, or `null` when one is not active (OT-US4-S6). */
export async function resolvePersonas(slugs: readonly string[], locale: Locale): Promise<number[] | null> {
  if (slugs.length === 0) return []
  const active = await getActivePersonas(locale)
  const ids = slugs.map((slug) => active.find((p) => p.slug === slug)?.id)
  return ids.every((id) => id !== undefined) ? ids.map(Number) : null
}

/**
 * A new code account (research R12): always `roles: ['member']`, a random unusable password, the
 * proven number as `username` and as contact `phone`, the optional name, and the legal acceptances
 * for its account type. Throws a unique violation when the number was claimed concurrently.
 */
export async function createCodeAccount(
  payload: Payload,
  { phone, signup, personaIds, locale, now }: { phone: string; signup: Signup | undefined; personaIds: number[]; locale: Locale; now: Date },
): Promise<User> {
  const accountType = signup?.accountType ?? 'seeker'
  const user = await payload.create({
    collection: 'users',
    data: {
      username: phone,
      phone,
      name: signup?.name ?? null,
      password: randomBytes(32).toString('base64url'),
      roles: ['member'],
      accountType,
      persona: accountType === 'provider' ? personaIds : [],
    } as never,
    overrideAccess: true,
  })
  // The account exists either way; a failure here is logged without personal data.
  await recordAcceptances(payload, { userId: user.id, accountType, locale, now }).catch(() =>
    payload.logger.error({ userId: user.id }, 'otp signup: could not record the legal acceptance'),
  )
  return user as User
}
