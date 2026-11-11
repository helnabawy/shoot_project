# Contract: sign-in API (`/api/mobile/v1`)

Five endpoints on the web app, each a one-line route file re-exporting a handler from
`apps/web/src/modules/auth/api.ts` through the module's `index.ts`, written with 008's
`defineHandler` (`apps/web/src/shared/api/handler.ts`), which spreads the endpoint's entry from 008's
registry (`packages/domain/src/api/v1/endpoints.ts`). Schemas are zod in
`packages/domain/src/api/v1/auth.ts`; examples in `packages/domain/src/api/v1/examples/` are parsed
by the domain tests, decoded by the Dart model tests and used by the screen goldens. The JSON-schema
snapshot `specs/contracts/mobile-api/v1.schema.json` gains these entries (additive).

Common to all five:
- `cache: 'no-store'`. `defineHandler` sends `Cache-Control: no-store` on `request` and `verify`
  (no user is resolved) and `private, no-store` on `refresh`, `logout` and `me` (a user is
  resolved; 008 contracts/handler.md).
- `Accept-Language: ar` or `en` (English fallback) selects the SMS language and the answer's
  `Content-Language`; nothing else here depends on it.
- `X-Shoot-Install: <32 lower-case hex>` (008 research R5) keys the per-install allowance through
  `ActorContext.installId`. Optional, and ignored when malformed; absent means no install limit. The
  address limit always applies, through `ActorContext.clientAddress` (008 data-model).
- Errors are `application/problem+json` (008 `problemV1`): `{ type, status, code, fields?,
  retryAfter? }`, with `fields: [{ path, code }]` on 422 only. `code` is a message key; no prose.
  `retryAfter` also goes in the `Retry-After` header.
- Input that fails its schema answers 008's `api.errors.invalidInput` (422) with one field code per
  invalid field; the field path names the source (`body.phone`). A command failure answers its own
  code at the top level.
- Request and response bodies, headers and tokens of these endpoints are never logged.

| Registry id | Method and path | Auth | Status | Handler | Body |
|---|---|---|---|---|---|
| `otpRequest` | `POST /api/mobile/v1/auth/otp/request` | none | 202 | `requestCodeV1` | `commands/request-code.ts` |
| `otpVerify` | `POST /api/mobile/v1/auth/otp/verify` | none | 200 | `verifyCodeV1` | `commands/verify-code.ts` |
| `authRefresh` | `POST /api/mobile/v1/auth/refresh` | required | 200 | `refreshSessionV1` | `commands/refresh-session.ts` |
| `authLogout` | `POST /api/mobile/v1/auth/logout` | required | 204 | `endSessionV1` | `commands/end-session.ts` |
| `me` | `GET /api/mobile/v1/me` | required | 200 | `getMeV1` | `wire.ts` (`toWireMe`) |

Handler names follow 008's `<verb><Thing>V1` rule. Examples, as registered (variant names, like
008's `resolve-page.json`):

| Registry id | `examples` (answers) | `requestExamples` (bodies) |
|---|---|---|
| `otpRequest` | `auth-challenge.json` | `auth-request.json` |
| `otpVerify` | `auth-token.json` | `auth-verify-seeker.json`, `auth-verify-provider.json` |
| `authRefresh` | `auth-refresh.json` | — |
| `authLogout` | — (204, `noContentV1`) | — |
| `me` | `me-seeker.json`, `me-provider.json` | — |

## `POST auth/otp/request`

Request (`otpRequestV1`):

```json
{ "phone": "050 123 4567", "channel": "sms" }
```

- `phone`: string, normalised by `normaliseUaeMobile`; anything else is the field code
  `auth.errors.phoneInvalid` on `body.phone`.
- `channel`: `"sms"` | `"whatsapp"`, default `"sms"`; anything else is `api.errors.invalidField` on
  `body.channel`.

Order of work:
1. Validate (422 `api.errors.invalidInput` with field codes).
2. Allowances: address (`ctx.clientAddress`), then install (`ctx.installId`, when present), then
   phone hash (429 on failure).
3. Cooldown: the newest challenge for the phone hash has `resendAt > now` → 429
   `auth.errors.resendTooSoon` with `retryAfter`.
4. Create the challenge (superseding earlier ones), generate the code, send it through the provider
   with a 5 s timeout.
5. A failed send marks the challenge superseded (it can never be used) and answers 503
   `auth.errors.sendFailed`.

The user table is never read. The answer is identical for numbers with and without an account.

Response `202 Accepted` (`otpChallengeV1`):

```json
{
  "challengeId": "0f6f1f0e-4a3b-4c55-9d0e-1b2c3d4e5f60",
  "channel": "sms",
  "phone": "+971501234567",
  "expiresAt": "2026-12-14T06:05:00.000Z",
  "resendAt": "2026-12-14T06:01:00.000Z"
}
```

