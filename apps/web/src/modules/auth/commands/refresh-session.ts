import 'server-only'
import type { AuthRefreshV1 } from '@shoot/domain/api/v1'
import { createLocalReq, refreshOperation, type Payload, type PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

/** A request carrying the signed-in user (with the `_sid` that `payload.auth` resolved). */
export async function requestFor(payload: Payload, user: User): Promise<PayloadRequest> {
  const req = await createLocalReq({ user: { ...user, collection: 'users' } as never }, payload)
  // refreshOperation reads the pathname to tell GraphQL apart.
  if (!req.url) Object.assign(req, { url: `${payload.config.serverURL || 'http://localhost'}/api/users/refresh-token` })
  return req
}

/**
 * Renews the session the token belongs to for another 7 days and signs a new token for the same
 * session (FR-021), through Payload's own `refreshOperation`.
 */
export async function refreshSession(payload: Payload, user: User): Promise<AuthRefreshV1> {
  const result = await refreshOperation({ collection: payload.collections.users, req: await requestFor(payload, user) })
  if (!result.refreshedToken || !result.exp) throw new Error('refreshSession: no token')
  return { token: result.refreshedToken, exp: result.exp }
}
