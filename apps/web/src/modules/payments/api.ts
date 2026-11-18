import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { accessKey, getQuotationAccess, quotePath } from '@/modules/booking'
import { defineHandler, problem } from '@/shared/api/handler'
import { startCheckout } from './commands/start-checkout'

/**
 * `POST quotations/{ref}/{key}/pay` (feature 020, contracts/mobile-api.md): the secure payment page for a
 * confirmed booking. The page returns to the same quotation link, which the app's links open in the app.
 */
export const payQuotationV1 = defineHandler({
  ...endpoints.quotationPay,
  run: async (ctx, { params }) => {
    const access = await getQuotationAccess(params.ref, params.key, ctx.user?.id, ctx.locale)
    if (!access) return problem(404, 'api.errors.notFound')
    // 025: the signed-in owner may come without the private key (the app's account booking); the payment page
    // still returns to the quotation's real link.
    const key = access.booking.accessSalt ? accessKey(access.booking.accessSalt, 'booking') : params.key
    const result = await startCheckout(ctx.payload, access, { locale: ctx.locale, now: ctx.now(), returnPath: quotePath(params.ref, key, ctx.locale) })
    if (result.ok) return { url: result.url }
    if (result.reason === 'not-allowed') return problem(409, 'booking.errors.not-allowed')
    return problem(503, `payment.errors.${result.reason}`)
  },
})
