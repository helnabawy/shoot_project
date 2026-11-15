# Tasks: Sign in to send a brief (021)

**Input**: `specs/021-brief-sign-in/` (spec, plan, research, data-model, contracts, quickstart)

**Tests**: required (Principle III); each test is named with its `BS-` id and written before the code it proves.

Format: `[ID] [P?] [Story] Description` — `[P]` can run in parallel (different files, no open dependency).

## Phase 1: Setup and governance

- [x] T001 Amend the constitution to 1.5.0 (Principle IX: building needs no account, sending may require sign-in, the brief is kept) with a Sync Impact Report in `.specify/memory/constitution.md`; update `PRODUCT.md` principle 1 and the CLAUDE.md non-negotiables line
- [x] T002 Add `specs/021-brief-sign-in/quickstart.md` to `check:scenarios` in the root `package.json`

## Phase 2: Foundational (blocks every story)

- [x] T003 [P] Tests first: `packages/domain/src/brief/kept.test.ts` (BS-US3-S1, BS-US3-S3): encode/decode round trip, field filter (only slot tokens, `__custom`, `creator`, `pick`), size and entry limits, version, freshness at 59 and 61 minutes, garbage input
- [x] T004 Implement `packages/domain/src/brief/kept.ts` (no zod, browser-safe) and export it from the brief barrel; 100 % coverage
- [x] T005 Add the `briefNeedsSignIn` checkbox (default on) to `apps/web/src/modules/site-settings/globals/SiteSettings.ts`, regenerate `payload-types.ts`, create the migration `brief_sign_in`
- [x] T006 [P] Add message keys (contracts/web-flow.md) to `apps/web/messages/en.json` and `ar.json`; add `brief.errors.signInRequired` to `packages/domain/src/api/v1/problems.ts`
- [x] T007 Test worlds that test later steps turn the switch off in setup (`tests/integration/setup/booking.ts`, `setup/creators.ts` brief helpers, the inbox tests, `actions.int.test.ts` brief cases that are not about the gate) (research R9)

## Phase 3: User Story 1 + 3 — the website round trip, the brief never lost (P1)

- [x] T008 Tests first: `apps/web/tests/integration/brief-sign-in.int.test.ts` — BS-US1-S1 (action returns `signIn`, cookie written, nothing recorded), BS-US1-S4, BS-US1-S5 (no-JS redirect), BS-US1-S2 and BS-US1-S3 (`GET /brief/send` records for the member with creator, pick, source; match / details / WhatsApp), BS-US3-S2 (invalid now → error in cookie, redirect to path), BS-US3-S3 (stale → `/account`), BS-US3-S4 (cookie cleared), BS-US5-S1 (member records at once), BS-US5-S3 (switch off), BS-US5-S4 (guest never records)
- [x] T009 Extract the recording core of `submitBrief` into `apps/web/src/modules/brief/commands/send-brief.ts` (shared by the action and the route; behaviour unchanged for members)
- [x] T010 `apps/web/src/modules/brief/kept-cookie.ts` (server read/write/clear of `shoot-brief`) and the guest branch in `apps/web/src/modules/brief/actions.ts` (`BriefState` `signIn`)
- [x] T011 `apps/web/src/modules/brief/send-route.ts` and `apps/web/src/app/(site)/[locale]/brief/send/route.ts`
- [x] T012 Tests first: `apps/web/src/modules/brief/components/BriefBuilder.signin.test.tsx` — BS-US1-S1 (navigates to `loginUrl`), BS-US3-S1 (restores answers for the same path/locale/creator, not for another), BS-US3-S2 (shows the kept error), BS-US3-S4 (no cookie → empty), BS-US5-S2 (guest line only for guests; WhatsApp row stays)
- [x] T013 `BriefBuilder.tsx`: `signInRequired` prop, `signIn` state navigation, restore from the kept brief, the guest line; `useSignedIn()` in `apps/web/src/shared/components/SessionNav.tsx`; pass `signInRequired` and the new labels from `Hero.tsx`, `book/[code]/page.tsx`, `hire/[slug]/page.tsx` / `IntentView.tsx`, `modules/brief/labels.ts`
- [x] T014 Tests first: `apps/web/src/modules/auth/components/forms.brief.test.tsx` (BS-US1-S1: the kept brief row, its change link, the intent; BS-US2-S1, BS-US2-S2: no role rows with the brief intent, role rows otherwise)
- [x] T015 `/login?for=brief` brief mode in `apps/web/src/app/(site)/[locale]/login/page.tsx` with `modules/auth/components/KeptBrief.tsx`; `PhoneStep` posts `intent`

