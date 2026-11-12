---

description: "Task list for feature 009 — sign in with a mobile number and a one-time code"
---

# Tasks: Sign in with a mobile number and a one-time code

**Input**: Design documents from `specs/009-otp-sign-in/`.

**Prerequisites**:
- The design documents: plan.md, spec.md, research.md (R1–R18), data-model.md,
  contracts/auth-api.md, contracts/otp-provider.md and quickstart.md.
- Feature 007 merged (widgets, router and route table, `Clock`, golden harness, fidelity check).
- Feature 008 merged:
  - `defineHandler` and `problem()` in `apps/web/src/shared/api/handler.ts` (with the success
    `status`, 202 and 204), `ActorContext` in `actor.ts` (`installId`, `clientAddress`);
  - `consumeAllowance` whose 429 carries `retryAfter` (008 T094);
  - `packages/domain/src/api/v1/problems.ts` (`problemV1` with `fields`), the endpoint registry
    `endpoints.ts` (with `requestExamples`), the v1 snapshot;
  - `X-Shoot-Install` (32 lower-case hex); `GET /api/mobile/v1/site` and
    `GET /api/mobile/v1/personas` (the active personas);
  - `failure_message.dart` for problem codes, `api_examples_test.dart`, the `.well-known` files.
- Owner approval of the vendor (research R10) before T051; everything else runs on the console
  provider.

**Skills**: read `mobile-api-contract`, `payload-cms`, `testing-strategy`, `flutter-mobile`,
`design-fidelity`, `persona-extensibility` and `ui-design` before starting.
- Screens 20–23 and the website's sign-in pages are visible UI, so they follow the impeccable
  workflow (Principle IX). For the app the boards are the comp: build to the board, run the
  detector, run the finish review on the four variants.

**Tests**: required by the constitution (Principle III).
- Every phase lists its tests first: write them, watch them fail, then implement.
- Test names carry the 009 ids (`OT-US1-S4`).
- `quickstart.md` holds the scenario → test mapping.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**:
  - US1: sign in with a number and a code (app)
  - US2: a code only the owner can use
  - US3: stay signed in, sign out for real
  - US4: join as a creator
  - US5: the website signs in the same way
- Paths are relative to the repository root.
  - `web/` means `apps/web/`.
  - `mobile/` means `apps/mobile/`.
  - `domain/` means `packages/domain/src/`.
  - `canvas/` means `specs/design-system/canvas/`.
  - `fid/` means `tools/design-fidelity/`.
- Node commands need Node 24 (`nvm use`); integration tests need Docker. Flutter commands run in
  `apps/mobile`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: packages, environment, scripts and the vendor's lead time.

- [x] T001 Add `flutter_secure_storage` and `url_launcher` to `mobile/pubspec.yaml`, each pinned
  exactly (latest stable at least two weeks old, no caret); run `flutter pub get`.
  - Add their rows to the Packages table in `mobile/README.md` (feature 009, with the reasons from
    plan.md Complexity Tracking). Skip `url_launcher` if an earlier feature already added it.
  - iOS: add a keychain access group to `mobile/ios/Runner/Runner.entitlements`; add the
    `LSApplicationQueriesSchemes` entries `https` needs for `url_launcher`.
  - Android: confirm `minSdkVersion` meets `flutter_secure_storage`'s minimum.
- [x] T002 [P] Add `OTP_PROVIDER`, `OTP_HMAC_SECRET`, `UNIFONIC_APP_SID`, `OTP_SMS_SENDER_ID`,
  `OTP_WHATSAPP_SENDER` and `OTP_WHATSAPP_TEMPLATE` to `web/.env.example`, with comments from
  contracts/otp-provider.md. Add `.otp-outbox/` to `web/.gitignore`.
- [x] T003 [P] Add `node scripts/check-scenario-tests.mjs specs/009-otp-sign-in/quickstart.md` to
  `check:scenarios` in the root `package.json`.
- [x] T004 [P] Create `web/scripts/otp-last.mjs`: prints the newest `web/.otp-outbox/*.json` code and
  channel, the number masked to its last 4 digits; refuses when `NODE_ENV=production`. Add the
  `otp:last` script to `web/package.json`.
- [x] T005 [P] Confirm the 008 prerequisites listed above exist, under the names and paths in 008's
  plan and contracts/handler.md. If any is missing, stop and report; do not re-implement 008 here.
- [ ] T006 [P] Owner task, started now because of its lead time (research R10): approve the vendor
  in writing (price quote for UAE SMS and WhatsApp, data residency and retention, contract), start
  the UAE sender-ID registration with both operators and the WhatsApp Business account with `en`
  and `ar` authentication templates. Record the decision and dates in research R10.

**Checkpoint**: packages resolve, the env is documented, the scenario check includes 009.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: rules, schemas, secrets, the challenge store, phone identity, the provider interface,
token minting, and the app's session core. Every story needs them.

### Tests first

- [x] T007 [P] Write `domain/auth/otp.test.ts` (100 % of `otp.ts`):
  - `normaliseUaeMobile` accepts `0501234567`, `501234567`, `+971 50 123 4567`, `00971501234567`,
    `971-50-123-4567`; refuses `+97141234567` (landline), `+966501234567`, `05012345`, letters
    (**`OT-US1-S9`**);
  - `challengeState` and `verifyOutcome`: used, superseded and expired beat live; the right code on
    a locked challenge is `locked` (**`OT-US1-S5`**); `now ≥ expiresAt` is `expired`
    (**`OT-US1-S6`**);
  - `canResend`/`resendAt` at 59 and 60 s; `formatCode` pads; `isCodeShape`; `maskPhone`.
- [x] T008 [P] Write `domain/api/v1/auth.test.ts`: every `examples/auth-*.json` parses with its
  schema; invalid variants fail with the codes in contracts/auth-api.md (bad phone, bad channel,
  5-digit code, provider signup without personas or `acceptTerms`, name of 1 or 81 characters).
- [x] T009 [P] Write `web/src/modules/auth/otp/codes.test.ts` (**`OT-US2-S3`**, unit part):
  - `generateCode` returns six digits from `crypto.randomInt` (spied);
  - `codeHash` and `phoneHash` are keyed (different keys, different digests) and bound to the
    challenge id;
  - `codesMatch` uses `timingSafeEqual` for right, wrong and malformed input (malformed compares
    against a dummy digest).
