---
name: mobile-api-contract
description: The versioned REST API the Flutter app uses, /api/mobile/v1 on the web app — route handlers that re-export each module's api.ts, the defineHandler wrapper in apps/web/src/shared/api/handler.ts (auth none/optional/required, zod input, Bearer Payload JWT, Accept-Language, X-Shoot-Install rate limits, problem+json errors, Cache-Control), command bodies extracted from modules/*/actions.ts into modules/<feature>/commands/, OTP sign-in endpoints and tokens, error codes that are message keys, zod schemas, JSON examples (packages/domain/src/api/v1/) and Dart models from one fixture set, the JSON-schema snapshot specs/contracts/mobile-api/v1.schema.json (v1 changes additive only), deprecation, and contract and integration tests. Use this skill whenever a task adds or changes a mobile endpoint, a response or request shape, an error code, a server action that the app also needs, token or OTP handling, a Dart model or repository that calls the API, or the .well-known deep-link files.
---

# The mobile API contract (`/api/mobile/v1`)

> **Status: planned.** Nothing here exists yet. The wrapper, the first read endpoints, `resolve`,
> the contracts and `.well-known` arrive in feature 008 (mobile-api); OTP sign-in, tokens and `/me`
> in 009 (otp-sign-in); each later mobile feature (010–015) adds its endpoints the same way. The
> features' `plan.md` and `contracts/mobile-api.md` fix the exact names and win over this summary.

The Flutter app cannot call Next.js server actions, so it gets its own versioned REST API inside the
same web app (Principle V: one deployable). The API is a thin adapter: the business rules stay in
`packages/domain`, the reads in each module's `queries.ts`, and the writes in commands shared with
the site's server actions. Payload's own REST API (`/api/<collection>`) stays for the admin and is
not the app's contract.

Read with: `payload-cms` (auth, collections, Local API, access), `testing-strategy` (integration
and contract tests), `flutter-mobile` (the Dart side: models, repositories, interceptors).

## Shape of a request

```text
GET /api/mobile/v1/creators/OMAR-K            apps/web/src/app/(payload)/api/mobile/v1/creators/[code]/route.ts
  -> export { getCreator as GET } from '@/modules/creators'      (one-line re-export)
    -> modules/creators/api.ts: defineHandler({ auth, params, response, cache }, fn)
      -> modules/creators/queries.ts (read)  or  modules/creators/commands/<name>.ts (write)
        -> packages/domain (rules) + Payload Local API
  <- 200 application/json, shape = packages/domain/src/api/v1/creators.ts
```

| What | Where |
|---|---|
| Route files | `apps/web/src/app/(payload)/api/mobile/v1/**/route.ts`, one-line re-exports only |
| Handlers | `apps/web/src/modules/<feature>/api.ts`, exported through the module's `index.ts` |
| Wrapper | `apps/web/src/shared/api/handler.ts` (`defineHandler`), plus the actor context and problem helpers beside it |
| Commands | `apps/web/src/modules/<feature>/commands/<name>.ts` |
| Schemas | `packages/domain/src/api/v1/*.ts` (zod; 100 % coverage gate) |
| Examples | `packages/domain/src/api/v1/examples/*.json` |
| Snapshot | `specs/contracts/mobile-api/v1.schema.json` |
| Deep links | `apps/web/src/app/.well-known/apple-app-site-association/route.ts`, `…/assetlinks.json/route.ts` |

Next resolves the static `mobile/v1/…` segments before Payload's `api/[...slug]` catch-all, so the
routes coexist with Payload's REST API; for the same reason no collection may use the slug `mobile`.

## `defineHandler` (the only way to write a handler)

```ts
// apps/web/src/modules/creators/api.ts (as built in 008): the handler spreads the registry entry,
// so auth, cache, input and output cannot drift from the contract in packages/domain/src/api/v1/.
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler, problem } from '@/shared/api/handler'

export const getCreatorProfileV1 = defineHandler({
  ...endpoints.creatorProfile,
  run: async ({ locale }, { params }) => {
    const [page, context] = await Promise.all([getCreatorProfile(params.code, locale), getDirectoryContext(locale)])
    if (!page) return problem(404, 'api.errors.notFound')
    return toWireCreatorProfile(page, context.lookups, wireContext(locale))
  },
})
```

The wrapper, in order:

