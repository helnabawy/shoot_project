import 'server-only'
import { logoutOperation, type Payload } from 'payload'
import type { User } from '@/payload-types'
import { requestFor } from './refresh-session'

/** Removes the session the token belongs to, so the token stops working everywhere (FR-022). */
export async function endSession(payload: Payload, user: User): Promise<void> {
  await logoutOperation({ collection: payload.collections.users, req: await requestFor(payload, user) })
}
