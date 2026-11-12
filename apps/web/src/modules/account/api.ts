import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { listBookings, listBriefs } from './commands/list'
import { readAccount } from './commands/read-account'
import { updateMe } from './commands/update-me'

/** The client account's endpoints of `/api/mobile/v1` (feature 013, contracts/account-api.md). */

/** `GET me/account` → `accountHomeV1`; 404 for a creator account. */
export const getAccountV1 = defineHandler({ ...endpoints.meAccount, run: (ctx) => readAccount(ctx) })

/** `GET me/bookings` → `bookingListV1`. */
export const getBookingsV1 = defineHandler({ ...endpoints.meBookings, run: (ctx, { query }) => listBookings(ctx, query) })

/** `GET me/briefs` → `briefListV1`. */
export const getBriefsV1 = defineHandler({ ...endpoints.meBriefs, run: (ctx, { query }) => listBriefs(ctx, query) })

/** `PATCH me` → `meV1`. */
export const updateMeV1 = defineHandler({ ...endpoints.meUpdate, run: (ctx, { body }) => updateMe(ctx, body) })
