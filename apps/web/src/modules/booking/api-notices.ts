import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler, problem } from '@/shared/api/handler'
import { isProblem } from '@/shared/api/problem'
import { myNotices, readNotice } from './notices'

/** Feature 024: the member's notices on `/api/mobile/v1/me/notifications`. */

export const getNoticesV1 = defineHandler({
  ...endpoints.notices,
  run: async (ctx) => (ctx.user ? myNotices(ctx.payload, ctx.user) : problem(401, 'api.errors.unauthorized')),
})

export const readNoticeV1 = defineHandler({
  ...endpoints.noticeRead,
  run: async (ctx, { params }) => {
    if (!ctx.user) return problem(401, 'api.errors.unauthorized')
    const done = await readNotice(ctx.payload, ctx.user, params.id, ctx.now())
    return isProblem(done) ? done : myNotices(ctx.payload, ctx.user)
  },
})
