import 'server-only'
import { decodeKeptBrief, encodeKeptBrief, isKeptBriefFresh, keptEntries, KEPT_BRIEF_COOKIE, KEPT_BRIEF_MAX_AGE_S, type KeptBrief } from '@shoot/domain/brief/kept'
import { cookies } from 'next/headers'
import type { PreparedBrief } from './commands/send-brief'

/**
 * The guest's brief while they sign in (feature 021, research R1). Not HttpOnly: the builder on a static
 * page reads it back to restore the answers. It holds answers only (FR-017); the server checks them again.
 */
export async function keepBrief({ form, config, locale, sentence }: PreparedBrief, now: Date): Promise<boolean> {
  const kept: KeptBrief = {
    v: 1,
    at: now.toISOString(),
    path: String(form.get('sourcePath') ?? '/').slice(0, 200),
    locale,
    sentence,
    entries: keptEntries(form.entries() as Iterable<[string, unknown]>, config.slots.map((s) => s.token)),
  }
  return writeKept(kept)
}

/** Fresh, readable and of this version, or null. */
export async function readKept(now: Date): Promise<KeptBrief | null> {
  const kept = decodeKeptBrief((await cookies()).get(KEPT_BRIEF_COOKIE)?.value)
  return kept && isKeptBriefFresh(kept, now) ? kept : null
}

export async function clearKept(): Promise<void> {
  ;(await cookies()).delete(KEPT_BRIEF_COOKIE)
}

/** The cookie's attributes (research R1): readable by the builder, same-site, one hour. */
export const keptCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: KEPT_BRIEF_MAX_AGE_S,
})

async function writeKept(kept: KeptBrief): Promise<boolean> {
  const value = encodeKeptBrief(kept)
  if (!value) return false
  ;(await cookies()).set(KEPT_BRIEF_COOKIE, value, keptCookieOptions())
  return true
}

/** Applies a kept-brief outcome in a server action (the code step, feature 021). */
export async function applyKept(cookie: string | null): Promise<void> {
  if (cookie === null) await clearKept()
  else (await cookies()).set(KEPT_BRIEF_COOKIE, cookie, keptCookieOptions())
}