## Phase 4: User Story 2 — a new number registers on the way (P1)

- [x] T016 Tests first in `brief-sign-in.int.test.ts`: BS-US2-S1 (`requestCodeAction` stores `intent: 'brief'`; `verifyCodeAction` creates a client for a new number and redirects to `/brief/send`), BS-US2-S2 (without the intent a new number still gets `needsRole`)
- [x] T017 `intent` in `apps/web/src/modules/auth/pending.ts`, `actions.ts` and `CodeStep.tsx` (no `askRole`, seeker signup)

## Phase 5: User Story 5 — the API and the switch (P2)

- [x] T018 Tests first: `apps/web/tests/integration/mobile-api-brief.int.test.ts` — BS-US5-S4 (401 `brief.errors.signInRequired`, nothing recorded), BS-US5-S3 (switch off: guest records), member records with `member` set, `GET brief-builder` carries `signInRequired`
- [x] T019 `recordBrief` gate in `apps/web/src/modules/brief/commands/record-brief.ts`; `signInRequired` in `packages/domain/src/api/v1/site.ts`, `modules/brief/wire.ts` / `api.ts`, the `brief-builder` example; regenerate `specs/contracts/mobile-api/v1.schema.json`

## Phase 6: User Story 4 — the app (P1)

- [x] T020 Tests first: `apps/mobile/test/features/site/data/brief_builder_sign_in_test.dart` (decodes `signInRequired`, missing → false) and `test/features/brief/presentation/brief_cubit_sign_in_test.dart` (BS-US4-S1, S2, S4, S5, BS-US5-S3, a 401 answer becomes sign-in)
- [x] T021 `signInRequired` in the brief builder entity and model; `BriefCubit` `signInNeeded`, `awaitingSignIn`, `signInAbandoned`, send on sign-in; wiring in `brief_injection.dart`; `ProblemCode.briefSignInRequired`
- [x] T022 Tests first: `test/features/sign_in/presentation/sign_in_flow_brief_test.dart` (BS-US4-S3) and `test/features/landing/presentation/landing_sign_in_test.dart` (BS-US4-S1, S2, S4), `test/features/brief/presentation/brief_bar_sign_in_test.dart` (BS-US5-S2)
- [x] T023 Sign-in `?for=brief`: the line on the number screen, `withNext` keeps `for`, `SignInFlowCubit.forBrief` signs up a client; the landing opens sign-in, handles a late receipt, abandons on return; the guest line in the brief bar; ARB strings (en, ar)

## Phase 7: Polish and cross-cutting

