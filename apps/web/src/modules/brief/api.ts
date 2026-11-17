import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { recordBrief } from './commands/record-brief'
import { briefNeedsSignIn } from './sign-in-rule'
import { getSiteSettings } from '../site-settings/queries'
import { getBriefBuilderConfig } from './queries'
import { toWireBriefBuilder } from './wire'

/** `GET /api/mobile/v1/brief-builder`: the sentence, its slots and options; `builder: null` when off. */
export const getBriefBuilderV1 = defineHandler({
  ...endpoints.briefBuilder,
  run: async ({ locale }) => {
    const [config, settings] = await Promise.all([getBriefBuilderConfig(locale), getSiteSettings(locale)])
    const { readQuickMatch } = await import('@/modules/booking')
    const { getPayloadClient } = await import('@/shared/lib/payload')
    const { mapsEnabled } = await import('@/modules/maps/providers')
    const { env } = await import('@/shared/lib/env')
    const qm = await readQuickMatch(await getPayloadClient())
    const offersEnabled = qm.enabled && qm.offers.enabled
    return {
      ...toWireBriefBuilder(config, locale),
      signInRequired: briefNeedsSignIn(settings),
      // 022 (additive): the price step and the map pin.
      offers: { enabled: offersEnabled, minPercent: qm.offers.minPercent, maxPercent: qm.offers.maxPercent },
      maps: { enabled: offersEnabled && mapsEnabled(env()) },
    }
  },
})

/** `POST /api/mobile/v1/briefs` (feature 010): records a brief from the app. */
export const recordBriefV1 = defineHandler({
  ...endpoints.briefRecord,
  run: (ctx, { body }) => recordBrief(ctx, body),
})

/** 022: `POST brief-builder/prices`, the suggested price and range per type for the answers so far. */
export const getBriefPricesV1 = defineHandler({
  ...endpoints.briefPrices,
  run: async (ctx, { body }) => {
    const { briefFromAnswers, placeOfPin, readQuickMatch, suggestedPrices } = await import('@/modules/booking')
    const brief = await briefFromAnswers({ values: body.values, custom: body.custom ?? {} }, ctx.locale)
    if (!brief) return { prices: [], emirate: null }
    const qm = await readQuickMatch(ctx.payload)
    const pinned = body.place ? await placeOfPin(ctx.payload, { ...body.place, source: 'drag' }, ctx.locale) : null
    const prices = await suggestedPrices(brief, ctx.locale, pinned?.emirate.slug ?? null, qm.offers)
    return {
      prices: prices.map((p) => ({ persona: p.personaSlug, suggestedFils: p.suggestedFils, minFils: p.range.min, maxFils: p.range.max })),
      emirate: pinned?.emirate.slug ?? null,
    }
  },
})
