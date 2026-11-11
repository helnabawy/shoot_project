# Contract: `defineHandler` and route files

Internal contract for every `/api/mobile/v1` endpoint (research R1–R7). Feature 009 and later
features write handlers the same way. Nothing here is visible to the app except through
[mobile-api.md](mobile-api.md).

## Signature

```ts
// apps/web/src/shared/api/handler.ts
type Auth = 'none' | 'optional' | 'required'
type CacheClass = 'public' | 'no-store'

interface HandlerSpec<I extends ZodObject, O extends ZodType> {
  auth: Auth
  input: I                       // z.object({ params?, query?, body? })
  output: O                      // noContentV1 (z.null()) when status is 204
  cache: CacheClass
  status?: 200 | 202 | 204       // success status, default 200; 204 sends no body
  deprecated?: boolean           // set by defineEndpoint when the endpoint or a field of its answer is deprecated
  rateLimit?: { action: string; limit: number | ((settings: SiteSetting) => number); code?: string }
  run: (ctx: ActorContext, input: z.output<I>) => Promise<z.input<O> | Problem>
}

export function defineHandler<I, O>(spec: HandlerSpec<I, O>):
  (request: Request, context: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>

// apps/web/src/shared/api/problem.ts, re-exported by handler.ts
export function problem(status: ProblemStatus, code: ProblemCode | string, extra?: { fields?: ProblemField[]; retryAfter?: number }): Problem
export class ApiProblem extends Error { constructor(public problem: Problem) }
```

`ProblemStatus` is `problemV1`'s `status` enum: `401 | 404 | 422 | 429 | 500` in 008. A later feature
adds a status additively (009 adds 403, 409 and 503) in `packages/domain/src/api/v1/problems.ts`.

A handler spreads its endpoint definition from the domain registry, so `auth`, `cache`, `input`
and `output` come from the contract:

```ts
// apps/web/src/modules/creators/api.ts
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler, problem } from '@/shared/api/handler'
import { getCreatorProfile } from './queries'
import { toWireCreatorProfile } from './wire'

export const getCreatorProfileV1 = defineHandler({
  ...endpoints.creatorProfile,
  run: async (ctx, { params }) => {
    const found = await getCreatorProfile(params.code, ctx.locale)
    return found ? toWireCreatorProfile(found, ctx) : problem(404, 'api.errors.notFound')
  },
})
```

## Order of work inside the wrapper

| Step | What | Failure |
|---|---|---|
| 1 | `requestId` from `X-Request-Id` (`^[\w-]{8,64}$`), else a random id | — |
| 2 | Auth (`none`: skip). Otherwise `payload.auth({ headers: new Headers({ authorization }) })`, with **only** `Authorization` copied | `required` with no header: 401 `api.errors.unauthorized`. A header that does not verify: 401 `api.errors.tokenInvalid` |
| 3 | Input: `{ params: await context.params, query: fromSearchParams(url), body: await json() (non-GET) }` → `spec.input.safeParse` | 422 `api.errors.invalidInput`, with `fields` from the issues |
| 4 | Locale: `negotiateLocale(query.locale, Accept-Language)` | an invalid `?locale=` is a 422 field issue (`api.errors.localeUnsupported`) |
| 5 | Install id: `readInstallId(X-Shoot-Install)` → `installId`, `visitorKey` | none (an invalid id is ignored) |
| 6 | Rate limit (when declared): `consumeAllowance(createLocalReq(...), `${action}:${visitorKey}`, limit, code ?? 'api.errors.rateLimited')` | 429 with `retryAfter` and `Retry-After` |
| 7 | `run(ctx, input)` | a returned `Problem` or a thrown `ApiProblem` is sent as it is |
| 8 | Output check: `spec.output.parse(result)` when `NODE_ENV !== 'production'` | 500 `api.errors.unexpected`, logged as a handler bug |
| 9 | Serialise: `Response.json(result, { status: spec.status ?? 200 })` plus the headers below; for `status: 204`, an empty body | — |
| — | Anything else thrown | 500 `api.errors.unexpected`. Logged as `{ route, requestId, errorName, status }`, with the stack outside production only |

`query` keys:
- A key that appears once is a string. A repeated key is an array.
- `locale` is read by the wrapper. A schema need not declare it, but the wrapper validates it
  either way.
- Unknown keys are stripped by `z.object` (the default), never rejected.

## Response headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json; charset=utf-8`, or `application/problem+json` for problems |
| `Content-Language` | the negotiated locale |
| `Vary` | `Accept-Language` (with `Authorization` when `auth` is not `none`) |
| `Cache-Control` | `public, s-maxage=60` for `cache: 'public'` with no user resolved. `private, no-store` whenever a user was resolved. `no-store` for `cache: 'no-store'` and for every problem |
| `X-Request-Id` | the request id |
| `Retry-After` | seconds, on 429 only |
| `Deprecation` | `true` when the endpoint, or any field of its answer schema, is marked deprecated (`.meta({ deprecated: true })`, research R11) |

Handlers never set headers themselves.

## Mapping zod issues to field codes

For each issue:
- `path` is the issue path joined with `.` (`query.page`, `params.code`);
- `code` is the issue `message` when it matches `^[a-z][a-zA-Z]*(\.[a-zA-Z-]+)+$`. Domain schemas
  use message keys, for example `contact.errors.whatsappFormat`.
- otherwise `code` is `api.errors.invalidField`.

One entry per path; the first issue wins.

## Route files

- One file per endpoint, at the path in the registry, with `{param}` written as `[param]`:
  `app/(payload)/api/mobile/v1/creators/[code]/route.ts`.
- The content is exactly one re-export from the owning module's `index.ts`, and nothing else:

  ```ts
  export { getCreatorProfileV1 as GET } from '@/modules/creators'
  ```

  No segment config, no logic and no imports from module internals.
- Handler names follow `<verb><Thing>V1`.
- `app/(payload)/api/mobile/[...rest]/route.ts` exports `GET`, `POST`, `PATCH`, `PUT` and `DELETE`
  as one handler, `notFoundV1` (`auth: 'none'`), which always answers 404 `api.errors.notFound`.
- No collection or global may use the slug `mobile`.
- A method that a route file does not export (for example `POST` to `GET /site`) is answered by
  Next.js with 405 and no body. It is the one failure outside the problem format; the app never
  sends such a request. Whether to answer it as a problem is an open owner decision (it would need
  a second re-export per route file).
- `mobile-api-access.int.test.ts` walks `ENDPOINTS` and asserts, for each endpoint:
  - the route file exists;
  - it exports the method;
  - an anonymous call is answered as its `auth` declares.

## Testing a handler

```ts
import { GET } from '@/app/(payload)/api/mobile/v1/creators/[code]/route'
import { creatorProfileV1 } from '@shoot/domain/api/v1'

const res = await GET(
  new Request('http://test/api/mobile/v1/creators/7k4q2', {
    headers: { 'accept-language': 'ar', 'x-shoot-install': 'a'.repeat(32) },
  }),
  { params: Promise.resolve({ code: '7k4q2' }) },
)
expect(res.status).toBe(200)
expect(res.headers.get('cache-control')).toBe('public, s-maxage=60')
const body = creatorProfileV1.parse(await res.json())
```

Integration tests run against the seeded Testcontainers database. `next/cache` is mocked by the
existing `setup/env.ts`; `next/headers` needs no mock.
