import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { createLocalReq } from 'payload'
import { defineHandler, problem, type ActorContext, type Problem } from '@/shared/api/handler'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { whatsappHref } from '@/modules/contact/whatsapp'
import { getTranslations } from 'next-intl/server'
import { acceptQuotation, confirmDelivery, freshQuotation, pickAnother, reportProblem, type CommandResult } from './commands/client-actions'
import { issueQuotation } from './commands/issue-quotation'
import { matchView } from './commands/match'
import { quotationView } from './commands/quotation-view'
import { getBriefByKey } from './match'
import { getQuotationAccess, type QuotationAccess } from './queries'

/**
 * The booking endpoints of `/api/mobile/v1` (feature 012, contracts/booking-api.md): thin adapters
 * over `commands/`, which the website's server actions share. The private key is in the path, so a
 * wrong key, an unknown reference and another account's quotation are all the same 404.
 */

type Params = { ref: string; key: string }

const notFound = () => problem(404, 'api.errors.notFound')

async function accessOf(ctx: ActorContext, { ref, key }: Params): Promise<QuotationAccess | null> {
  return getQuotationAccess(ref, key, ctx.user?.id, ctx.locale)
}

/** A refused command as a 409 problem (the reason is the tail of a `booking.errors.*` key). */
function refused(result: Extract<CommandResult, { ok: false }>): Problem {
  switch (result.reason) {
    case 'not-found':
      return notFound()
    case 'unavailable':
      return problem(409, 'booking.errors.unavailable')
    case 'creatorUnavailable':
      return problem(409, 'booking.errors.creatorUnavailable')
    case 'terminal':
      return problem(409, 'booking.errors.terminal')
    case 'expired-quotation':
      return problem(409, 'booking.errors.expired-quotation')
    case 'reason':
      return problem(422, 'api.errors.invalidInput', { fields: [{ path: 'body.reason', code: 'booking.errors.reason' }] })
    default:
      return problem(409, 'booking.errors.not-allowed')
  }
}

/** Runs a client command, then answers with the booking as it stands now. */
async function act(ctx: ActorContext, params: Params, run: (access: QuotationAccess) => Promise<CommandResult>) {
  const access = await accessOf(ctx, params)
  if (!access) return notFound()
  const result = await run(access)
  if (!result.ok) return refused(result)
  const fresh = await accessOf(ctx, params)
  return fresh ? quotationView(fresh, { locale: ctx.locale, now: ctx.now() }) : notFound()
}

/** `GET match/{ref}/{key}`: step 2, the creators free on the brief's day (or another day, or duration). */
export const getMatchV1 = defineHandler({
  ...endpoints.match,
  run: async (ctx, { params, query }) => (await matchView(ctx.payload, { ...params, ...query, userId: ctx.user?.id, locale: ctx.locale, now: ctx.now() })) ?? notFound(),
})

/** `POST match/{ref}/{key}/quotation`: the quotation and booking for a signed-in member, with WhatsApp's text. */
export const issueQuotationV1 = defineHandler({
  ...endpoints.quotationIssue,
  run: async (ctx, { params, body }) => {
    const user = ctx.user!
    const brief = await getBriefByKey(params.ref, params.key, user.id)
    if (!brief) return notFound()
    const req = await createLocalReq({ context: { visitorId: ctx.visitorKey } }, ctx.payload)
    const result = await issueQuotation(ctx.payload, {
      brief,
      picks: body.picks,
      locale: ctx.locale,
      now: ctx.now(),
      userId: user.id,
      // The member's own name and verified number (research R5); never read from the body.
      client: { name: user.name ?? '', whatsapp: user.username ?? '' },
      date: body.details.date,
      details: { startTime: body.details.startTime, duration: body.details.duration, venue: body.details.venue, note: body.details.note },
      req,
      limitKey: `quote:${ctx.visitorKey}`,
    })
    if (!result.ok) {
      if (result.errors) {
        return problem(422, 'api.errors.invalidInput', { fields: Object.entries(result.errors).map(([path, code]) => ({ path: `body.details.${path}`, code })) })
      }
      if (result.formError === 'booking.errors.tooMany') return problem(429, 'api.errors.rateLimited')
      if (result.formError === 'booking.errors.unavailable') return problem(409, 'booking.errors.unavailable')
      return problem(409, 'booking.errors.not-allowed')
    }
    const [settings, t] = await Promise.all([getSiteSettings(ctx.locale), getTranslations({ locale: ctx.locale, namespace: 'quote' })])
    const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/q/${result.reference}/${result.key}`
    return {
      reference: result.reference,
      key: result.key,
      state: 'quoted' as const,
      whatsappUrl: whatsappHref(settings.whatsappNumber, `${t('whatsappMessage', { reference: result.reference })}\n${link}`),
    }
  },
})

/** `GET quotations/{ref}/{key}`: the booking as it stands now (read from the database each time). */
export const getQuotationV1 = defineHandler({
  ...endpoints.quotationView,
  run: async (ctx, { params }) => {
    const access = await accessOf(ctx, params)
    return access ? quotationView(access, { locale: ctx.locale, now: ctx.now() }) : notFound()
  },
})

/** `POST quotations/{ref}/{key}/accept`: once, however often it is tapped (FR-022). */
export const acceptQuotationV1 = defineHandler({
  ...endpoints.quotationAccept,
  run: (ctx, { params }) => act(ctx, params, (access) => acceptQuotation(ctx.payload, access, { user: ctx.user, now: ctx.now(), locale: ctx.locale })),
})

/** `POST quotations/{ref}/{key}/confirm-delivery`. */
export const confirmDeliveryV1 = defineHandler({
  ...endpoints.quotationConfirmDelivery,
  run: (ctx, { params }) => act(ctx, params, (access) => confirmDelivery(ctx.payload, access, { user: ctx.user, now: ctx.now() })),
})

/** `POST quotations/{ref}/{key}/report`: puts the booking on hold with the client's text. */
export const reportProblemV1 = defineHandler({
  ...endpoints.quotationReport,
  run: (ctx, { params, body }) => act(ctx, params, (access) => reportProblem(ctx.payload, access, { user: ctx.user, now: ctx.now(), reason: body.reason })),
})

/** `POST quotations/{ref}/{key}/pick-another`: another free creator at the same price. */
export const pickAnotherV1 = defineHandler({
  ...endpoints.quotationPickAnother,
  run: async (ctx, { params, body }) => {
    // The app names a type by slug; the command takes the persona's id.
    const personas = await ctx.payload.find({ collection: 'personas', where: { slug: { equals: body.persona } }, limit: 1, depth: 0, overrideAccess: true })
    const personaId = personas.docs[0] ? String(personas.docs[0].id) : ''
    return act(ctx, params, (access) => pickAnother(ctx.payload, access, { user: ctx.user, now: ctx.now(), locale: ctx.locale, personaId, code: body.code }))
  },
})

/** `POST quotations/{ref}/{key}/fresh`: the brief's link and the old picks, to start step 2 again. */
export const freshQuotationV1 = defineHandler({
  ...endpoints.quotationFresh,
  run: async (ctx, params) => {
    const access = await accessOf(ctx, params.params)
    return access ? freshQuotation(ctx.payload, access) : notFound()
  },
})
