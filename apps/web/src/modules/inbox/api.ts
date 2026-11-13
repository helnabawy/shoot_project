import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import type { ActorContext } from '@/shared/api/actor'
import { defineHandler } from '@/shared/api/handler'
import { problem } from '@/shared/api/problem'
import { answerBrief } from './commands/answer-brief'
import { onAccepted } from './commands/notify-brief'
import { withdrawAnswer } from './commands/withdraw-answer'
import { creatorInbox } from './queries'

/** The creator brief inbox on `/api/mobile/v1/me/creator/briefs…` (feature 019, contracts/mobile-api.md). */

const notProvider = () => problem(403, 'creators.errors.notProvider')
const emptyInbox = { open: [], accepted: [], rejected: [], reasons: [] }

export const getCreatorBriefsV1 = defineHandler({
  ...endpoints.creatorBriefs,
  run: async (ctx) => {
    if (ctx.user?.accountType !== 'provider') return notProvider()
    // A creator whose profile is not live sees an empty inbox (US1-S4).
    return (await creatorInbox({ payload: ctx.payload, locale: ctx.locale, now: ctx.now() }, ctx.user.id)) ?? emptyInbox
  },
})

const actorOf = (ctx: ActorContext) => ({
  payload: ctx.payload,
  user: ctx.user,
  locale: ctx.locale,
  now: ctx.now(),
})

export const answerCreatorBriefV1 = defineHandler({
  ...endpoints.answerCreatorBrief,
  run: (ctx, { params, body }) => answerBrief(actorOf(ctx), params.ref, body, onAccepted),
})

export const withdrawCreatorBriefV1 = defineHandler({
  ...endpoints.withdrawCreatorBrief,
  run: (ctx, { params, query }) => withdrawAnswer(actorOf(ctx), params.ref, query.persona),
})