- [x] T010 [P] Extend `web/src/shared/lib/env.test.ts` (**`OT-US2-S5`**):
  - production with a public `NEXT_PUBLIC_SITE_URL` and `OTP_PROVIDER` unset or `console` is
    refused with the message from contracts/otp-provider.md;
  - `localhost` production builds may use `console`;
  - `OTP_HMAC_SECRET` shorter than 32 is refused;
  - `OTP_PROVIDER=unifonic` with a missing vendor variable lists the missing ones.
- [x] T011 [P] Write `web/src/modules/auth/otp/providers/console.test.ts`: writes
  `.otp-outbox/<challengeId>.json` with the documented fields; the documented failure numbers resolve
  `unreachable` and `unavailable`; a spy on `payload.logger` never receives the code or number.
- [x] T012 [P] Write `web/tests/integration/users-identity.int.test.ts`, against a database migrated
  with every committed migration and seeded with 001-era users (email and password, duplicate
  `phone` values, an editor):
  - all rows survive the migration; email logins still work; `username` is `NULL` for them;
  - **`OT-US2-S7`**: `POST /api/users/login` with `{ username: '+9715…', password }` is refused, and
    after 10 such attempts the account still signs in by code (`lockUntil` does not block minting);
  - **`OT-US2-S8`**: another member reading the user (`GET /api/users/:id`) gets 403 or no
    `username`/`phone`; an admin sees both; a creator reading a booking they are assigned to gets
    no client number;
  - **`OT-US2-S9`**: `PATCH /api/users/:id` with `username` by the member themself, by REST create,
    and by an admin are all refused or ignored; only `overrideAccess` code sets it.
- [x] T013 [P] Write `web/tests/integration/mobile-api-auth-session.int.test.ts`, the tripwire for
  research R2 (**`OT-US3-S8`**):
  - `mintSession(user)` returns `{ token, exp }`; `payload.auth({ headers: Bearer })` returns the
    user with `_sid`; the token's protected header and claim keys equal those of a token from
    `payload.login` for an email account;
  - the session row exists in `users.sessions` with `expiresAt = now + 7 days`;
  - `logoutOperation` removes it; the same token then gives `user: null`;
  - an expired session (clock moved 7 days) gives `user: null`.

### Implementation

- [x] T014 Create `domain/auth/otp.ts` (research R4) and export it from `domain/auth/index.ts`.
  Make T007 pass at 100 %.
- [x] T015 Create `domain/api/v1/auth.ts`: `otpRequestV1`, `otpChallengeV1`, `otpVerifyV1`,
  `signupV1`, `authTokenV1`, `authRefreshV1`, `meV1`, per contracts/auth-api.md. Write
  `domain/api/v1/examples/auth-request.json`, `auth-challenge.json`, `auth-verify-seeker.json`,
  `auth-verify-provider.json`, `auth-token.json`, `auth-refresh.json`, `me-seeker.json`,
  `me-provider.json` with the boards' placeholder data (`+971 50 123 4567`; personas
  `photographer`, `videographer`). Register `otpRequest` (`status: 202`), `otpVerify`,
  `authRefresh`, `authLogout` (`status: 204`, `output: noContentV1`) and `me` in
  `domain/api/v1/endpoints.ts` with the method, path, auth, `cache: 'no-store'`, `examples` and
  `requestExamples` from the contract's tables. Make T008 and 008's `endpoints.test.ts` and
  `examples.test.ts` pass.
- [x] T016 Add the new codes to `domain/api/v1/problems.ts`, and the statuses 403, 409 and 503 to
  `problemV1.status` and to `problem()`'s `ProblemStatus` in `web/src/shared/api/problem.ts`
  (additive); add English and Arabic strings to
  `web/messages/en.json` and `ar.json` (`auth.errors.*` from contracts/auth-api.md, `auth.otp.sms`
  from contracts/otp-provider.md; Arabic written by a person who writes Arabic). Regenerate
  `specs/contracts/mobile-api/v1.schema.json`; the snapshot test confirms the change is additive.
- [x] T017 Extend `web/src/shared/lib/env.ts` with the OTP variables and the production guard
  (research R9). Make T010 pass.
- [x] T018 [P] Create `web/src/modules/auth/otp/codes.ts` (`generateCode`, `codeHash`, `phoneHash`,
  `codesMatch`, research R5), reading `OTP_HMAC_SECRET` through `env()`. Make T009 pass.
- [x] T019 [P] Create `web/src/modules/auth/collections/OtpChallenges.ts` per data-model.md
  (deny-all access with the `nobody` helper, `admin.hidden`, indexes). Register it in
  `web/src/payload.config.ts`.
- [x] T020 Change `web/src/modules/auth/collections/Users.ts` (research R1):
  - `auth.loginWithUsername: { allowEmailLogin: true, requireEmail: false, requireUsername: false }`;
  - override `username` in `fields`: label "Sign-in number", read-only in the admin, field access
    `create`/`update` → `() => false`, `read` → self or admin;
  - field-level `read` on `phone` → self or admin;
  - `name` no longer `required` (keep `minLength: 2`, `maxLength: 80`);
  - `hooks.beforeOperation`: on `login`, refuse when the data has `username` (FR-016);
  - `admin.useAsTitle: 'name'`, `defaultColumns` with `username`.
- [x] T021 Run `pnpm db:migration:create users_phone_identity`. Review the SQL against data-model.md
  (no drop, no rewrite; down migration as documented) and write the review as a comment at the top
  of the migration. Run `pnpm --filter web payload generate:types`. Make T012 pass, except its creator-booking case,
  which T055 completes.
- [x] T022 Confirm (part of T005) that 008's T094 landed: `consumeAllowance` in
  `web/src/shared/payload/rate-limit.ts` throws its 429 `APIError` with `data: { retryAfter }`
  (research R7). This feature does not change the function; if the field is missing, stop and
  report, as T005 says.
- [x] T023 Create `web/src/modules/auth/otp/challenges.ts` (research R6): `createChallenge`
  (supersedes live ones for the phone hash), `latestFor(phoneHash)`, `attempt(publicId)` and
  `markUsed(publicId)` as single conditional `UPDATE … RETURNING` statements through
  `payload.db.drizzle` with the generated table, and `stateOf(publicId)` for error codes.
- [x] T024 [P] Create `web/src/modules/auth/otp/providers/types.ts`, `console.ts` and `index.ts` per
  contracts/otp-provider.md. Make T011 pass.
- [x] T025 Create `web/src/modules/auth/otp/mint.ts` (research R2): `mintSession(payload, user)`,
  mirroring `addSessionToUser` from `payload/dist/auth/sessions.js` (cite the file and version in a
  comment), then `jwtSign` with `getFieldsToSign`. Make T013 pass. Add an "Upgrading Payload"
  note to `web/README.md` naming `sessions.js` and `mobile-api-auth-session.int.test.ts`.
