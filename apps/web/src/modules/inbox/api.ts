import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { problem } from '@/shared/api/problem'
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
