# Implementation Plan: Sign in with a mobile number and a one-time code

**Branch**: `009-otp-sign-in` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-otp-sign-in/spec.md`

## Summary

A UAE mobile number and a six-digit code become the way members sign in, in the app first and on
the website later. One flow logs in and registers.

- **Rules.** Pure functions in `packages/domain/src/auth/otp.ts`: code length 6, 5-minute expiry,
  5 attempts, 60 s resend cooldown, UAE E.164 normalisation, the request and verify schemas, at
  100 % coverage.
- **Challenges.** A server-only `otp-challenges` collection keeps a keyed fingerprint of the number,
  an HMAC of the code, the channel, attempts, expiry and use. Access is deny-all; only the auth
  module touches it, with `overrideAccess`. Attempts and single use are atomic SQL updates.
- **Identity.** `users` turns on `loginWithUsername`; the verified number is the `username`, set
  only by server code. Email becomes optional and password login accepts email only. A migration
  adds the column and relaxes `email` and `name`, with no data change (research R1).
- **Tokens.** After a correct code the server finds or creates the user, adds a Payload session
  (mirroring the non-exported `addSessionToUser`) and signs a Payload JWT with the exported
  `jwtSign` and `getFieldsToSign`. Refresh and logout use Payload's exported `refreshOperation` and
  `logoutOperation`. An integration test proves mint → `payload.auth` → logout → 401 (R2).
- **API.** Five endpoints through 008's `defineHandler`, registered in 008's endpoint registry:
  `POST auth/otp/request`, `POST auth/otp/verify`, `POST auth/refresh`, `POST auth/logout`,
  `GET me` at `/api/mobile/v1/me` ([contracts/auth-api.md](contracts/auth-api.md)). Generic error
  codes; rate limits per number, per address and per install through `consumeAllowance`.
- **Messages.** A provider adapter in `modules/auth/otp/providers/`: `console` (writes to a local
  outbox file; refused in production by env validation) and one vendor, Unifonic, recommended in
  research R10 and pending the owner's approval ([contracts/otp-provider.md](contracts/otp-provider.md)).
- **App.** `core/auth/` gets `SessionStore` on `flutter_secure_storage` (wiped on first run),
  `SessionCubit` and a `QueuedInterceptor` that adds the Bearer token, refreshes under 2 days left
  and signs out on 401. `features/sign_in/` builds screens 20–23 from the 007 widgets, with
  one-time-code autofill, and the router guards `/account/**` with `?next=`. Screens 20–23 join the
  fidelity check.
- **Website** (User Story 5, P3). `/login` and `/register` switch to codes through the same
  commands; `/login/email` keeps the editor fallback; logout revokes the session; email members can
  attach a number.

## Technical Context

**Language/Version**:
- TypeScript strict on Node 24 LTS (web and domain).
- Dart 3.13.7 and Flutter 3.47.9 (stable), as pinned in `apps/mobile/README.md`.

**Primary Dependencies**:
- Existing web: `payload` 3.93.0 (`jwtSign`, `getFieldsToSign`, `refreshOperation`,
  `logoutOperation`, `loginWithUsername`), `@payloadcms/db-postgres` (Drizzle for the atomic
  updates), `next` 16, `zod` 4.6.7, `node:crypto` (`randomInt`, `createHmac`, `timingSafeEqual`).
- From 008:
  - `defineHandler` and `problem()` (`apps/web/src/shared/api/handler.ts`, `problem.ts`), with the
    success `status` (202, 204) and `consumeAllowance`'s `retryAfter` (008 T094);
  - `ActorContext` (`apps/web/src/shared/api/actor.ts`) with `installId` from `X-Shoot-Install`
    (32 lower-case hex) and `clientAddress`;
  - `packages/domain/src/api/v1/problems.ts` (`problemV1` with `fields`, `PROBLEM_CODES`), the
    endpoint registry `endpoints.ts` (with `requestExamples`) and the JSON-schema snapshot;
  - `GET /api/mobile/v1/site` (site settings) and `GET /api/mobile/v1/personas` (the active
    personas, in site order, that screens 21 and 23 show).
- New web: none. The vendor adapter uses `fetch`.
- Existing mobile: `dio` 5.11.1, `flutter_bloc`, `get_it`, `go_router` 18.1.4, `equatable`, and
  007's widgets, router and `Clock`; 006's `PreferencesStore`.
- New mobile: `flutter_secure_storage` and `url_launcher`, each pinned exactly (Complexity
  Tracking).

**Storage**:
- PostgreSQL: new collection `otp-challenges`; `users` gains `username` (unique) and loses
  `NOT NULL` on `email` and `name`; `users.sessions` (Payload's) holds the sessions; rate-limit rows
  in the existing `rate-limits`.
- Device: one JSON value in the platform secure store; one `install.seen` key in 006's
  `PreferencesStore`.
- Development: `apps/web/.otp-outbox/*.json` (git-ignored).

**Testing**:
- Domain: Vitest unit tests at 100 % (`otp.test.ts`, `api/v1/auth.test.ts`).
- Web: unit tests (HMAC, providers, env guard), integration tests against Testcontainers PostgreSQL
  with the committed migrations (`tests/integration/mobile-api-auth-*.int.test.ts`,
  `users-identity.int.test.ts`), Playwright request specs through the console outbox, and (US5)
  Playwright browser specs.
- Mobile: unit, cubit (`bloc_test`), widget and golden tests; the fidelity check for 20–23.
- Every test name carries its scenario id (`OT-…`).

**Target Platform**:
- The web app (Linux containers, horizontally scaled) and its `/api/mobile/v1`.
- iOS (iPhone and iPad) and Android phones.

**Project Type**: web application with a REST API, plus the mobile app.

**Performance Goals**:
- `otp/request` answers in under 500 ms p95 excluding the provider call, which runs before the
  answer (so a send failure can be reported) with a 5 s timeout.
- `otp/verify` under 300 ms p95.
- No change to the public site's budgets: the sign-in pages (US5) stay within Lighthouse ≥ 90 and
  the auth-page JS budget.

**Constraints**:
- No phone number or code in any log (server, app, CI output), FR-032.
- Enumeration-resistant answers, constant-time comparison, single-use codes.
- Payload exact-pinned; the mirrored internal is guarded by a tripwire test.
- English LTR and Arabic RTL, light and dark, largest text size, VoiceOver and TalkBack.

**Scale/Scope**:
- 5 endpoints, 1 collection, 1 migration, 2 providers.
- 4 app screens (20–23), 3 new catalogue widgets, 1 corrected widget.
- 3 web pages changed (US5).
- 39 acceptance scenarios.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan meets it |
|---|---|---|
| I. Spec-driven | Pass | Spec 009 is written and validated; plan, tasks and analyze follow. User Story 5 amends 001's spec before its code changes (task T079). |
| II. Performance budgets | Pass | The app work adds no web bytes. US5 replaces the email forms with forms of the same size; the code step is a server-rendered form with one small client island for the cells and countdown. Lighthouse runs on `/login` and `/login/code`. |
| III. Test-first | Pass | Every scenario maps to a named test ([quickstart.md](quickstart.md)). Domain rules first (100 %), then integration tests against PostgreSQL for every endpoint, the access rule and the migration, then cubit, widget and golden tests. |
| IV. Content in the CMS | Pass | Professions on screens 21 and 23 come from the active personas (008's `GET personas`). Screen text is interface strings (ARB, `messages/*.json`). The SMS text is an interface string; the WhatsApp text is Meta's fixed authentication template. No profession is named in code. |
| V. Modular | Pass | Rules in `packages/domain/src/auth/`; server code in `modules/auth/` (`otp/`, `commands/`, `api.ts`, `collections/`), exported through its `index.ts`. The app keeps app-wide session code in `core/auth/` and screens in `features/sign_in/`. Sessions are in the database, so the web app stays stateless. |
| VI. Accessible, bilingual, themed | Pass | Four variants per screen in the fidelity check; one text field for assistive technology behind the code cells; `InlineError` is a live region; 44 px targets; RTL with numbers kept LTR; largest text size goldens. |
| VII. Secure by default | Pass with justification | `otp-challenges` is deny-all; `username` is server-written only; `users.create` closes to admins in US5. Codes and numbers are stored only as HMACs; constant-time comparison; generic errors; per-number, per-address and per-install limits; lockout after 5 attempts; editors cannot use codes; no PII in logs; new secrets validated at startup and the console provider refused in production. **Bearer token in the app instead of an HTTP-only cookie**: a native app has no cookie jar that is safe from other apps, so the token lives in the iOS Keychain or Android Keystore through `flutter_secure_storage`, is short-lived (7 days) with refresh, is never logged or put in a URL, and is revocable through Payload sessions (logout, or an admin clearing them). It is still the CMS's built-in auth (a Payload JWT checked by `payload.auth`). The website keeps the HTTP-only `payload-token` cookie (research R3). See Complexity Tracking. |
| VIII. Simplicity | Pass with justification | Two Flutter packages, one external vendor, one mirrored Payload internal. See Complexity Tracking. |
| IX. Designed, not generated | Pass with gate | Screens 20–23 are built to their boards and gated by the fidelity check; the impeccable detector runs on the new widgets; the finish review covers the four screens in four variants. US5's web pages follow the impeccable workflow in the Brief Bar world. One primary action per screen; no account needed before the brief (sign-in stays at the end of the brief, 012). |
| Stack | Pass | Constitution 1.4.0 stack; no new web package. |

## Project Structure

### Documentation (this feature)

```text
specs/009-otp-sign-in/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0 decisions R1–R18
├── data-model.md        # otp-challenges, users changes, sessions, allowances, app session state
├── quickstart.md        # how to verify; scenario → test mapping
├── contracts/
│   ├── auth-api.md      # the five endpoints: requests, responses, problems, examples
│   └── otp-provider.md  # the provider interface, console outbox, vendor adapter, env
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
packages/domain/src/
├── auth/
│   ├── otp.ts                         # rules and constants (R4)
│   ├── otp.test.ts
│   └── index.ts                       # + export * from './otp'
└── api/v1/
    ├── auth.ts                        # zod: request, verify, token, me (contracts/auth-api.md)
    ├── auth.test.ts
    ├── problems.ts                    # + auth.errors.* codes, + statuses 403, 409, 503 (file from 008)
    ├── endpoints.ts                   # + otpRequest, otpVerify, authRefresh, authLogout, me (file from 008)
    └── examples/auth-*.json           # shared fixtures: server tests, Dart model tests, goldens

specs/contracts/mobile-api/v1.schema.json   # snapshot regenerated (additive)

apps/web/
├── .env.example                       # + OTP_PROVIDER, OTP_HMAC_SECRET and the vendor variables
├── .gitignore                         # + .otp-outbox/
├── package.json                       # + "otp:last"
├── messages/{en,ar}.json              # + auth.otp.*, auth.errors.code*, …; US5 page strings
├── scripts/otp-last.mjs               # prints the newest console-outbox code (dev only)
└── src/
    ├── shared/lib/env.ts              # + OTP_* validation and the production guard (R9)
    ├── payload.config.ts              # + OtpChallenges
    ├── migrations/2026111x_users_phone_identity.ts   # R1, plus otp_challenges table
    ├── app/(payload)/api/mobile/v1/
    │   ├── auth/otp/request/route.ts  # export { requestCodeV1 as POST } from '@/modules/auth'
    │   ├── auth/otp/verify/route.ts
    │   ├── auth/refresh/route.ts
    │   ├── auth/logout/route.ts
    │   └── me/route.ts                # export { getMeV1 as GET }
    ├── app/(payload)/api/cron/cleanup/route.ts       # + expired challenges
    ├── app/(site)/[locale]/login/{page.tsx, code/page.tsx, email/page.tsx}   # US5
    ├── app/(site)/[locale]/register/page.tsx          # US5: join as a creator
    └── modules/auth/
        ├── index.ts                   # + api handlers, commands
        ├── api.ts                     # defineHandler adapters (R18): requestCodeV1, verifyCodeV1, refreshSessionV1, endSessionV1, getMeV1
        ├── wire.ts (+ test)           # toWireMe: the meV1 public shape
        ├── actions.ts                 # US5: server-action adapters; register removed; logout revokes
        ├── collections/Users.ts       # loginWithUsername, username override, beforeOperation(login)
        ├── collections/OtpChallenges.ts
        ├── commands/{request-code,verify-code,refresh-session,end-session,link-number}.ts
        ├── otp/
        │   ├── codes.ts               # randomInt, HMAC, timingSafeEqual (R5)
        │   ├── challenges.ts          # create, supersede, atomic attempt and use (R6)
        │   ├── mint.ts                # find-or-create, add session, jwtSign (R2)
        │   ├── signup.ts              # new-account data and legal acceptance (R12)
        │   └── providers/{types,console,unifonic,index}.ts
        └── components/                # US5: PhoneStep, CodeStep, JoinForm (web)

apps/web/tests/
├── integration/
│   ├── mobile-api-auth-otp.int.test.ts           # US1
│   ├── mobile-api-auth-protection.int.test.ts    # US2
│   ├── mobile-api-auth-session.int.test.ts       # US3 (the minting tripwire)
│   └── mobile-api-auth-join.int.test.ts          # US4
├── integration/users-identity.int.test.ts   # migration and username access
├── integration/auth-web.int.test.ts         # US5 actions
├── unit/otp-providers.test.ts, unit/env-otp.test.ts (or co-located *.test.ts)
└── e2e/ot-us1-api.spec.ts, ot-us5-web.spec.ts

apps/mobile/
├── pubspec.yaml                       # + flutter_secure_storage, url_launcher (exact pins)
├── ios/Runner/Runner.entitlements     # keychain access group (secure storage)
├── lib/core/auth/
│   ├── session_store.dart             # interface, SecureSessionStore, MemorySessionStore
│   ├── session.dart                   # Session, SessionUser
│   ├── session_cubit.dart             # unknown / signedOut / signedIn
│   ├── auth_api.dart                  # refresh, logout, me
│   ├── auth_interceptor.dart          # QueuedInterceptor (R14)
│   └── safe_next.dart
├── lib/core/routing/{app_routes.dart, app_router.dart}   # /login, /login/code, /register built; guard
├── lib/core/widgets/{otp_code_input.dart (56 px), choice_row_group.dart, check_line.dart, inline_error.dart}
├── lib/core/l10n/{arb/app_en.arb, arb/app_ar.arb, failure_message.dart}
├── lib/features/sign_in/
│   ├── domain/{entities/otp_challenge.dart, entities/signup_choice.dart, resend_timer.dart,
│   │          repositories/auth_repository.dart, usecases/request_code.dart, usecases/verify_code.dart}
│   ├── data/{models/*.dart, datasources/auth_remote_datasource.dart, repositories/auth_repository_impl.dart}
│   ├── presentation/{cubit/sign_in_flow_cubit.dart, cubit/sign_in_flow_state.dart,
│   │                pages/number_page.dart, pages/code_page.dart, pages/join_page.dart, widgets/*}
│   └── sign_in_injection.dart
└── test/
    ├── core/auth/{session_store_test, session_cubit_test, auth_interceptor_test, safe_next_test}.dart
    ├── core/routing/auth_guard_test.dart
    ├── core/widgets/{otp_code_input, choice_row_group, check_line, inline_error}_test.dart
    ├── features/sign_in/{domain,data,presentation}/…_test.dart
    └── goldens/screens/{20_signin_number,21_signin_code,22_code_error,23_join}_golden_test.dart

specs/design-system/canvas/strings.ar/{S09-signin-number,S09d-code-error,S09c-join}.json
tools/design-fidelity/shipped.json     # + "009-otp-sign-in"
```

**Structure Decision**:
- Server logic is one module, `modules/auth/`, with OTP internals under `otp/` and the shared
  command bodies under `commands/`, so the API and the website's server actions share one body
  (mobile-api-contract skill).
- In the app, the session is app-wide (`core/auth/`); the screens are a feature (`features/sign_in/`)
  whose `domain/` feature 012 reuses for screens 10 and 11.
- `GET me` sits at `/api/mobile/v1/me` (not under `auth/`) because 013 adds `PATCH me` to the same
  resource.

## Post-design Constitution re-check

Phase 1 added one collection (deny-all), one column, one migration with no data change, five
endpoints with `no-store` caching, and two app packages. The contracts keep every error generic
before a code is proven. Principle VII's cookie wording is met on the website and justified for the
app (Complexity Tracking). The gate passes.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Bearer token for the app instead of an HTTP-only cookie (Principle VII) | A native app has no cookie jar that is safe from other apps; the OS protects the Keychain and Keystore, so the token lives there (`flutter_secure_storage`). It is a Payload JWT (the CMS's built-in auth), short-lived (7 days) with refresh, never logged or put in a URL, and revocable through Payload sessions. A Bearer header also rules out CSRF. The website keeps the HTTP-only `payload-token` cookie. | A persistent cookie jar in the app stores plain files with no OS protection and brings CSRF back. `shared_preferences` is plain text. |
| `flutter_secure_storage` package | FR-023: the session must live in the iOS Keychain or Android Keystore. | `shared_preferences` (006) stores plain text. Hand-written Keychain and Keystore platform channels are more native code to own and audit for the same calls. |
| `url_launcher` package | Screens 20 and 23 link to the legal documents a person accepts, and "Sign in with email" opens the website; 012 needs it for WhatsApp. | Hiding the links fails the legal requirement (005). A hand-written platform channel duplicates a first-party package. |
| External SMS/WhatsApp vendor (Unifonic recommended, owner approval pending; research R10) | Codes must reach UAE phones by SMS with a registered sender ID and by WhatsApp with an approved authentication template (FR-041). | Direct operator gateways mean two contracts and two integrations; a vendor "verify" product would own code generation and checking, duplicating the rules and locking the feature to it. The adapter keeps the vendor to one file. |
| Mirroring Payload's non-exported `addSessionToUser` (R2) | Minting a Payload token after a code needs a session on the user, and the helper is not exported in 3.93. Everything else (`jwtSign`, `getFieldsToSign`, `refreshOperation`, `logoutOperation`) is exported. | `payload.login` needs a password and counts lockout attempts. A separate JWT would not be recognised by `payload.auth` (FR-024). The fallback, a custom auth strategy with hashed opaque tokens, is a second auth system; it stays recorded for the case the tripwire test fails on an upgrade. |
| Atomic SQL through the Postgres adapter's Drizzle instance (R6) | Single-use codes and attempt counting must not race between two devices. | Payload's Local API has no conditional update; read-then-write races. |
| `OTP_HMAC_SECRET` (new secret) | Keys the code and phone fingerprints (R5). | Reusing `PAYLOAD_SECRET` ties token signing and code storage to one rotation. A plain hash of the number is reversible by enumeration. |
