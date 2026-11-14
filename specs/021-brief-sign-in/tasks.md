# Tasks: Sign in to send a brief (021)

**Input**: `specs/021-brief-sign-in/` (spec, plan, research, data-model, contracts, quickstart)

**Tests**: required (Principle III); each test is named with its `BS-` id and written before the code it proves.

Format: `[ID] [P?] [Story] Description` — `[P]` can run in parallel (different files, no open dependency).

## Phase 1: Setup and governance

- [ ] T001 Amend the constitution to 1.5.0 (Principle IX: building needs no account, sending may require sign-in, the brief is kept) with a Sync Impact Report in `.specify/memory/constitution.md`; update `PRODUCT.md` principle 1 and the CLAUDE.md non-negotiables line
- [ ] T002 Add `specs/021-brief-sign-in/quickstart.md` to `check:scenarios` in the root `package.json`

## Phase 2: Foundational (blocks every story)

- [ ] T003 [P] Tests first: `packages/domain/src/brief/kept.test.ts` (BS-US3-S1, BS-US3-S3): encode/decode round trip, field filter (only slot tokens, `__custom`, `creator`, `pick`), size and entry limits, version, freshness at 59 and 61 minutes, garbage input
- [ ] T004 Implement `packages/domain/src/brief/kept.ts` (no zod, browser-safe) and export it from the brief barrel; 100 % coverage
- [ ] T005 Add the `briefNeedsSignIn` checkbox (default on) to `apps/web/src/modules/site-settings/globals/SiteSettings.ts`, regenerate `payload-types.ts`, create the migration `brief_sign_in`
- [ ] T006 [P] Add message keys (contracts/web-flow.md) to `apps/web/messages/en.json` and `ar.json`; add `brief.errors.signInRequired` to `packages/domain/src/api/v1/problems.ts`
- [ ] T007 Test worlds that test later steps turn the switch off in setup (`tests/integration/setup/booking.ts`, `setup/creators.ts` brief helpers, the inbox tests, `actions.int.test.ts` brief cases that are not about the gate) (research R9)

## Phase 3: User Story 1 + 3 — the website round trip, the brief never lost (P1)

- [ ] T008 Tests first: `apps/web/tests/integration/brief-sign-in.int.test.ts` — BS-US1-S1 (action returns `signIn`, cookie written, nothing recorded), BS-US1-S4, BS-US1-S5 (no-JS redirect), BS-US1-S2 and BS-US1-S3 (`GET /brief/send` records for the member with creator, pick, source; match / details / WhatsApp), BS-US3-S2 (invalid now → error in cookie, redirect to path), BS-US3-S3 (stale → `/account`), BS-US3-S4 (cookie cleared), BS-US5-S1 (member records at once), BS-US5-S3 (switch off), BS-US5-S4 (guest never records)
- [ ] T009 Extract the recording core of `submitBrief` into `apps/web/src/modules/brief/commands/send-brief.ts` (shared by the action and the route; behaviour unchanged for members)
- [ ] T010 `apps/web/src/modules/brief/kept-cookie.ts` (server read/write/clear of `shoot-brief`) and the guest branch in `apps/web/src/modules/brief/actions.ts` (`BriefState` `signIn`)
- [ ] T011 `apps/web/src/modules/brief/send-route.ts` and `apps/web/src/app/(site)/[locale]/brief/send/route.ts`
- [ ] T012 Tests first: `apps/web/src/modules/brief/components/BriefBuilder.signin.test.tsx` — BS-US1-S1 (navigates to `loginUrl`), BS-US3-S1 (restores answers for the same path/locale/creator, not for another), BS-US3-S2 (shows the kept error), BS-US3-S4 (no cookie → empty), BS-US5-S2 (guest line only for guests; WhatsApp row stays)
- [ ] T013 `BriefBuilder.tsx`: `signInRequired` prop, `signIn` state navigation, restore from the kept brief, the guest line; `useSignedIn()` in `apps/web/src/shared/components/SessionNav.tsx`; pass `signInRequired` and the new labels from `Hero.tsx`, `book/[code]/page.tsx`, `hire/[slug]/page.tsx` / `IntentView.tsx`, `modules/brief/labels.ts`
- [ ] T014 Tests first: `apps/web/src/modules/auth/components/KeptBrief.test.tsx` (BS-US1-S1: heading, sentence, change link) and `forms.brief.test.tsx` (BS-US2-S1, BS-US2-S2: no role rows with the brief intent; role rows otherwise)
- [ ] T015 `/login?for=brief` brief mode in `apps/web/src/app/(site)/[locale]/login/page.tsx` with `modules/auth/components/KeptBrief.tsx`; `PhoneStep` posts `intent`