1. **Auth** — `none`, `optional` or `required`. It resolves the user from
   `Authorization: Bearer <JWT>` through `payload.auth({ headers })` (the same call
   `modules/auth/session.ts` makes for the cookie). `required` without a valid user is a 401
   problem. Handlers never read headers themselves.
2. **Input** — path params, query and JSON body are parsed with the declared zod schemas; a failure is
   a 422 problem with one code per field. Handlers receive typed, validated input only.
3. **Locale** — from `Accept-Language` (`ar` or `en`, English fallback), passed to every query.
4. **Install id** — `X-Shoot-Install` keys the rate limits (with the client address) through the
   existing rate-limit store. It is not an identity and is never logged with personal data.
5. **Response** — the result is checked against the declared response schema in development and
   tests (a mismatch is a bug in the handler, not the client), then serialised.
6. **Errors** — a returned `problem(...)` or a thrown known error becomes `problem+json`; anything
   else is a 500 problem with no detail. No stack traces, no Payload messages, no PII in the body
   or the logs (Principle VII).
7. **Cache headers** — see below.

## Commands: one body for the site and the app

Server actions (`modules/{auth,booking,brief,creators}/actions.ts`) hold logic the app now needs.
Move the body, not a copy:

```ts
// modules/booking/commands/accept-quote.ts
export async function acceptQuote(ctx: ActorContext, input: AcceptQuoteInput): Promise<CommandResult<Booking>>
```

- `ActorContext` carries the Payload client, the user (or `null`), the locale, the install id and an
  injected clock. A command never reads cookies, headers, `next/navigation` or `Date.now()`.
- `CommandResult` is ok-with-value or a failure **code** (a message key), never text and never a
  redirect.
- `actions.ts` becomes an adapter (form data → input, `getCurrentUser()` → context, result → form
  state, revalidate, redirect); `api.ts` is the other adapter (JSON → input, Bearer → context,
  result → JSON or problem).
- The existing integration tests for the actions stay unchanged as regression tests; the command
  gets its own integration tests; the handler gets contract tests.
- Extract only what an endpoint in the current feature needs (012 extracts the booking commands,
  014 the creator ones).

## Auth: Bearer tokens after OTP (feature 009)

Built in `apps/web/src/modules/auth/` (contracts: `specs/009-otp-sign-in/contracts/auth-api.md`).

- Endpoints (registry ids): `POST auth/otp/request` (`otpRequest`, 202 `otpChallengeV1`),
  `POST auth/otp/verify` (`otpVerify`, `authTokenV1`), `POST auth/refresh` (`authRefresh`),
  `POST auth/logout` (`authLogout`, 204), `GET me` (`me`, at `/api/mobile/v1/me` because 013 adds
  `PATCH me`). All `cache: 'no-store'`; the signed-in three answer `private, no-store`.
- Commands in `modules/auth/commands/` (`request-code`, `verify-code` with `proveCode`,
  `refresh-session`, `end-session`, `link-number`) take an `ActorContext`; `api.ts` and the website's
  `actions.ts` are thin adapters. `otp/verify` is `auth: 'none'`, ignores any token and never links;
  linking a number is website-only (`link-number`).
