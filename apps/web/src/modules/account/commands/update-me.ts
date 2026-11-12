import 'server-only'
import type { MeUpdateV1, MeV1 } from '@shoot/domain/api/v1'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { toWireMe } from '@/modules/auth/wire'

/**
 * `PATCH me`: the name, the optional email (checked for use by another account, never confirmed or
 * used for marketing, FR-024) and the one-time "finish shown" flag (FR-020). Written with
 * `overrideAccess` on the caller's own record only.
 */
export async function updateMe(ctx: ActorContext, body: MeUpdateV1): Promise<MeV1 | Problem> {
  const user = ctx.user!
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) {
    const email = body.email.toLowerCase()
    const taken = await ctx.payload.find({
      collection: 'users',
      where: { and: [{ email: { equals: email } }, { id: { not_equals: user.id } }] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (taken.docs.length > 0) return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body.email', code: 'account.errors.emailInUse' }] })
    data.email = email
  }
  const dismissed = (user as { accountFinishDismissedAt?: string | null }).accountFinishDismissedAt
  if (body.finishShown && !dismissed) data.accountFinishDismissedAt = ctx.now().toISOString()
  const updated = await ctx.payload.update({ collection: 'users', id: user.id, data, depth: 1, overrideAccess: true })
  return toWireMe(updated, ctx.locale)
}