`phone` is the normalised number echoed back to the person who typed it, so the code screen can show
it ("Sent by SMS to +971 50 123 4567"). Clients compute the countdown from `resendAt` minus the
response's `Date` header.

Problems:

| Status | `code` | When |
|---|---|---|
| 422 | `api.errors.invalidInput`, field `body.phone` → `auth.errors.phoneInvalid` | not a UAE mobile number |
| 422 | `api.errors.invalidInput`, field `body.channel` → `api.errors.invalidField` | unknown channel (008's generic field code) |
| 429 | `auth.errors.tooManyRequests` + `retryAfter` | an hourly allowance is used up |
| 429 | `auth.errors.resendTooSoon` + `retryAfter` | within 60 s of the last code to this number |
| 503 | `auth.errors.sendFailed` | the provider could not deliver (including "not on WhatsApp") |

## `POST auth/otp/verify`

Request (`otpVerifyV1`):

```json
{
  "challengeId": "0f6f1f0e-4a3b-4c55-9d0e-1b2c3d4e5f60",
  "phone": "+971501234567",
  "code": "482713",
  "signup": { "accountType": "provider", "personas": ["photographer", "videographer"], "acceptTerms": true }
}
```

- `challengeId`: uuid. `phone`: the normalised number (the challenge stores only its HMAC, so the
  number is sent again and must match the challenge's `phoneHash`; a mismatch answers like a wrong
  code). `code`: `/^\d{6}$/`.
- `signup` (optional, used only for a new account, research R12):
  - `accountType`: `"seeker"` (default) | `"provider"`;
  - `personas`: active persona slugs, 1–4, required for a provider;
  - `name`: 2–80 characters, optional (screen 11, feature 012);
  - `acceptTerms`: `true`, required for a provider.

Order of work:
1. Validate the body (422 `api.errors.invalidInput` with field codes; no attempt counted).
2. Address allowance for verify (429).
3. If `signup` asks for a provider: check personas against the active personas and `acceptTerms`
   (422; no attempt counted).
4. Atomic attempt increment (research R6). No live challenge → `codeExpired` or `codeLocked`.
5. Constant-time comparison of the code HMAC; also compare the phone HMAC. A wrong code →
   `codeInvalid`. The fifth wrong code → `codeLocked` on the next try.
6. Atomic mark as used.
7. Find the user by `username`, or create one from `signup` (unique-violation retry). Admin or editor
   → 403 `useEmailSignIn`.
8. Mint the session and token (research R2).

This endpoint is `auth: 'none'`: it ignores any token and never links accounts. **Linking** (US5)
is a website-only path: `linkNumberAction` (a server action that reads the website's cookie user)
calls `commands/link-number.ts`, which runs steps 1–6 of `verify-code` and then, instead of steps
7–8, attaches the number to the signed-in user who has no `username`, or answers 409 `numberTaken`;
the existing session stays. The app does not merge accounts (spec Assumptions), and 008's API never
reads the cookie (008 FR-004).

Response `200 OK` (`authTokenV1`):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsImF1dGhWZXJzaW9uIjoi…",
  "exp": 1797000000,
  "isNew": true,
  "user": {
    "id": "42",
    "name": null,
    "phone": "+971501234567",
    "email": null,
    "accountType": "provider",
    "personas": ["photographer", "videographer"],
    "locale": "en"
  }
}
```

`exp` is seconds since the epoch. `user` is the same shape as `GET me`.

Problems:

| Status | `code` | When |
|---|---|---|
| 422 | `api.errors.invalidInput`, field `body.code` → `auth.errors.codeInvalid` (also `body.phone`, `body.challengeId`, `body.signup.name`) | malformed body |
| 422 | `auth.errors.codeInvalid`, field `body.code` → `auth.errors.codeInvalid` | wrong code, or phone not matching the challenge |
| 422 | `auth.errors.codeExpired` | unknown, superseded, expired or already used challenge |
| 422 | `auth.errors.codeLocked` | 5 wrong attempts on this challenge |
| 422 | `auth.errors.personaRequired` (field `signup.personas`) | provider signup without personas |
| 422 | `auth.errors.personaInactive` (field `signup.personas`) | a persona is not active |
| 422 | `auth.errors.acceptTerms` (field `signup.acceptTerms`) | provider signup without acceptance |
| 429 | `auth.errors.tooManyRequests` + `retryAfter` | verify allowance for the address used up |
| 403 | `auth.errors.useEmailSignIn` | the number belongs to an admin or editor (after a correct code) |
| 409 | `auth.errors.numberTaken` | linking, website only: another account signs in with this number (US5) |

Before step 6 no answer depends on whether an account exists.

## `POST auth/refresh`

Request: no body; `Authorization: Bearer <token>`.

Calls Payload's `refreshOperation` with the user and `_sid` resolved by `payload.auth`: the same
session's `expiresAt` moves to now + 7 days and a new token is signed for the same `sid`.

Response `200 OK` (`authRefreshV1`):

```json
{ "token": "eyJhbGciOiJIUzI1NiIs…", "exp": 1797600000 }
```

Problems (008 research R3): 401 `api.errors.unauthorized` when the token is missing; 401
`api.errors.tokenInvalid` when it is invalid, expired or its session was removed.

## `POST auth/logout`

Request: no body; `Authorization: Bearer <token>`.

Calls Payload's `logoutOperation`, which removes the session with this token's `sid`; the token no
longer authenticates anywhere (OT-US3-S3).

Response `204 No Content` (registry `status: 204`, `output: noContentV1`, no body).

Problems: 401 `api.errors.unauthorized` or `api.errors.tokenInvalid`. The app treats either 401 on
logout as already signed out.

## `GET me`

Request: `Authorization: Bearer <token>`.

Response `200 OK` (`meV1`):

```json
{
  "id": "42",
  "name": "Sara",
  "phone": "+971501234567",
  "email": null,
  "accountType": "seeker",
  "personas": [],
  "locale": "ar"
}
```

- `phone` is the account's `username` (the verified number), `null` for an email-only account.
  Only this endpoint (for the member themself) and the admin return it (FR-025, FR-033).
- `personas` are slugs; labels come from 008's `GET /api/mobile/v1/personas` (`personasV1`, the
  active personas in site order) in the request's language. `GET site` carries no personas.
- `accountType` decodes unknown values to `unknown` in the app (additive enums).
- Built by `toWireMe` in `apps/web/src/modules/auth/wire.ts` from the user; `sessions`, `hash`,
  `salt`, `loginAttempts`, `lockUntil`, `roles` and the legal records are never sent.

Problems: 401 `api.errors.unauthorized` or `api.errors.tokenInvalid`.

## Problem codes and statuses added to `problems.ts`

Codes added to `PROBLEM_CODES` (`packages/domain/src/api/v1/problems.ts`, 008):
`auth.errors.phoneInvalid`, `auth.errors.tooManyRequests`, `auth.errors.resendTooSoon`,
`auth.errors.sendFailed`, `auth.errors.codeInvalid`, `auth.errors.codeExpired`,
`auth.errors.codeLocked`, `auth.errors.useEmailSignIn`, `auth.errors.numberTaken`. Reused:
`auth.errors.personaRequired`, `auth.errors.personaInactive`, `auth.errors.acceptTerms` (001, already
in the web message files), and 008's `api.errors.invalidInput`, `api.errors.invalidField`,
`api.errors.unauthorized` and `api.errors.tokenInvalid`.

Statuses added to `problemV1.status` and to `problem()`'s `ProblemStatus`: 403, 409 and 503 (008
allows only 401, 404, 422, 429 and 500). New enum values are additive under 008's compatibility
rules; the app maps an unknown status by its code.

Each new code gets an English and an Arabic string in `apps/web/messages/{en,ar}.json`, a case in
`apps/mobile/lib/core/l10n/failure_message.dart`, and an ARB string in `app_en.arb` and `app_ar.arb`.
The contract test fails if any is missing. English strings (Arabic written by a person who writes
Arabic):

| Code | English |
|---|---|
| `phoneInvalid` | Enter a UAE mobile number, like 50 123 4567. |
| `tooManyRequests` | Too many codes for now. Try again in {minutes} minutes. |
| `resendTooSoon` | You can ask for a new code in {time}. |
| `sendFailed` | We couldn't send the code. Try again, or send it by {otherChannel}. |
| `codeInvalid` | That code isn't right. Check the text we sent and type it again. |
| `codeExpired` | That code has expired. Ask for a new one. |
| `codeLocked` | That code was tried too many times. Ask for a new one. |
| `useEmailSignIn` | Editors sign in with email. |
| `numberTaken` | This number already signs in to another account. |

## Contract tests

- `packages/domain/src/api/v1/auth.test.ts`: every example parses; invalid variants fail with the
  listed codes.
- The snapshot test (008) stays additive.
- `packages/domain/src/api/v1/examples.test.ts` (008): every new example file is claimed by its
  registry entry (`examples` or `requestExamples`).
- 008's `apps/web/tests/integration/mobile-api-access.int.test.ts` walks the five new registry
  entries (route file exists, method exported, anonymous call answers as declared).
- `apps/web/tests/integration/mobile-api-auth-*.int.test.ts`: every response parses with its v1
  schema; status codes, `Cache-Control` (`no-store` or `private, no-store` as above), `Retry-After`.
- `apps/mobile/test/features/sign_in/data/models/*_test.dart` and
  `apps/mobile/test/core/auth/auth_api_test.dart` decode the same examples.
