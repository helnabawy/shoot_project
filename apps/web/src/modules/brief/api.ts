import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { getBriefBuilderConfig } from './queries'
import { toWireBriefBuilder } from './wire'

/** `GET /api/mobile/v1/brief-builder`: the sentence, its slots and options; `builder: null` when off. */
export const getBriefBuilderV1 = defineHandler({
  ...endpoints.briefBuilder,
  run: async ({ locale }) => toWireBriefBuilder(await getBriefBuilderConfig(locale), locale),
})
