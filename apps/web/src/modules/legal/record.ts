import 'server-only'
import type { LegalKind } from '@shoot/domain/pages'
import type { Payload } from 'payload'
import type { Locale } from '@/shared/lib/locale'
import { currentVersions } from './queries'

/** The documents an account accepts when it registers: everyone Terms and Privacy, professionals also Professional Terms. */
export const acceptedKinds = (accountType: 'seeker' | 'provider'): LegalKind[] =>
  accountType === 'provider' ? ['terms', 'professional-terms', 'privacy'] : ['terms', 'privacy']

/**
 * Records the versions in force for the new account. A kind with nothing in force is skipped (the
 * site can be launched before every document exists; the launch checklist covers it).
 */
export async function recordAcceptances(
  payload: Payload,
  { userId, accountType, locale, now = new Date() }: { userId: number | string; accountType: 'seeker' | 'provider'; locale: Locale; now?: Date },
): Promise<number> {
  const versions = await currentVersions(acceptedKinds(accountType), now)
  for (const { kind, version } of versions) {
    await payload.create({
      collection: 'legal-acceptances',
      data: { user: userId as number, kind, version, acceptedAt: now.toISOString(), locale },
      overrideAccess: true,
    })
  }
  return versions.length
}
