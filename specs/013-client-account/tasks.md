# Tasks: Mobile client account (013, test-id prefix MK-)

Format: `- [ ] Tnnn [P] [USn] description with path`. Tests come first in every phase. A box is ticked only
when verified by a passing check. Server paths are relative to the repo root.

## Phase 1: Setup

- [ ] T001 Confirm Node 24, install dependencies (`pnpm install`), `flutter pub get` in `apps/mobile`, start PostgreSQL for integration tests.

## Phase 2: Foundational (contract, schema, shared app plumbing)

- [ ] T002 [P] Domain tests first: `packages/domain/src/account/up-next.test.ts`, `status.test.ts`, `finish.test.ts` (MK-US1-S2, S3, S4, MK-US2-S1, MK-US3-S1, S2, S8).
- [ ] T003 [P] Domain rules: `packages/domain/src/account/{status,up-next,finish,index}.ts` (status key from state and assignments; Up next order quote, delivery, payment, declined; upcoming/past by `dubaiToday`; finish checklist of 4 items, `autoOpen`). 100 % coverage.
- [ ] T004 Wire shapes `packages/domain/src/api/v1/account.ts` (`bookingSummaryV1`, `briefSummaryV1`, `upNextV1`, `accountHomeV1`, `bookingListV1`, `briefListV1`, `meUpdateV1`), problem codes `account.errors.emailInvalid|emailInUse|nameLength` in `problems.ts`, endpoints `meAccount|meBookings|meBriefs|meUpdate` in `endpoints.ts`, examples in `examples/`, snapshot regenerated.
- [ ] T005 Schema: `users.accountFinishDismissedAt` (server-written) in `apps/web/src/modules/auth/collections/Users.ts`, `site-settings.accountAbout` (localized, max 4) in `SiteSettings.ts`, migration `pnpm --filter web payload migrate:create account_finish`, `generate:types`, seed default lines.
- [ ] T006 [P] Dart: problem codes in `core/l10n/failure_message.dart` + ARB messages, decoder rows for the new examples in `apps/mobile/test/helpers/api_decoders.dart`.
- [ ] T007 Dart plumbing: ARB keys (en, ar), `features/account/account_injection.dart`, one line in `core/di/injection.dart`.

## Phase 3: US1 My account (P1) - screen 24

- [ ] T008 [P] [US1] Server tests: `apps/web/src/modules/account/wire.test.ts` and integration `account.integration.test.ts` for `GET me/account` (MK-US1-S1..S5, S7; another member's data never returned, MK-US2-S6 isolation).
- [ ] T009 [US1] Server: `modules/account/{commands/read-account.ts,wire.ts,api.ts,index.ts}`, route `app/(payload)/api/mobile/v1/me/account/route.ts`.
- [ ] T010 [P] [US1] App tests: model decode, repository (Ok/Err), `AccountHomeCubit` (loading, loaded, failure, refresh), `account_home_page_test.dart` (MK-US1-S1..S5), `/account` redirects (S6, S7).
- [ ] T011 [US1] App: entities, models, remote data source, repository, `GetAccountHome`, `AccountHomeCubit`, `AccountHomePage` (header, Up next card, In your account rows, briefs, Start a brief, Log out) in `features/account/`.
- [ ] T012 [US1] Routes: `account_routes.dart` (`/account`, `/account/finish`, `/account/bookings`, `/account/bookings/:ref` stub), `app.dart` registration, flip `built` in `app_routes.dart`.

## Phase 4: US2 Your bookings (P1) - screen 26

- [ ] T013 [P] [US2] Server tests: list split, paging, isolation (MK-US2-S1, S5, S6) in `account.integration.test.ts`.
- [ ] T014 [US2] Server: `commands/list-bookings.ts`, `commands/list-briefs.ts`, routes `me/bookings`, `me/briefs`.
- [ ] T015 [P] [US2] App tests: `BookingsCubit` (tabs, paging, refresh), `bookings_page_test.dart` (MK-US2-S1..S6).
- [ ] T016 [US2] App: `BookingsCubit`, `BookingsPage` (tabs Bookings, Briefs, Settings; Upcoming/Past; badges; empty state; Start a new brief), Settings tab shares the details rows with 25.

## Phase 5: US3 Finish your account (P2) - screen 25

- [ ] T017 [P] [US3] Server tests: `PATCH me` (name, email valid, invalid, in use, `finishShown` once) MK-US3-S3..S6.
- [ ] T018 [US3] Server: `commands/update-me.ts`, `PATCH` on `me/route.ts`.
- [ ] T019 [P] [US3] App tests: `FinishCubit` (progress, primary action, invalid email, saved, all done, shown-once call), `finish_page_test.dart` (MK-US3-S1..S8).
- [ ] T020 [US3] App: `FinishCubit`, `FinishPage` (progress bar, checklist, per-item actions, Later), language/theme item opens the Appearance sheet (006), auto-open on first `/account` visit.

## Phase 6: US4 Log out and leave (P3)

- [ ] T021 [P] [US4] App tests: log out signs out and opens landing, no personal data left (MK-US4-S1, S2).
- [ ] T022 [US4] App: Log out action wired to `SessionCubit` and router; cubits dropped on sign-out.
- [ ] T023 [US4] Account removal (FR-031, MK-US4-S3): BLOCKED, needs the owner decision recorded in research.md R7.

## Phase 7: Polish

- [ ] T024 [P] Goldens for 24, 25, 26 in four variants and app baselines (`tool/goldens.sh`), fidelity vs canvas.
- [ ] T025 [P] Accessibility: 44 px targets, semantics labels, largest text, reduced motion on the progress bar (FR-044, FR-045).
- [ ] T026 `pnpm check:scenarios`, `dart format`, `flutter analyze`, `flutter test`, `pnpm typecheck && pnpm test`.
- [ ] T027 Manual walkthrough on device/simulator in en/ar and light/dark.

## Dependencies

Phase 2 blocks all. US1 and US2 share only the foundation; US3 needs T017/T018 server first; US4 needs T011. Parallel:
T002/T003 with T006; server and app halves of each story after T004.