- [x] T024 [P] Default content: trust chip and "Why book this way" item no longer promise "No account needed" (`apps/web/src/shared/payload/seed/content.ts`)
- [ ] T025 [P] E2E (written; not yet run against a built server) `apps/web/tests/e2e/bs-brief-sign-in.spec.ts` (BS-US1-S1, BS-US1-S2) with the console outbox; existing brief e2e helpers sign in when sent to `/login?for=brief`
- [x] T026 Impeccable: detector on the changed UI, finish review of the login brief mode and the guest line; verify 360/768/1024/1440, EN/AR, light/dark in the browser
- [x] T027 Docs: CLAUDE.md feature entry, `specs/ROADMAP.md` row, 010 FR-018 and 001 note "superseded by 021"
- [x] T028 Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm check:scenarios`, and in `apps/mobile` `dart format`, `flutter analyze`, `flutter test`
- [ ] T029 Owner gates (open): confirm the Clarifications answers; edit the live CMS copy that says "No account needed"; device walkthrough of the app flow (iPhone, Android)

## Amendment 2026-11-15: sign in to accept the quotation (US6–US8)

Owner: *"I meant to list the available creators and ask the user to login before accepting the
quotation in guest mode"* (spec Clarifications, session 2026-11-15).

- [x] T030 Amend spec.md (Clarifications 2026-11-15, US6–US8, FR-018–FR-027, SC-007–SC-008), plan.md, contracts, data-model.md, quickstart.md
- [x] T031 [P] Tests first: `packages/domain/src/booking/claim.test.ts` (BS-US7-S4, BS-US7-S5, BS-US8-S1): no member → signIn; unowned → claim booking (and brief when unowned); own → no claim; another's → otherAccount
- [x] T032 Implement `packages/domain/src/booking/claim.ts` and export it; 100 % coverage
- [x] T033 `briefNeedsSignIn` default false, rule `=== true`, the three pages use the rule; migration `brief_sign_in_off` (default false, live value off); regenerate types
- [x] T034 [P] Problem codes `booking.errors.signInRequired`, `booking.errors.otherAccount` (domain problems, messages en/ar); auth/quote message keys (contracts/web-flow.md)
- [x] T035 Tests first: `apps/web/tests/integration/accept-sign-in.int.test.ts` — BS-US6-S1, BS-US6-S3, BS-US6-S4 (defaults: guest brief → step 2, guest quotation, switch off), BS-US7-S2 (guest accept → login URL, booking unchanged), BS-US7-S3 (code with the accept intent: new number is a client, back on the quotation), BS-US7-S4 (accept claims booking and brief), BS-US7-S5 (another member's booking refused), BS-US7-S6 (member accepts at once), BS-US8-S1 and BS-US8-S4 (API 401 / 409, nothing changed)
- [x] T036 `acceptQuotation` command: sign-in check and claim; website action redirect; API mapping
- [x] T037 Existing accept tests sign in a client first (`booking-transitions`, `booking-match-acceptors`, `inbox-queries`, `mobile-api-creator-account`, `mobile-api-booking`)
- [x] T038 Tests first: `BookingStatus.test.tsx` (BS-US7-S1 guest line, none for members) and `forms.brief.test.tsx` (BS-US7-S3 the accept intent: no role rows, "change number" keeps `for=accept`)
- [x] T039 Guest line on the quotation page; `accept` intent in `pending.ts`, `actions.ts`, `PhoneStep`, `CodeStep`, `/login` (title and intro), `/login/code`
- [x] T040 Tests first (app): `booking_view_cubit_sign_in_test.dart` (BS-US8-S2: 401 → signInNeeded, no error; BS-US8-S4: otherAccount shows its message), `sign_in_flow_accept_test.dart` (BS-US8-S3: `for=accept` signs up a client, no role question), `booking_page_sign_in_test.dart` (BS-US8-S2: opens `/login?next=/q/…&for=accept`), `number_page_accept_test.dart` (BS-US8-S2 line)
- [x] T041 App: `ProblemCode` values and messages, `BookingViewCubit.signInNeeded`, booking page listener, sign-in `for=accept` (state, `withNext`, number screen line), ARB en/ar
- [x] T042 [P] Default content: chip, "Why book this way" item and FAQ say no account to brief; a code when accepting (`seed/content.ts`); regenerate the API snapshot
- [x] T043 Docs: CLAUDE.md 021 entry, ROADMAP row; live CMS copy notes
- [ ] T044 Run `pnpm typecheck && pnpm lint && pnpm test`, the touched integration suites, `pnpm check:scenarios`; in `apps/mobile` `dart format`, `flutter analyze`, `flutter test`, `tool/goldens.sh` for the touched screens
- [ ] T045 Owner gates (open): confirm the 2026-11-15 answers; decide whether the app's number and code (boards 10–11) move from before the quotation to Accept; edit the live hero chip, "Why book this way" item and FAQ; device walkthrough

Dependencies: T030 → T031–T034 → T035–T037 → T038–T039; T034 → T040–T041; T042–T045 last.

## Dependencies

- T001–T002 first; T003–T007 block all stories.
- US1+US3 (T008–T015) before US2 (T016–T017, same files in auth).
- US5 (T018–T019) before US4 (T020–T023: the app reads `signInRequired`).
- Polish after the stories.

## Verification notes (2026-11-15)

- Browser (local `shoot_021` database, console OTP, port 3021): guest brief → `/login?for=brief` with the kept
  sentence → back restores the brief → code (new number, no role question) → step 2 with one brief owned by the
  new client; English and Arabic. Captures in light/dark at 360 and 1440 px reviewed.
- Impeccable: detector advisories only (pre-existing 14 px lines); finish review `fix` → its four fixes applied
  (kept row built from `ResultGroup` + `RowContent`, guest line from first paint, shorter intro, "Log in" verb).
- Tests: domain 924, web unit + component 739, app 1502 pass; 021's integration files pass. The integration
  suite has 15 failures that also fail on the base commit 4a408a9 without this branch (multi-type briefs since
  the seed made the professional step single-choice on 2026-11-12, seed counts, the cron cleanup shape,
  `mobile-api-access` expectations, MW-US2-S4/S8, CP-US2-S2), plus one timing test that flakes under load.
