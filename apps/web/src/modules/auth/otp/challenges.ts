import { randomUUID } from 'node:crypto'
import { OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, challengeState, type ChallengeState, type OtpChannel } from '@shoot/domain/auth'
import { and, desc, eq, gt, isNull, lt, sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

/**
 * The `otp-challenges` store (research R6). Single use and attempt counting must not race between two
 * devices, and Payload's Local API has no conditional update, so `attempt` and `markUsed` are one SQL
 * statement each through the Postgres adapter's Drizzle instance, on the generated table.
 */

interface PostgresDb {
  drizzle: {
    update: (t: unknown) => { set: (v: unknown) => { where: (w: unknown) => { returning: (r?: unknown) => Promise<Record<string, unknown>[]> } } }
    select: (f?: unknown) => { from: (t: unknown) => { where: (w: unknown) => { orderBy: (o: unknown) => { limit: (n: number) => Promise<Record<string, unknown>[]> } } } }
    insert: (t: unknown) => { values: (v: unknown) => { returning: (r?: unknown) => Promise<Record<string, unknown>[]> } }
    delete: (t: unknown) => { where: (w: unknown) => { returning: (r?: unknown) => Promise<Record<string, unknown>[]> } }
  }
  tables: Record<string, Record<string, unknown>>
}

const db = (payload: Payload) => payload.db as unknown as PostgresDb
// The generated table for the collection, never a string literal (research R6).
const table = (payload: Payload) => db(payload).tables.otp_challenges as Record<string, never>

export interface NewChallenge {
  phoneHash: string
  channel: OtpChannel
  locale: 'en' | 'ar'
  now: Date
  /** Computes the code fingerprint once the public id is known. */
  codeHashFor: (publicId: string) => string
}

export interface ChallengeRow {
  publicId: string
  phoneHash: string
  codeHash: string
  channel: OtpChannel
  attempts: number
  expiresAt: Date
  resendAt: Date
  usedAt: Date | null
  supersededAt: Date | null
}

const toRow = (r: Record<string, unknown>): ChallengeRow => ({
  publicId: r.publicId as string,
  phoneHash: r.phoneHash as string,
  codeHash: r.codeHash as string,
  channel: r.channel as OtpChannel,
  attempts: Number(r.attempts),
  expiresAt: new Date(r.expiresAt as string),
  resendAt: new Date(r.resendAt as string),
  usedAt: r.usedAt ? new Date(r.usedAt as string) : null,
  supersededAt: r.supersededAt ? new Date(r.supersededAt as string) : null,
})

/** A challenge is live while unused, not superseded, before expiry and under the attempt limit. */
const live = (t: Record<string, never>, now: Date) =>
  and(isNull(t.usedAt), isNull(t.supersededAt), gt(t.expiresAt, now.toISOString()), lt(t.attempts, OTP_MAX_ATTEMPTS))

/** The newest challenge for a number (for the resend cooldown), or `null`. */
export async function latestFor(payload: Payload, phoneHash: string): Promise<ChallengeRow | null> {
  const t = table(payload)
  const rows = await db(payload).drizzle.select().from(t).where(eq(t.phoneHash, phoneHash)).orderBy(desc(t.createdAt)).limit(1)
  return rows[0] ? toRow(rows[0]) : null
}

/** Creates a live challenge and supersedes every other live one for the same number (FR-003). */
export async function createChallenge(payload: Payload, input: NewChallenge): Promise<ChallengeRow> {
  const t = table(payload)
  const nowIso = input.now.toISOString()
  await db(payload).drizzle.update(t).set({ supersededAt: nowIso }).where(and(eq(t.phoneHash, input.phoneHash), live(t, input.now))).returning({ id: t.id })
  const publicId = randomUUID()
  const [row] = await db(payload)
    .drizzle.insert(t)
    .values({
      publicId,
      phoneHash: input.phoneHash,
      codeHash: input.codeHashFor(publicId),
      channel: input.channel,
      locale: input.locale,
      attempts: 0,
      expiresAt: new Date(input.now.getTime() + OTP_TTL_MS).toISOString(),
      resendAt: new Date(input.now.getTime() + OTP_RESEND_COOLDOWN_MS).toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()
  return toRow(row as Record<string, unknown>)
}

/** Records the provider's message id, or supersedes the challenge after a failed send (it can never be used). */
export async function afterSend(payload: Payload, publicId: string, outcome: { ref: string | null } | { failedAt: Date }): Promise<void> {
  const t = table(payload)
  const set = 'failedAt' in outcome ? { supersededAt: outcome.failedAt.toISOString() } : { providerRef: outcome.ref }
  await db(payload).drizzle.update(t).set(set).where(eq(t.publicId, publicId)).returning({ id: t.id })
}

/**
 * Counts one verify attempt, atomically, on a live challenge. Returns the row after the increment,
 * or `null` when the challenge is unknown, used, superseded, expired or locked.
 */
export async function attempt(payload: Payload, publicId: string, now: Date): Promise<ChallengeRow | null> {
  const t = table(payload)
  const rows = await db(payload)
    .drizzle.update(t)
    .set({ attempts: sql`${t.attempts} + 1` })
    .where(and(eq(t.publicId, publicId), live(t, now)))
    .returning()
  return rows[0] ? toRow(rows[0]) : null
}

/** Marks the challenge used, once: `true` for the one caller that wins. */
export async function markUsed(payload: Payload, publicId: string, now: Date): Promise<boolean> {
  const t = table(payload)
  const rows = await db(payload)
    .drizzle.update(t)
    .set({ usedAt: now.toISOString() })
    .where(and(eq(t.publicId, publicId), isNull(t.usedAt)))
    .returning({ id: t.id })
  return rows.length === 1
}

/** Why a challenge cannot be attempted (unknown reads as expired). */
export async function stateOf(payload: Payload, publicId: string, now: Date): Promise<ChallengeState> {
  const t = table(payload)
  const rows = await db(payload).drizzle.select().from(t).where(eq(t.publicId, publicId)).orderBy(desc(t.createdAt)).limit(1)
  return rows[0] ? challengeState(toRow(rows[0]), now) : 'expired'
}

/** FR-034: deletes challenges that expired more than a day ago; returns how many. */
export async function deleteExpiredChallenges(payload: Payload, now: Date): Promise<number> {
  const t = table(payload)
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const rows = await db(payload).drizzle.delete(t).where(lt(t.expiresAt, cutoff)).returning({ id: t.id })
  return rows.length
}
