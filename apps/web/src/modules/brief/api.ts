import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { recordBrief } from './commands/record-brief'
import { getBriefBuilderConfig } from './queries'
import { toWireBriefBuilder } from './wire'

/** `GET /api/mobile/v1/brief-builder`: the sentence, its slots and options; `builder: null` when off. */
export const getBriefBuilderV1 = defineHandler({
  ...endpoints.briefBuilder,
  run: async ({ locale }) => toWireBriefBuilder(await getBriefBuilderConfig(locale), locale),
})

/** `POST /api/mobile/v1/briefs` (feature 010): records a brief from the app. */
export const recordBriefV1 = defineHandler({
  ...endpoints.briefRecord,
  run: (ctx, { body }) => recordBrief(ctx, body),
})
