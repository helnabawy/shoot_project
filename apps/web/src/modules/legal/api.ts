import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler, problem } from '@/shared/api/handler'
import { wireContext } from '@/shared/api/wire'
import { getLegalDocument, getLegalVersion, getLegalVersions } from './queries'
import { toWireLegalDocument, toWireLegalVersion, toWireLegalVersions } from './wire'

const notFound = () => problem(404, 'api.errors.notFound')

/** `GET /api/mobile/v1/legal/{kind}`: the version in force now (FR-029). */
export const getLegalV1 = defineHandler({
  ...endpoints.legal,
  run: async (ctx, { params }) => {
    const view = await getLegalDocument(params.kind, ctx.locale, { now: ctx.now() })
    return view ? toWireLegalDocument(view, wireContext(ctx.locale)) : notFound()
  },
})

/** `GET /api/mobile/v1/legal/{kind}/versions`: every published version, newest first. */
export const getLegalVersionsV1 = defineHandler({
  ...endpoints.legalVersions,
  run: async (ctx, { params }) => {
    const found = await getLegalVersions(params.kind, ctx.locale)
    return found ? toWireLegalVersions(params.kind, found, wireContext(ctx.locale)) : notFound()
  },
})

/** `GET /api/mobile/v1/legal/{kind}/versions/{version}`: one published version as it stood. */
export const getLegalVersionV1 = defineHandler({
  ...endpoints.legalVersion,
  run: async (ctx, { params }) => {
    const view = await getLegalVersion(params.kind, Number(params.version), ctx.locale)
    return view ? toWireLegalVersion(view, wireContext(ctx.locale)) : notFound()
  },
})
