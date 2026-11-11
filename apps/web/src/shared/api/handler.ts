import type { Auth, CacheClass, EndpointInput, ProblemCode, SuccessStatus } from '@shoot/domain/api/v1'
import { APIError, createLocalReq, type Payload } from 'payload'
import type { z } from 'zod'
import type { SiteSetting, User } from '@/payload-types'
import { getPayloadClient } from '@/shared/lib/payload'
import { consumeAllowance } from '@/shared/payload/rate-limit'
import type { ActorContext } from './actor'
import { clientAddressOf, negotiateLocale, readInstallId, requestIdOf, visitorKeyOf } from './negotiate'
import { ApiProblem, fromZodError, isProblem, problem, problemResponse, type Problem } from './problem'

export { ApiProblem, problem, type Problem } from './problem'
export type { ActorContext } from './actor'

/**
 * `defineHandler`: the only way to write a `/api/mobile/v1` endpoint (008 contracts/handler.md).
 * It applies the declared access, validates the input, negotiates the language, reads the install
 * id, applies a declared rate limit, turns every failure into a problem, checks the answer outside
 * production, and sets the cache headers. Handlers never set headers themselves.
 */

export interface RateLimitSpec {
  action: string
  limit: number | ((settings: SiteSetting) => number)
  code?: ProblemCode
}

export interface HandlerSpec<I extends EndpointInput, O extends z.ZodType> {
  /** The endpoint id and path when spread from the registry; used in logs. */
  id?: string
  path?: string
  auth: Auth
  input: I
  output: O
  cache: CacheClass
  status?: SuccessStatus
  deprecated?: boolean
  rateLimit?: RateLimitSpec
  run: (ctx: ActorContext, input: z.output<I>) => Promise<z.input<O> | Problem>
}

export type RouteContext = { params: Promise<Record<string, string | string[]>> }
export type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>

/** Query keys: once is a string, repeated is an array. */
function queryOf(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {}
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key)
    query[key] = all.length === 1 ? (all[0] as string) : all
  }
  return query
}

const CACHE_PUBLIC = 'public, s-maxage=60'

export function defineHandler<I extends EndpointInput, O extends z.ZodType>(spec: HandlerSpec<I, O>): RouteHandler {
  return async (request, context) => {
    const url = new URL(request.url)
    const route = spec.path ?? url.pathname
    // 1. The request id, echoed on every answer.
    const requestId = requestIdOf(request.headers.get('x-request-id'))
    const query = queryOf(url)
    // 4. The language (read first so problems carry it too); an unsupported ?locale= is a field issue.
    const { locale, invalid: localeInvalid } = negotiateLocale(query.locale, request.headers.get('accept-language'))
    const headers: Record<string, string> = {
      'Content-Language': locale,
      Vary: spec.auth === 'none' ? 'Accept-Language' : 'Accept-Language, Authorization',
      'X-Request-Id': requestId,
    }
    if (spec.deprecated) headers.Deprecation = 'true'
    const fail = (value: Problem) => problemResponse(value, headers)

    let payload: Payload | undefined
    try {
      payload = await getPayloadClient()

      // 2. Who is calling: only the Authorization header is read, so a website cookie never signs in.
      let user: User | null = null
      if (spec.auth !== 'none') {
        const authorization = request.headers.get('authorization')
        if (!authorization) {
          if (spec.auth === 'required') return fail(problem(401, 'api.errors.unauthorized'))
        } else {
          const result = await payload.auth({ headers: new Headers({ authorization }) }).catch(() => ({ user: null }))
          if (!result.user) return fail(problem(401, 'api.errors.tokenInvalid'))
          user = result.user.collection === 'users' ? (result.user as User) : null
          if (!user && spec.auth === 'required') return fail(problem(401, 'api.errors.unauthorized'))
        }
      }

      // 3. The input: path params, query and (not for GET) the JSON body, in one schema.
      const fields = localeInvalid ? [{ path: 'query.locale', code: 'api.errors.localeUnsupported' }] : []
      let body: unknown
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const text = await request.text()
        try {
          body = text ? JSON.parse(text) : undefined
        } catch {
          return fail(problem(422, 'api.errors.invalidInput', { fields: [...fields, { path: 'body', code: 'api.errors.invalidField' }] }))
        }
      }
      const params = (await context?.params) ?? {}
      const parsed = spec.input.safeParse({ params, query, body })
      if (!parsed.success) fields.push(...fromZodError(parsed.error).filter((f) => f.path !== 'query.locale' || !localeInvalid))
      if (fields.length > 0 || !parsed.success) return fail(problem(422, 'api.errors.invalidInput', { fields }))

      // 5. The install id and the key limits count by.
      const installId = readInstallId(request.headers.get('x-shoot-install'))
      const clientAddress = clientAddressOf(request.headers)
      const ctx: ActorContext = {
        payload,
        user,
        locale,
        installId,
        clientAddress,
        visitorKey: visitorKeyOf(installId, clientAddress),
        now: () => new Date(),
        requestId,
      }

      // 6. A declared rate limit, counted in the database so it holds across instances.
      if (spec.rateLimit) {
        const { action, code = 'api.errors.rateLimited' } = spec.rateLimit
        const limit =
          typeof spec.rateLimit.limit === 'function'
            ? spec.rateLimit.limit(await payload.findGlobal({ slug: 'site-settings', depth: 0 }))
            : spec.rateLimit.limit
        const req = await createLocalReq({ context: { visitorId: ctx.visitorKey } }, payload)
        try {
          await consumeAllowance(req, `${action}:${ctx.visitorKey}`, limit, code, ctx.now().getTime())
        } catch (error) {
          if (error instanceof APIError && error.status === 429) {
            const retryAfter = (error.data as { retryAfter?: number } | undefined)?.retryAfter
            return fail(problem(429, code, retryAfter === undefined ? {} : { retryAfter }))
          }
          throw error
        }
      }

      // 7. The handler.
      const result = await spec.run(ctx, parsed.data)
      if (isProblem(result)) return fail(result)

      // 8. The answer must match the contract (checked outside production only, research R2).
      if (process.env.NODE_ENV !== 'production') {
        const checked = spec.output.safeParse(result)
        if (!checked.success) {
          payload.logger.error(
            { route, requestId, errorName: 'OutputMismatch', status: 500, paths: checked.error.issues.map((i) => i.path.join('.')) },
            'mobile api: answer does not match its schema',
          )
          return fail(problem(500, 'api.errors.unexpected'))
        }
      }

      // 9. Serialise with the declared status and cache class.
      const status = spec.status ?? 200
      const cacheControl = user ? 'private, no-store' : spec.cache === 'public' ? CACHE_PUBLIC : 'no-store'
      const out = new Headers({ ...headers, 'Cache-Control': cacheControl })
      if (status === 204) return new Response(null, { status, headers: out })
      out.set('Content-Type', 'application/json; charset=utf-8')
      return new Response(JSON.stringify(result), { status, headers: out })
    } catch (error) {
      if (error instanceof ApiProblem) return fail(error.problem)
      // Anything else: a 500 with a code only. The log names the route and request, never headers,
      // query, body or user; the stack only outside production.
      const e = error instanceof Error ? error : new Error(String(error))
      const entry: Record<string, unknown> = { route, requestId, errorName: e.name, status: 500 }
      if (process.env.NODE_ENV !== 'production') entry.stack = e.stack
      if (payload) payload.logger.error(entry, 'mobile api: handler failed')
      else console.error('mobile api: handler failed', entry)
      return fail(problem(500, 'api.errors.unexpected'))
    }
  }
}