- [x] T026 Extend `web/src/app/(payload)/api/cron/cleanup/route.ts` to delete `otp-challenges` whose
  `expiresAt` is older than 24 hours (FR-034), with a case in the existing cleanup test.

### Mobile core

- [x] T027 [P] Write `mobile/test/core/auth/session_store_test.dart` (base cases) and
  `mobile/test/core/auth/session_cubit_test.dart` (base cases): `MemorySessionStore` round-trips;
  an unparsable value reads as signed out and is deleted; `SessionCubit.signIn` stores and emits
  `SignedIn`; `signOut` deletes and emits `SignedOut`.
- [x] T028 Create in `mobile/lib/core/auth/`: `session.dart` (`Session`, `SessionUser`, decoding the
  `auth-token.json` and `me-*.json` examples), `session_store.dart` (`SessionStore`,
  `SecureSessionStore` on `flutter_secure_storage` with the options in research R14,
  `MemorySessionStore`), `session_cubit.dart` (`SessionUnknown`, `SignedOut`, `SignedIn`). Register
  in `mobile/lib/core/di/injection.dart`; read the store before `runApp` in `mobile/lib/main.dart`.
  Make T027 pass.
- [x] T029 [P] Add the new problem codes to `mobile/lib/core/l10n/failure_message.dart` with strings
  in `mobile/lib/core/l10n/arb/app_en.arb` (with descriptions) and `app_ar.arb`; extend 008's
  contract test so it fails if a 009 code is missing on either side.
- [x] T030 [P] Write the sign-in domain tests first:
  `mobile/test/features/sign_in/domain/resend_timer_test.dart` (**`OT-US1-S7`**, unit part: counts
  down from the server's `resendAt` adjusted by the `Date` header skew, using the fixed `Clock`;
  `canResend` at zero), `request_code_test.dart`, `verify_code_test.dart`.
- [x] T031 Create `mobile/lib/features/sign_in/domain/`: `entities/otp_challenge.dart`,
  `entities/signup_choice.dart`, `resend_timer.dart`, `repositories/auth_repository.dart`,
  `usecases/request_code.dart`, `usecases/verify_code.dart`. Make T030 pass.