- `verify-code` proves the code (address allowance, provider personas before any attempt, atomic
  attempt, constant-time comparison of code and number fingerprints, single use), then finds the
  user by `username` or creates one from `signup`, refuses admins and editors (`useEmailSignIn`, 403)
  and mints the session (`otp/mint.ts`, Payload's `jwtSign` + `getFieldsToSign`).
- Problem codes are generic until the code is proven (`codeInvalid`, `codeExpired`, `codeLocked`);
  `otp/request` never reads users, so its answer is the same with or without an account. Field
  failures use `api.errors.invalidInput` with field codes (`body.phone` → `auth.errors.phoneInvalid`,
  `body.signup.acceptTerms` → `auth.errors.acceptTerms`); 429s carry `retryAfter` and `Retry-After`.
- **The app refreshes ahead of expiry, not on 401**: the `AuthInterceptor` (a `QueuedInterceptor`)
  calls `auth/refresh` through a separate Dio when under 2 days are left; a 401 always means signed
  out. Request and response bodies, headers and tokens of `auth/*` are never logged.
- Principle VII names HTTP-only cookies; the app's Bearer token is justified in 009's Complexity
  Tracking (the token lives in the Keychain / Keystore); the website keeps the `payload-token` cookie.

## Errors: `application/problem+json`

```json
{
  "type": "about:blank",
  "status": 422,
  "code": "auth.errors.codeInvalid",
  "fields": [{ "path": "body.code", "code": "auth.errors.codeInvalid" }],
  "retryAfter": 30
}
```

- `code` (and each field's `code`) is a **message key**, never text: the same dotted keys the server
  actions already return (`creators.errors.notProvider`) and that `apps/web/messages/{en,ar}.json`
  hold. The app maps each code to an ARB string in `core/l10n/failure_message.dart` (an exhaustive
  switch, because ARB keys cannot contain dots); an unknown code falls back to a generic message.
- Every code is listed once in `packages/domain/src/api/v1/problems.ts`, so it appears in the
  JSON-schema snapshot. Tests assert each listed code exists in both web message files and is handled
  in `failure_message.dart` with strings in both ARB files.
- No `title` or `detail` prose: the client owns the words, in the person's language.

## Cache headers

| Response | `Cache-Control` |
|---|---|
| Public CMS reads (landing, personas, option sets, creators, pages) with no token | `public, s-maxage=60, stale-while-revalidate=…`, with `Vary: Accept-Language` (60 s keeps Principle IV's "visible within 60 seconds") |
| Any response to a request with a valid Bearer token | `private, no-store` |
| Commands, OTP, tokens, `/me` | `no-store` |
| Problems | `no-store` |

`defineHandler` sets these from the declared `cache` and the resolved auth; handlers never set
`Cache-Control` themselves.

## The contract triangle: schema, example, Dart model

One fixture set proves all three sides agree:

1. **zod schemas** in `packages/domain/src/api/v1/*` define every request and response. They are the
   source; the handler's types come from them.
2. **JSON examples** in `packages/domain/src/api/v1/examples/` hold the boards' placeholder data
   (Omar K., AED 950, the same Arabic as the boards' strings). The domain tests parse every example
   with its schema; the Dart model tests decode the same files (`fromJson` → `toEntity` → back);
   the screen goldens build their state from them (see `design-fidelity`).
3. **Dart models** in `apps/mobile/lib/features/*/data/models/` decode the examples with no code
   generation. Every response enum decodes an unknown value to an `unknown` case, so a new value is
   an additive change for older apps.

## Versioning: v1 only grows

- `specs/contracts/mobile-api/v1.schema.json` is a snapshot written with `z.toJSONSchema` (zod
  4.6.7). A test regenerates it and fails on any change that is not additive; an additive change
  updates the snapshot in the same PR.
- **Additive** (allowed in v1): a new endpoint; a new optional request field; a new response field;
  a new response enum value (clients decode unknown values); a new problem code (clients fall back).
- **Breaking** (needs `/api/mobile/v2`): removing or renaming anything; making a request field
  required; changing a type or format; narrowing what a request accepts; changing a status code's
  meaning.
- **Deprecation**: a v1 field or endpoint can be marked deprecated (in the schema's description and
  with a `Deprecation` response header) but keeps working for the life of v1. It is removed only in
  v2, and v1 stays served until the app's supported versions no longer call it.

## Tests

| Layer | What | Where |
|---|---|---|
| Unit (domain) | every schema with its examples, valid and invalid; OTP rules; problem code list | `packages/domain/src/api/v1/*.test.ts`, `src/auth/otp.test.ts` |
| Contract | snapshot is additive; every example parses; problem codes exist in both message files | `packages/domain` and `apps/web/tests/unit/` |
| Integration | each handler against Payload + Testcontainers PostgreSQL: auth none/optional/required, Bearer valid/expired/revoked, locale, validation problems, rate limit, cache headers, response parses with the v1 schema; each command; the existing action tests unchanged | `apps/web/tests/integration/mobile-api-*.int.test.ts` |
| Dart | each model decodes its examples; repositories map problems to failures; interceptors (Bearer, refresh once, install id) | `apps/mobile/test/features/*/data/`, `test/core/` |
| End-to-end | OTP sign-in through the console adapter | Playwright request specs |

Name every test with its scenario id (`MR-US1-S2`, `OT-US2-S1`) so `pnpm check:scenarios` finds it.

## Reference files

- [`references/endpoints.md`](references/endpoints.md) — the planned endpoint inventory by
  feature, with auth and cache class for each.
