import { randomUUID } from 'node:crypto'
import { getFieldsToSign, jwtSign, type Payload, type SanitizedCollectionConfig } from 'payload'
import type { User } from '@/payload-types'

/**
 * Issues a Payload token for a user whose number was just proven by a code (research R2), the same
 * way Payload's own login does, so `payload.auth` accepts it like any other session token (FR-024).
 *
 * The session step mirrors Payload's non-exported `addSessionToUser` from
 * `node_modules/payload/dist/auth/sessions.js` (payload 3.93.0): a uuid session id, `expiresAt = now +
 * tokenExpiration`, expired sessions dropped, and `payload.db.updateOne` with `updatedAt: null` so
 * adding a session does not touch the document's timestamp. Signing uses the exported `jwtSign` and
 * `getFieldsToSign`. The tripwire is `tests/integration/mobile-api-auth-session.int.test.ts`; re-read
 * `sessions.js` and run it on every Payload upgrade (apps/web/README.md "Upgrading Payload").
 */
export async function mintSession(payload: Payload, userId: number | string, now = new Date()): Promise<{ token: string; exp: number; sid: string }> {
  const collectionConfig = payload.collections.users.config as SanitizedCollectionConfig
  type Session = { id: string; createdAt?: Date | string | null; expiresAt: Date | string }
  const user = (await payload.db.findOne({ collection: 'users', where: { id: { equals: userId } } })) as
    | (Omit<User, 'sessions' | 'updatedAt'> & { sessions?: Session[] | null; updatedAt: string | null })
    | null
  if (!user) throw new Error('mintSession: no such user')

  const sid = randomUUID()
  const expiresAt = new Date(now.getTime() + collectionConfig.auth.tokenExpiration * 1000)
  const session = { id: sid, createdAt: now, expiresAt }
  const alive = (user.sessions ?? []).filter((s) => new Date(s.expiresAt) > new Date())
  user.sessions = [...alive, session]
  user.updatedAt = null
  await payload.db.updateOne({ id: user.id, collection: 'users', data: user as never, returning: false })

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: user.email ?? (undefined as unknown as string),
    sid,
    user: { ...user, collection: 'users' } as never,
  })
  const { token, exp } = await jwtSign({ fieldsToSign, secret: payload.secret, tokenExpiration: collectionConfig.auth.tokenExpiration })
  return { token, exp, sid }
}