- [x] T032 [P] Write `mobile/test/features/sign_in/data/models/*_test.dart` (decode every
  `auth-*.json` and `me-*.json` example, `toEntity`, unknown `accountType` → `unknown`; add their
  rows to 008's `mobile/test/api_examples_test.dart`, which requires a row per example file) and
  `data/repositories/auth_repository_impl_test.dart` (problems → failures with their codes; network
  error → `NetworkFailure`; a stubbed Dio adapter).
- [x] T033 Create `mobile/lib/features/sign_in/data/` (models, `auth_remote_datasource.dart`,
  `auth_repository_impl.dart`) and `sign_in_injection.dart`, called from `core/di/injection.dart`.
  Make T032 pass.

**Checkpoint**: rules, schemas and secrets pass; the migration is reviewed; the minting tripwire
passes; the app can store a session and call the sign-in API.

---

## Phase 3: User Story 1 — Sign in with my number and a code (P1) 🎯 MVP

**Goal**: a person signs in or creates a client account in the app with a number and a code, on
screens 20, 21 and 22, matching their boards.

**Independent test**: with the console provider, sign in with a new number by SMS, sign out, sign in
again by WhatsApp into the same account; `pnpm fidelity --grep "20|21|22"` passes.

### Tests first

- [x] T034 [P] [US1] Write `web/tests/integration/mobile-api-auth-otp.int.test.ts` with an injected
  recording provider and the fixed clock:
  - **`OT-US1-S1`**: `POST auth/otp/request` with `050 123 4567` → 202, body parses with
    `otpChallengeV1`, `phone` normalised, `resendAt = now + 60 s`, one SMS recorded with the
    rendered text and the domain-bound line, `Cache-Control: no-store`; with `Accept-Language: ar`
    the recorded SMS is the Arabic text and keeps the domain-bound line unchanged (FR-042);
  - **`OT-US1-S2`**: verify with the right code and no `signup` → 200 `authTokenV1`, `isNew: true`,
    a user with `username`, `phone`, `roles: ['member']`, `accountType: 'seeker'`, no email, and
    two legal acceptances; the token works on `GET me`; with `signup.name` the new account is saved
    with that name, and without it `name` is `null` (FR-014);
  - FR-013: a seeded user whose unverified `phone` (no `username`) equals the number is not signed
    in; the right code creates a separate account;
  - **`OT-US1-S3`**: a second sign-in with a provider `signup` → same user id, `isNew: false`, the
    account unchanged;
  - **`OT-US1-S4`**: a wrong code → 422 `auth.errors.codeInvalid`, `attempts` incremented; a phone
    not matching the challenge answers the same;
  - **`OT-US1-S5`**: five wrong codes, then the right one → `auth.errors.codeLocked`;
  - **`OT-US1-S6`**: clock + 5 min → `auth.errors.codeExpired`;
  - **`OT-US1-S7`**: a second request within 60 s → 429 `auth.errors.resendTooSoon` with
    `retryAfter` and `Retry-After`; after 60 s a new code is sent and the first code answers
    `codeExpired`;
  - concurrency: two parallel verifies of one right code → exactly one 200; two first verifies of a
    new number with different challenges → one user.
- [ ] T035 (written: `tests/e2e/ot-us1-api.spec.ts` and `readOutboxCode`; not run here, the machine could not build and serve) [P] [US1] Write `web/tests/e2e/ot-us1-api.spec.ts` (Playwright request spec against the
  built server with the console provider): request, read the code with `readOutboxCode` (add it to
  `web/tests/e2e/helpers.ts`), verify, `GET me`, logout, `GET me` → 401. Name it with
  `OT-US1-S2` and `OT-US3-S3`.
- [x] T036 [P] [US1] Write `mobile/test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart`
  (`bloc_test`, fake repository and session cubit):
  - **`OT-US1-S2`**: `awaitingCode` → `verifying` → `signedIn(isNew: true)`, `SessionCubit.signIn`
    called with the token;
  - **`OT-US1-S8`**: after the countdown, `switchChannelAndResend()` requests with `whatsapp` and the
    state's channel changes; before it, the call is ignored;
  - problems map to `codeInvalid`, `codeExpired`, `codeLocked`, `rateLimited(retryAfter)`,
    `sendFailed`.
- [x] T037 [P] [US1] Write `mobile/test/features/sign_in/presentation/pages/number_page_test.dart`
  (**`OT-US1-S9`**: a landline or foreign number shows the field error and calls nothing; the
  segmented control defaults to SMS; the language button switches to Arabic; FR-055: "Editor? Sign
  in with email" calls the injected launcher with the website's email sign-in address) and
  `code_page_test.dart` (**`OT-US1-S1`**: "Sent by SMS to +971 50 123 4567", "Change number", the
  countdown, the role rows with "I need a …" selected, built from the `GET personas` example;
  **`OT-US1-S4`**: the `codeInvalid` state shows the error cells, `InlineError` announced, Top Hit
  "Try again" clears the cells and refocuses).
- [x] T038 [P] [US1] Write `mobile/test/core/widgets/otp_code_input_test.dart` (**`OT-US1-S10`**):
  the hidden field has `AutofillHints.oneTimeCode`, number keyboard, max length 6, inside an
  `AutofillGroup`; a pasted or autofilled `482713` fills six cells and fires `onCompleted`; cells are
  56 high (board 21 `.box`); one semantics node "Six-digit code"; cells stay left to right in Arabic.
- [x] T039 [P] [US1] Write `mobile/test/core/widgets/choice_row_group_test.dart` and
  `inline_error_test.dart` (sizes and states from research R16, radio-group semantics, live region,
  RTL, text scale 2.0).
- [x] T040 [P] [US1] Write `mobile/test/goldens/screens/20_signin_number_golden_test.dart`,
  `21_signin_code_golden_test.dart` and `22_code_error_golden_test.dart` (`@Tags(['golden'])`):
  `pumpBoard` in four variants from the shared examples (countdown 0:42 and 0:24 via the fixed
  clock), plus self-baselines, including one at the largest text size (`TextScaler.linear(2.0)`)
  per screen (Principle VI, the plan's Constitution Check).

### Implementation

- [x] T041 [US1] Create `web/src/modules/auth/commands/request-code.ts` (contracts/auth-api.md order of
  work; allowances through `consumeAllowance` with the keys in data-model.md; provider from the
  context with a 5 s `AbortSignal`; a failed send supersedes the challenge and returns
  `sendFailed`).
- [x] T042 [US1] Create `web/src/modules/auth/otp/signup.ts` (seeker path: `roles: ['member']`,
  random unusable password, `username` and `phone` set, optional `name`, `recordAcceptances` for
  `seeker`) and `web/src/modules/auth/commands/verify-code.ts` (order of work in the contract:
  attempt, compare, mark used, find or create with unique-violation retry, mint).
- [x] T043 [US1] Create `web/src/modules/auth/api.ts` with `requestCodeV1` and `verifyCodeV1`
  through `defineHandler`, spreading `endpoints.otpRequest` and `endpoints.otpVerify` (`auth:
  'none'`, `cache: 'no-store'`, the v1 schemas), and export them from
  `web/src/modules/auth/index.ts`. Add the route files
  `web/src/app/(payload)/api/mobile/v1/auth/otp/request/route.ts` and `…/otp/verify/route.ts`
  (one-line re-exports). Make T034 and T035 (request part) pass.
- [x] T044 [P] [US1] Correct `mobile/lib/core/widgets/otp_code_input.dart` to board 21 (`.box`: 56
  high, radius 9, gap 8, 26/500 tabular, 1 px `controlBorder`, active cell 2 px `accent`, error state
  `onDanger` border) and its autofill setup (research R11); update its component golden and 007's
  catalogue row in `.claude/skills/flutter-mobile/references/widget-catalogue.md`. Make T038 pass.
- [x] T045 [P] [US1] Create `mobile/lib/core/widgets/choice_row_group.dart` and `inline_error.dart`
  (research R16), with gallery entries in `mobile/lib/core/gallery/gallery_page.dart` and component
  goldens. Make T039 pass.
- [x] T046 [US1] Create `mobile/lib/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart` and
  `sign_in_flow_state.dart` (data-model.md). Make T036 pass.
- [x] T047 [US1] Build `mobile/lib/features/sign_in/presentation/pages/number_page.dart` to board 20:
  `ShootHeader` (back, wordmark, `عربي`), title and body, `PhoneField` with the hint, the
  `SegmentedControl` "Send the code by" (SMS, WhatsApp), Top Hit "Send code", the legal line with
  links opened through `url_launcher`, and "Editor? Sign in with email" (research R17). Fidelity keys
  for the manifest boxes.
- [x] T048 [US1] Build `mobile/lib/features/sign_in/presentation/pages/code_page.dart` to boards 21
  and 22: the "Sent by … to …" line with `Bidi`-safe number and "Change number", `OtpCodeInput`, the
  countdown (`ResendTimer`), the role question (`ChoiceRowGroup`, rows from the active personas via
  the ARB list pattern, "I need a …" default, only on the standalone flow), Top Hit "Continue" (or
  "Try again" in the error state), and "send it on WhatsApp" / "by SMS". `MessageBanner` for
  `rateLimited` and `sendFailed`. Make T037 pass.
- [x] T049 [US1] Wire the routes: in `mobile/lib/core/routing/app_routes.dart` set `/login` and
  `/login/code` to `built: true`; in `app_router.dart` add a `ShellRoute` providing
  `SignInFlowCubit` over `/login`, `/login/code` and `/register`, and redirect `/login/code` without a
  challenge to `/login`. Add the strings for screens 20–22 to both ARB files.
- [ ] T050 (app part, 2026-11-12: strings.ar for S09, S09b, S09c and S09d with `mobile/test/core/l10n/board_strings_test.dart`; `009-otp-sign-in` in `fid/shipped.json`; goldens for 20–22. Fidelity not yet passing: every box within 0.36 px, but pixel diffs en-light/en-dark 1.16 %/1.20 % (20), 2.15 %/2.12 % (21), 1.27 %/1.26 % (22) against 1 %: Flutter rounds each text line box to a whole pixel and the browser snaps glyph baselines. Arabic variants wait for 007's localise.ts) [US1] Write `canvas/strings.ar/S09-signin-number.json` and `S09d-code-error.json` (same
  Arabic as the ARB files; 21's file exists from 007 and is checked against board 42). Extend
  `mobile/test/core/l10n/board_strings_test.dart` to the new files. Add `"009-otp-sign-in"` to
  `fid/shipped.json`. Run `mobile/tool/goldens.sh --update` for 20–22, then
  `pnpm fidelity --grep "20|21|22"`, and fix until all four variants pass (T040).

**Checkpoint**: OT-US1-S1 to S10 pass; screens 20–22 match their boards in four variants; the MVP
signs people in on the console provider.

---

## Phase 4: User Story 2 — A code only the number's owner can use (P1)

**Goal**: enumeration-resistant answers, limits, fingerprints only, no PII in logs, editors refused,
the real vendor behind the guard.

**Independent test**: `mobile-api-auth-protection.int.test.ts` and `users-identity.int.test.ts` pass; the log
scan of the whole suite finds no number or code.

### Tests first

- [ ] T051 [P] [US2] Write `web/src/modules/auth/otp/providers/unifonic.test.ts` (after owner approval,
  T006): request bodies for SMS and WhatsApp from recorded examples, status → reason mapping, timeout
  → `unavailable`, no number, code or text in thrown or logged output. No network.
- [x] T052 [P] [US2] Write `web/tests/integration/mobile-api-auth-protection.int.test.ts`:
  - **`OT-US2-S1`**: requests for a number with an account and one without give the same status,
    the same keys and value shapes, and the same database reads (the user table is not queried; spy
    on `payload.find`);
  - **`OT-US2-S2`**: the sixth request for one number in an hour, the 21st from one address and the
    11th from one install id → 429 `tooManyRequests` with `retryAfter`; the 31st verify from one
    address → 429; rate-limit keys contain no number (only the hash);
  - **`OT-US2-S3`** (stored part): after a request, the `otp_challenges` row (read with raw SQL)
    contains neither the number nor the code in any column;
  - **`OT-US2-S4`**: a capturing logger over a full request → wrong verify → right verify → refresh →
    logout, plus a provider failure; no captured line matches the number (any format) or the code;
  - **`OT-US2-S6`**: an editor and an admin with a `username` (set with `overrideAccess`) → right
    code answers 403 `useEmailSignIn`, no session added, challenge used.
- [x] T053 [P] [US2] Add **`OT-US2-S4`** (app part) to `mobile/test/core/auth/auth_interceptor_test.dart`
  (created in T060 if not yet there): with a capturing `debugPrint`/logger, an `auth/*` request and
  its response are never logged, and `failure_message` text never contains the number.

### Implementation

- [x] T054 [US2] Make T052 pass: keep `request-code.ts` free of user reads; refuse admin and editor
  accounts in `verify-code.ts` (research R13); route all `modules/auth/otp` and command logging
  through a helper that accepts only `challengeId`, provider name, reason and status.
- [x] T055 [US2] Make T012's `OT-US2-S8` booking case pass: audit the creator-facing booking and brief
  reads in `web/src/modules/booking/` and `web/src/modules/creators/` (queries, pages under
  `/account/bookings`, notifications) and remove any client number from what a creator receives;
  list what was checked in the PR description.
- [ ] T056 [US2] After T006 approval: create `web/src/modules/auth/otp/providers/unifonic.ts` per
  contracts/otp-provider.md and register it in `providers/index.ts`. Make T051 pass. Record the
  vendor row in plan.md's Complexity Tracking as approved, with the date.
- [x] T057 [US2] Make the interceptor and repository logging rules of T053 pass (no logging of
  `auth/*` traffic; `kReleaseMode` logs nothing from Dio).

**Checkpoint**: OT-US2-S1 to S9 pass; the vendor adapter exists behind the production guard.

---

## Phase 5: User Story 3 — Stay signed in, sign out for real (P1)

**Goal**: refresh, logout, `/me`, the secure store with the first-run wipe, the interceptor and the
account guard.

**Independent test**: kill and reopen (signed in), move the clock (refreshed), sign out and replay
the token (401), reinstall (signed out), open `/account` signed out (sign-in, then back).

### Tests first

- [x] T058 [P] [US3] Extend `web/tests/integration/mobile-api-auth-session.int.test.ts`:
  - **`OT-US3-S2`**: `POST auth/refresh` with a live token → 200 `authRefreshV1`, same `sid`,
    `expiresAt` moved to now + 7 days; with a removed session → 401 `api.errors.tokenInvalid`;
    with no token → 401 `api.errors.unauthorized`;
  - **`OT-US3-S3`**: `POST auth/logout` → 204 with an empty body; `GET me` with the old token → 401
    `api.errors.tokenInvalid`; logout again → 401;
  - `GET me` → `meV1` with the member's own number; `Cache-Control: private, no-store`.
  - Also write `web/src/modules/auth/wire.test.ts`: `toWireMe` never sends `sessions`, `hash`,
    `salt`, `loginAttempts`, `lockUntil` or `roles`, and sends `phone: null` for an email account.
- [x] T059 [P] [US3] Extend `mobile/test/core/auth/session_store_test.dart` (**`OT-US3-S5`**: with no
  `install.seen` in the 006 in-memory `PreferencesStore`, `SecureSessionStore.init()` wipes a stored
  session and writes the flag; with the flag present it keeps it; a read exception wipes and reads as
  signed out) and `session_cubit_test.dart` (**`OT-US3-S1`**: a stored, unexpired session emits
  `SignedIn` as the first state after `SessionUnknown`, before any network call; `/me` then updates
  the user; a 401 from `/me` emits `SignedOut`; **`OT-US3-S3`**: `signOut()` calls `logout`, clears
  the store and emits `SignedOut`, also when logout answers 401 or the network fails).
- [x] T060 [P] [US3] Write `mobile/test/core/auth/auth_interceptor_test.dart` with a stubbed Dio
  adapter and the fixed clock:
  - adds `Authorization: Bearer` when signed in and nothing when signed out;
  - **`OT-US3-S2`**: with `exp` 1 day 23 h away, three queued requests trigger one refresh through
    the separate Dio, then all three carry the new token; with 2 days 1 h away, no refresh; a refresh
    network error keeps the old token; a refresh 401 signs out;
  - **`OT-US3-S4`**: a 401 on a request that carried a token calls `SessionCubit.expire()`.
- [x] T061 [P] [US3] Write `mobile/test/core/auth/safe_next_test.dart` (**`OT-US3-S7`**:
  `https://evil.example`, `//evil.example`, `/\evil`, `javascript:…`, `/unknown/path` → `null`;
  `/account/bookings` and `/ar/account` → kept) and `mobile/test/core/routing/auth_guard_test.dart`
  (**`OT-US3-S6`**: signed out, `/account/bookings` → `/login?next=%2Faccount%2Fbookings`; after
  `SignedIn` the router goes to `next`; **`OT-US3-S4`**: `SignedIn` → `SignedOut` while on an
  `auth: required` route redirects to `/login?next=…`).

### Implementation

- [x] T062 [US3] Create `web/src/modules/auth/commands/refresh-session.ts` (Payload's
  `refreshOperation`) and `end-session.ts` (`logoutOperation`), add `refreshSessionV1`,
  `endSessionV1` and `getMeV1` (with `toWireMe` in `web/src/modules/auth/wire.ts`) to `api.ts`,
  spreading `endpoints.authRefresh`, `endpoints.authLogout` and `endpoints.me` (`auth: 'required'`),
  and add the route files `…/v1/auth/refresh/route.ts`, `…/v1/auth/logout/route.ts` and
  `…/v1/me/route.ts`. Make T058 pass.
- [x] T063 [US3] Finish `SecureSessionStore.init()` (first-run wipe through `PreferencesStore`,
  research R14) and `SessionCubit` restore, `/me` refresh, `expire()` and `signOut()`. Create
  `mobile/lib/core/auth/auth_api.dart` (refresh, logout, me). Make T059 pass.
- [x] T064 [US3] Create `mobile/lib/core/auth/auth_interceptor.dart` (`QueuedInterceptor`, research
  R14) and add it, after 008's install-id interceptor, in `mobile/lib/core/network/dio_client.dart`;
  the refresh call uses a second `Dio` without it. Make T060 pass.
- [x] T065 [US3] Create `mobile/lib/core/auth/safe_next.dart` (a port of `web/src/modules/auth/safe-next.ts`
  checked against `app_routes.dart`) and add the guard to `app_router.dart`: `auth: required` routes
  redirect signed-out people to `/login?next=`; the router refreshes on `SessionCubit` changes; after
  sign-in the flow goes to `next`, else the default destination from research R15. Make T061 pass.
- [x] T066 [US3] Add a debug-only "Session" section to the gallery (signed-in user, expiry, "Sign
  out", "Expire token") for the manual checks until feature 013 builds the account screen's sign-out.

**Checkpoint**: OT-US3-S1 to S8 pass.

---

## Phase 6: User Story 4 — Join as a creator (P2)

**Goal**: screen 23, the provider signup on verify, and the "I'm a …" path from screen 21.

**Independent test**: join from the menu with two professions; join through "I'm a …" with the code
kept; both create creator accounts with three acceptances.

### Tests first

- [x] T067 [P] [US4] Write `web/tests/integration/mobile-api-auth-join.int.test.ts`:
  - **`OT-US4-S1`**: verify with `signup: { accountType: 'provider', personas: ['photographer',
    'videographer'], acceptTerms: true }` → `isNew: true`, a provider with both personas in that
    order, and `terms`, `professional-terms` and `privacy` acceptances;
  - **`OT-US4-S4`**: a provider signup without `acceptTerms` → 422 `auth.errors.acceptTerms`, and
    `attempts` is unchanged;
  - **`OT-US4-S5`**: a known seeker number with a provider signup → `isNew: false`, account still a
    seeker, no new acceptances;
  - **`OT-US4-S6`**: a persona switched to inactive before verify → 422
    `auth.errors.personaInactive`, `attempts` unchanged, the same code still works after choosing an
    active persona.
- [x] T068 [P] [US4] Write `mobile/test/features/sign_in/presentation/pages/join_page_test.dart`:
  - **`OT-US4-S3`**: with two active personas the segments are the two singulars plus "Both"; with
    three, plus "All"; with one, no combined segment; labels in the request's language from the
    `GET personas` example (`personas.json`, `personas.ar.json`);
  - **`OT-US4-S4`**: "Send code" without the box ticked calls nothing and shows the checkbox's
    message;
  - **`OT-US4-S2`** (page part): in finish mode the number is read-only with "Change number" and the
    Top Hit reads "Continue".
- [x] T069 [P] [US4] Extend `sign_in_flow_cubit_test.dart`: **`OT-US4-S1`** (menu path: request →
    code screen without the role question → verify with the provider signup) and **`OT-US4-S2`**
    ("I'm a …" + Continue does not call verify, opens `/register` in finish mode with the code kept;
    its "Continue" verifies once with the provider signup).
- [x] T070 [P] [US4] Write `mobile/test/core/widgets/check_line_test.dart` (22 px box, 14/1.5, inline
  links as separate semantics nodes, 44 px target for the whole line, RTL) and
  `mobile/test/goldens/screens/23_join_golden_test.dart` (four variants, self-baselines, one at
  the largest text size).

### Implementation

- [x] T071 [US4] Extend `web/src/modules/auth/otp/signup.ts` and `verify-code.ts` with the provider
  path (research R12): personas checked against the active personas with
  `isProviderRegistrationValid` before the attempt; acceptances for `provider`. Make T067 pass.
- [x] T072 [P] [US4] Create `mobile/lib/core/widgets/check_line.dart` with a gallery entry and
  component golden. Make T070's widget part pass.
- [x] T073 [US4] Build `mobile/lib/features/sign_in/presentation/pages/join_page.dart` to board 23
  (header with back and `عربي`, title and body, "I am a" `SegmentedControl` from the personas plus the
  combined option, `PhoneField`, `CheckLine` with the three legal links, Top Hit "Send code", "Already
  have an account? Log in"), plus its finish mode. Set `/register` to `built: true`. Strings in both
  ARB files. Extend `SignInFlowCubit` for both paths. Make T068 and T069 pass.
- [ ] T074 (app part, 2026-11-12: `canvas/strings.ar/S09c-join.json` and goldens done; en-light passes at 0.93 %, en-dark 1.22 % over 1 %, every box within 0.36 px; same cause as T050) [US4] Write `canvas/strings.ar/S09c-join.json`, run `tool/goldens.sh --update` for 23 and
  `pnpm fidelity --grep 23`, and fix until all four variants pass.
- [x] T075 [US4] Review against the `persona-extensibility` skill: no profession named in Dart, ARB
  or web code added by this feature; the role rows and segments change when an editor renames,
  reorders or deactivates a persona (add a case to T068 with a renamed persona).

**Checkpoint**: OT-US4-S1 to S6 pass; screen 23 matches its board in four variants.

---

## Phase 7: User Story 5 — The website signs in the same way (P3)

**Goal**: `/login` and `/register` by code with the HTTP-only cookie, `/login/email` for editors,
logout that revokes, and number linking.

**Independent test**: sign in on the website by code, log out and replay the cookie, sign in by email
as an editor, link a number to an email account.

### Tests first

- [x] T076 [P] [US5] Write `web/tests/integration/auth-web.int.test.ts` (server actions with mocked
  `cookies()` as the existing action tests do):
  - **`OT-US5-S1`**: the code actions set `payload-token` with `httpOnly`, `secure` (production),
    `sameSite: 'lax'`, `expires = exp`; `payload.auth` with the cookie returns the user;
  - **`OT-US5-S2`**: the email login action still signs in an editor, and locks after 5 wrong
    passwords (the 001 cases, moved here or kept in `actions.int.test.ts`);
  - **`OT-US5-S3`**: the logout action removes the session; the old cookie value then gives
    `user: null`;
  - **`OT-US5-S5`**: a signed-in email member without `username` links a number by code;
    `username` and `phone` are set; a later code sign-in returns the same user id;
  - **`OT-US5-S6`**: linking a number that is another user's `username` → `auth.errors.numberTaken`,
    nothing changes.
- [ ] T077 (written: `tests/e2e/ot-us5-web.spec.ts`; 001/005 e2e specs moved to the code flow; not run here) [P] [US5] Write `web/tests/e2e/ot-us5-web.spec.ts` (Playwright, console provider, 360 and
  1440 px, English and Arabic): **`OT-US5-S1`** (number → code from the outbox → header shows the
  account) and **`OT-US5-S4`** (`/register` shows Join as a creator by code; no page has an email
  registration form). Add the code step's one-time-code `autocomplete` to the assertions.
- [x] T078 [P] [US5] Write component tests for the new web forms in
  `web/src/modules/auth/components/forms.test.tsx` (number step, code step with countdown and error,
  join form): labels, errors from message keys, RTL, logical CSS only.

### Implementation

- [x] T079 [US5] Amend `specs/001-landing-auth-cms/spec.md` (FR-019 to FR-022: registration by code,
  email sign-in as a fallback) with a dated note pointing to 009, before changing code
  (Principle I).
- [x] T080 [US5] Create `web/src/modules/auth/commands/link-number.ts` (contracts/auth-api.md,
  "Linking"): it reuses `verify-code`'s steps 1–6 and then attaches the number, or answers
  `numberTaken`. Only the website's `linkNumberAction` calls it; the API's `otp/verify` stays
  `auth: 'none'` and never links.
- [x] T081 [US5] Rewrite `web/src/modules/auth/actions.ts` as adapters over the commands:
  `requestCodeAction`, `verifyCodeAction` (sets the cookie with the existing `setSessionCookie`),
  `joinAction`, `linkNumberAction`; keep `login` as the email action; remove `register`; `logout`
  calls `end-session` before deleting the cookie. Make T076 pass.
- [x] T082 (built in the Brief Bar world from the existing bar kit; the impeccable detector and finish review are T086, not yet run) [US5] Build the pages with the impeccable workflow in the Brief Bar world:
  `web/src/app/(site)/[locale]/login/page.tsx` (number and channel), `login/code/page.tsx` (code
  cells with `autocomplete="one-time-code"`, countdown island, role rows), `login/email/page.tsx`
  (today's `LoginForm`), `register/page.tsx` (join as a creator), and "Add your mobile number" on the
  account page. Components in `web/src/modules/auth/components/`; delete `RegisterForm.tsx`. Strings
  in `web/messages/{en,ar}.json`. Make T077 and T078 pass.
- [x] T083 [US5] Change `users.access.create` to `isAdmin` in `Users.ts` (research R18) and update
  the access tests in `web/tests/integration/auth.int.test.ts`.
- [x] T084 [US5] Update 001's tests that assumed email registration: `web/tests/e2e/us4-auth.spec.ts`,
  `web/tests/integration/auth.int.test.ts` and `actions.int.test.ts` (registration cases move to the
  code flow or are deleted; email login and lockout stay). `pnpm check:scenarios` must still pass
  for 001's table.
- [ ] T085 [US5] Run Lighthouse CI on `/login`, `/login/code` and `/register` in both themes (score ≥
  90, auth-page JS within budget) and the RTL Playwright suite; fix regressions.
- [ ] T086 [US5] Run the impeccable detector and finish review on the website's sign-in pages at 360,
  768, 1024 and 1440 px, English and Arabic, light and dark, until it returns `ship`.

**Checkpoint**: OT-US5-S1 to S6 pass; the website no longer creates email accounts.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T087 (app part done 2026-11-12: `.claude/skills/flutter-mobile/SKILL.md` and `references/widget-catalogue.md`; the mobile-api-contract skill is the web side's) [P] Update `.claude/skills/mobile-api-contract/SKILL.md` and
  `references/endpoints.md` (paths `auth/otp/request`, `auth/otp/verify`, `auth/refresh`,
  `auth/logout`, `me`; refresh ahead of expiry rather than on 401), and
  `.claude/skills/flutter-mobile/SKILL.md` (the interceptor rule, `ChoiceRowGroup`, `CheckLine`,
  `InlineError`, `url_launcher` in the package table).
- [x] T088 [P] Update `.claude/skills/payload-cms/SKILL.md` (`loginWithUsername`, the `username`
  override, `otp-challenges`, the mirrored session helper and its tripwire) and `CLAUDE.md` (the
  feature 009 line, test-id prefix `OT-`).
- [ ] T089 (app part done 2026-11-12: `mobile/README.md`; `web/README.md` is the web side's) [P] Update `mobile/README.md` (session and secure storage, sign-in feature, debug outbox
  workflow with `otp:last`) and `web/README.md` (OTP environment, console provider, the vendor).
- [x] T090 (proposal in `specs/009-otp-sign-in/constitution-amendment-proposal.md`; the owner opens the separate PR) Prepare the constitution amendment proposal for Principle VII (research R3: native apps
  keep the CMS token in the platform secure store as a Bearer header) as a separate pull request for
  the owner; do not merge it with this feature. Let the owner choose PATCH (wording) or MINOR
  (expanded guidance), and include the note the Governance section requires for Principle VII
  amendments on how existing code complies (the website keeps the cookie; the app's Bearer path is
  this feature).
- [ ] T091 Run the impeccable finish review on screens 20–23 with the four variant goldens and the
  review images, and the iOS by-eye comparison in the simulator, until it returns `ship`; record the
  new widgets in `DESIGN.md` with the documenter.
- [ ] T092 With the vendor configured in a staging environment (`staging.` host) and a real UAE SIM:
  SMS and WhatsApp delivery in English and Arabic, the sender name, the domain-bound autofill on iOS
  and Android (quickstart manual check 9). Record delivery times for SC-002.
- [ ] T093 Run the full quickstart: the automated checks, `pnpm check:scenarios`, and manual checks
  1–16. Time manual checks 1–3 from the account icon to signed in (SC-001, under 45 s with the code
  arriving within 10 s). Tick SC-001 and SC-003 to SC-008; SC-002 is measured over the first month
  from T092's delivery reports.

---

## Dependencies & Execution Order

- **Setup** (T001–T006): no dependencies. T002–T006 run in parallel. T006 is an owner task that
  runs alongside everything until T051.
- **Foundational** (T007–T033): after Setup. It blocks every story. T021 (migration) needs T019 and
  T020; T023 needs T019 and T021; T025 needs T021.
- **US1** (T034–T050): after Foundational. It is the MVP.
- **US2** (T051–T057): after US1 (it hardens US1's commands). T051 and T056 wait for T006.
- **US3** (T058–T066): after Foundational; T062 can run alongside US1's server tasks; the app part
  needs T046 (sign-in flow) for the guard's return path.
- **US4** (T067–T075): after US1 (it extends `verify-code.ts`, the cubit and the code page).
- **US5** (T076–T086): after US1 and US3 (commands, logout). T079 comes before T080–T084.
- **Polish** (T087–T093): last. T092 needs T056.

## Parallel examples

- **Foundational**: T007–T013 together (tests). Then T018, T019 and T024 together; T027–T033 (app)
  alongside the server tasks.
- **US1**: T034–T040 together. Then T044 and T045 alongside T041–T043.
- **US3**: T058–T061 together.
- **US4**: T067–T070 together.
- **US5**: T076–T078 together.

## Implementation strategy

1. **MVP**: Setup, Foundational, then US1. A person signs in in the app with the console provider,
   and screens 20–22 match their boards. Show the owner.
2. US2 and US3 make it safe to ship: limits, logs, editors, the vendor; a lasting, revocable session
   and account guards. Feature 012 can start on screens 10–11 once US1 and US3 are done.
3. US4 opens the creator path.
4. US5 switches the website when the app is live.

## Requirement coverage

Every functional requirement and success criterion of spec.md, and the tasks that build or prove
it. Requirements whose entry point another feature builds say so.

| Requirement | Tasks |
|---|---|
| FR-001 UAE mobile numbers only, one normalised form | T007, T014, T037, T047 |
| FR-002 six digits, 5 minutes, single use, 5 attempts | T007, T009, T014, T018, T023, T034 |
| FR-003 a new code voids earlier ones; 60 s cooldown | T007, T023, T030, T034, T041 |
| FR-004 SMS or WhatsApp per code, SMS first, switch on resend | T036, T037, T046, T047, T048 |
| FR-005 keyed fingerprints only; constant-time comparison | T009, T018, T023, T052 |
| FR-010 one flow signs in or creates the account | T034, T042, T043 |
| FR-011 client by default; creator with 1–4 professions; legal acceptances | T034, T042, T067, T071 |
| FR-012 choices ignored for an existing account | T034, T042, T067, T071 |
| FR-013 only a code-verified number finds an account | T012, T034, T042 |
| FR-014 optional name, saved on first creation | T008, T015, T034, T042 |
| FR-015 admins and editors cannot use codes; email lockout kept | T052, T054, T076 |
| FR-016 code accounts unreachable by password; failures never block codes | T012, T020 |
| FR-017 the sign-in number set only by a verified code | T012, T020, T021 |
| FR-020 a 7-day session and its end time | T013, T025, T034, T043 |
| FR-021 renewal for 7 days, by the app under 2 days left | T058, T060, T062, T064 |
| FR-022 sign-out ends the server session | T013, T058, T062, T076, T081 |
| FR-023 secure storage only, first-launch wipe, forget on refusal | T027, T028, T059, T060, T063, T064 |
| FR-024 code sessions recognised like email sessions | T013, T025 |
| FR-025 the member reads their own account; only admins read others' numbers | T012, T058, T062 |
| FR-030 limits per number, address and install; wait time on refusal | T022 (008 T094), T041, T052, T054 |
| FR-031 identical answers; generic codes | T052, T054 |
| FR-032 no number or code in logs, error reports or analytics | T011, T052, T053, T054, T057 |
| FR-033 creators and public answers never include a client's number | T012, T020, T055 |
| FR-034 expired and used code records deleted within 24 hours | T026 |
| FR-040 replaceable provider; development provider refused in production | T010, T011, T017, T024 |
| FR-041 one real UAE SMS and WhatsApp vendor, owner-approved | T006, T051, T056, T092 |
| FR-042 SMS in the person's language, formatted for autofill | T016, T034, T092 |
| FR-050 screens 20–23 to their boards, four variants, fidelity check | T040, T044, T045, T047, T048, T050, T070, T072, T073, T074, T091 |
| FR-051 the standalone sign-in from the header icon; the only place for the role question and Join | T048, T049, T073. The header account icon and the menu's "Join as a creator" entry are wired by feature 010 (research R15) |
| FR-052 professions from the active personas only | T037, T048, T068, T073, T075 |
| FR-053 one-time-code autofill on iOS and Android | T038, T044, T077, T082, T092 |
| FR-054 account pages need a session and return afterwards | T061, T065 |
| FR-055 "Editor? Sign in with email" opens the website | T037, T047 |
| FR-056 request, verify and session services reusable by 012 | T015, T030, T031, T042. Screens 10–11 themselves are feature 012 |
| FR-060 website log-in by code with the HTTP-only cookie | T076, T077, T081, T082 |
| FR-061 email sign-in kept for editors; email registration stops | T076, T081, T082, T083, T084 |
| FR-062 website logout ends the server session | T076, T081 |
| FR-063 an email member attaches a number by code | T076, T080, T081, T082 |
| SC-001 a returning member signs in under 45 s | T093 (timed manual checks 1–3) |
| SC-002 95 % of real codes arrive within 15 s | T092 (staging delivery times); measured over the first month after launch, outside the task list |
| SC-003 no number or code in logs across the suite | T052, T053, T093 |
| SC-004 identical answers with and without an account | T052 |
| SC-005 at most 25 guesses per number per hour | T007, T034, T052 |
| SC-006 screens 20–23 pass the fidelity check in four variants | T040, T050, T070, T074 |
| SC-007 a weekly user is never asked for a code again | T058, T060, T064 |
| SC-008 every scenario has a test named with its id | T003, T093 |

Task count: 93 (T001–T093). T022 is now a confirmation of 008's T094 and changes no code.