## Phase 4: User Story 2 — a new number registers on the way (P1)

- [ ] T016 Tests first in `brief-sign-in.int.test.ts`: BS-US2-S1 (`requestCodeAction` stores `intent: 'brief'`; `verifyCodeAction` creates a client for a new number and redirects to `/brief/send`), BS-US2-S2 (without the intent a new number still gets `needsRole`)
- [ ] T017 `intent` in `apps/web/src/modules/auth/pending.ts`, `actions.ts` and `CodeStep.tsx` (no `askRole`, seeker signup)

## Phase 5: User Story 5 — the API and the switch (P2)

- [ ] T018 Tests first: `apps/web/tests/integration/mobile-api-brief.int.test.ts` — BS-US5-S4 (401 `brief.errors.signInRequired`, nothing recorded), BS-US5-S3 (switch off: guest records), member records with `member` set, `GET brief-builder` carries `signInRequired`
- [ ] T019 `recordBrief` gate in `apps/web/src/modules/brief/commands/record-brief.ts`; `signInRequired` in `packages/domain/src/api/v1/site.ts`, `modules/brief/wire.ts` / `api.ts`, the `brief-builder` example; regenerate `specs/contracts/mobile-api/v1.schema.json`

## Phase 6: User Story 4 — the app (P1)

- [ ] T020 Tests first: `apps/mobile/test/features/site/data/brief_builder_sign_in_test.dart` (decodes `signInRequired`, missing → false) and `test/features/brief/presentation/brief_cubit_sign_in_test.dart` (BS-US4-S1, S2, S4, S5, BS-US5-S3, a 401 answer becomes sign-in)
- [ ] T021 `signInRequired` in the brief builder entity and model; `BriefCubit` `signInNeeded`, `awaitingSignIn`, `signInAbandoned`, send on sign-in; wiring in `brief_injection.dart`; `ProblemCode.briefSignInRequired`
- [ ] T022 Tests first: `test/features/sign_in/presentation/sign_in_flow_brief_test.dart` (BS-US4-S3) and `test/features/landing/presentation/landing_sign_in_test.dart` (BS-US4-S1, S2, S4), `test/features/brief/presentation/brief_bar_sign_in_test.dart` (BS-US5-S2)
- [ ] T023 Sign-in `?for=brief`: the line on the number screen, `withNext` keeps `for`, `SignInFlowCubit.forBrief` signs up a client; the landing opens sign-in, handles a late receipt, abandons on return; the guest line in the brief bar; ARB strings (en, ar)

## Phase 7: Polish and cross-cutting

- [ ] T024 [P] Default content: trust chip and "Why book this way" item no longer promise "No account needed" (`apps/web/src/shared/payload/seed/content.ts`)
- [ ] T025 [P] E2E `apps/web/tests/e2e/bs-brief-sign-in.spec.ts` (BS-US1-S1, BS-US1-S2) with the console outbox; existing brief e2e helpers sign in when sent to `/login?for=brief`
- [ ] T026 Impeccable: detector on the changed UI, finish review of the login brief mode and the guest line; verify 360/768/1024/1440, EN/AR, light/dark in the browser
- [ ] T027 Docs: CLAUDE.md feature entry, `specs/ROADMAP.md` row, 010 FR-018 and 001 note "superseded by 021"
- [ ] T028 Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm check:scenarios`, and in `apps/mobile` `dart format`, `flutter analyze`, `flutter test`
- [ ] T029 Owner gates (open): confirm the Clarifications answers; edit the live CMS copy that says "No account needed"; device walkthrough of the app flow (iPhone, Android)

## Dependencies

- T001–T002 first; T003–T007 block all stories.
- US1+US3 (T008–T015) before US2 (T016–T017, same files in auth).
- US5 (T018–T019) before US4 (T020–T023: the app reads `signInRequired`).
- Polish after the stories.
