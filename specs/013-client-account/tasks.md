# Tasks: Mobile client account (013, test-id prefix MK-)

Format: `- [ ] Tnnn [P] [USn] description with path`. Tests come first in every phase. A box is ticked only
when verified by a passing check. Server paths are relative to the repo root.

Notes from implementation: one `AccountCubit` (home, details saves, shown-once mark) serves screens 24, 25 and
the Settings tab of 26, with `BookingsCubit` for the list; the analysis found no gaps, and 008's endpoint
inventory table (`specs/008-mobile-api/contracts/mobile-api.md`) gained four rows because its test requires a row
per registered endpoint.

## Phase 1: Setup

- [x] T001 Confirm Node 24, install dependencies (`pnpm install`), `flutter pub get` in `apps/mobile`, start PostgreSQL for integration tests.

## Phase 2: Foundational (contract, schema, shared app plumbing)

- [x] T002 [P] Domain tests first: `packages/domain/src/account/account.test.ts`, `packages/domain/src/api/v1/account.test.ts` (MK-US1-S2, S3, S4, MK-US2-S1, MK-US3-S1, S2, S3, S4, S8).
- [x] T003 [P] Domain rules: `packages/domain/src/account/{status,up-next,finish,index}.ts` (status key from state and assignments; Up next order quote, delivery, payment, declined; upcoming/past by `dubaiToday`; finish checklist, `autoOpen`). 100 % coverage.
- [x] T004 Wire shapes `packages/domain/src/api/v1/account.ts`, problem codes `account.errors.emailInvalid|emailInUse|nameLength`, endpoints `meAccount|meBookings|meBriefs|meUpdate`, examples, snapshot regenerated, website message keys in `apps/web/messages/{en,ar}.json`.
- [x] T005 Schema: `users.accountFinishDismissedAt`, `site-settings.accountAbout` (localized, max 4), migration `20261112_062929_account_finish`, generated types. (Default seed lines for `accountAbout` not added: the editor fills them in the admin.)
- [x] T006 [P] Dart: problem codes in `core/l10n/failure_message.dart`, ARB messages, decoder rows in `apps/mobile/test/helpers/api_decoders.dart`.
- [x] T007 Dart plumbing: ARB keys (en, ar), `features/account/account_injection.dart`, one line in `core/di/injection.dart`, `apiPatch` in `core/network/api_post.dart`.

## Phase 3: US1 My account (P1) - screen 24

- [x] T008 [P] [US1] Server integration tests `apps/web/tests/integration/mobile-api-account.int.test.ts` (MK-US1-S1, S2, S6, S7; isolation MK-US2-S6).
- [x] T009 [US1] Server: `modules/account/{queries,summary,api,index}.ts`, `commands/read-account.ts`, route `me/account/route.ts`.
- [x] T010 [P] [US1] App tests: models, repository, `AccountCubit`, `account_pages_test.dart` (MK-US1-S1..S7).
- [x] T011 [US1] App: entities, models, data source, repository, use cases, `AccountCubit`, `AccountHomePage`.
- [x] T012 [US1] Routes: `account_routes.dart`, `app.dart` registration, `built` flipped in `app_routes.dart`; `/account/bookings/:ref` stands in until 012.

## Phase 4: US2 Your bookings (P1) - screen 26

- [x] T013 [P] [US2] Server tests: split, paging, isolation (MK-US2-S1, S3, S5, S6) in `mobile-api-account.int.test.ts`.
- [x] T014 [US2] Server: `commands/list.ts`, routes `me/bookings`, `me/briefs`.
- [x] T015 [P] [US2] App tests: `BookingsCubit`, bookings page (MK-US2-S1..S6).
- [x] T016 [US2] App: `BookingsCubit`, `BookingsPage` (tabs, Upcoming/Past, badges, empty state, Start a new brief, Settings tab).

## Phase 5: US3 Finish your account (P2) - screen 25

- [x] T017 [P] [US3] Server tests: `PATCH me` (MK-US3-S3..S6) in `mobile-api-account.int.test.ts`.
- [x] T018 [US3] Server: `commands/update-me.ts`, `PATCH` on `me/route.ts`.
- [x] T019 [P] [US3] App tests: cubit and finish page (MK-US3-S1..S8).
- [x] T020 [US3] App: `FinishPage`, edit sheet, progress, appearance sheet for language and theme, auto-open on the first `/account` visit.

## Phase 6: US4 Log out and leave (P3)

- [x] T021 [P] [US4] App tests: log out signs out and opens the landing, nothing of the client's on screen (MK-US4-S1, S2).
- [x] T022 [US4] App: Log out on 24 and in Settings through `SessionCubit.signOut`; the account cubits live only while an account screen is open.
- [ ] T023 [US4] Account removal (FR-031, MK-US4-S3): BLOCKED, needs the owner decision recorded in research.md R7.

## Phase 7: Polish

- [ ] T024 [P] Goldens for 24, 25, 26 in four variants and app baselines (`tool/goldens.sh`), fidelity vs canvas. Not done: the pixel-diff pipeline was not run here.
- [ ] T025 [P] Accessibility check at the largest text size and with a screen reader (semantics labels and 44 px targets are built; not verified on a device).
- [ ] T026 Final gates: `dart format`, `flutter analyze`, `flutter test`, domain 100 % coverage, `pnpm typecheck` pass; `pnpm check:scenarios` and the ICU placeholder unit test fail on main for reasons outside this feature (002 quickstart rows, `auth.personaCombined`). (2026-11-14: both fixed on main: `pnpm check:scenarios` passes, and the placeholder test in `tests/unit/messages.test.ts` no longer reads plural branch words such as `{Both}` as placeholders.)
- [ ] T027 Manual walkthrough on device/simulator in en/ar and light/dark.

## Dependencies

Phase 2 blocks all. US1 and US2 share only the foundation; US3 needs T017/T018 server first; US4 needs T011. Parallel:
T002/T003 with T006; server and app halves of each story after T004.
