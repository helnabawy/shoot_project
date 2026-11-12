# Tasks: Mobile creators

**Input**: `specs/011-mobile-creators/` (spec, plan, research, data-model, contracts/routes.md)

Paths are under `apps/mobile/` unless they start with `specs/`. Tests come first in every phase; a
test is named with its scenario id (`MC-US1-S1 ...`). `[P]` = different files, no dependency.

## Phase 1: Setup

- [x] T001 Add `share_plus: 12.0.2` to `pubspec.yaml` and a row to the package table in `README.md`; run `flutter pub get`
- [x] T002 [P] Add the `mc*` ARB block (both languages, descriptions in English) to `lib/core/l10n/arb/app_en.arb` and `app_ar.arb`, regenerate l10n
- [x] T003 [P] `ShareLink` port (`typedef ShareLink = Future<void> Function(Uri)`, default over `share_plus`) in `lib/core/web/share_link.dart` (the share call is exercised through a fake in the profile and route tests; the system sheet is a manual check)

## Phase 2: Foundational

- [x] T004 Domain use cases (tested through the cubit tests) in `lib/features/creators/domain/usecases/` (`get_creators`, `get_profile`, `get_specialty`, `get_hire_page`, plus `get_site_info` and `get_brief_builder` reads through the site repository), tests in `test/features/creators/domain/usecases/`
- [x] T005 [P] Shared widgets in `lib/features/creators/presentation/widgets/`: `creator_row.dart` (board `.row` with `.photo`, name, code, places; used by 18 and 19), `filter_chips.dart` (`.chips` over `ShootChip`, with the dashed "More"), `faq_list.dart`, `sample_tile.dart`; widget tests in `test/features/creators/presentation/widgets/`
- [x] T006 Failure-to-screen helper: a page body switching `NotFoundFailure` to `NotFoundPage` and other failures to `ErrorPage` in `lib/features/creators/presentation/widgets/failure_view.dart` with test
- [x] T007 Route table and wiring: `lib/features/creators/presentation/creators_routes.dart` (`creatorsRoutes(...)`), flip the five rows to `built: true` in `lib/core/routing/app_routes.dart`, one `...creatorsRoutes(...)` line in `lib/app.dart`, register cubits and use cases in `lib/features/creators/creators_injection.dart`; test in `test/features/creators/presentation/creators_routes_test.dart` (`MC-US1-S3`, `MC-US4-S6` not-found paths, lower-case code in a link)

## Phase 3: User Story 1 - See a creator's profile (P1)

**Independent test**: open `/creators/{code}` with a fake repository: every section shows in both languages; 404 shows screen 37.

- [x] T008 [P] [US1] Cubit test `MC-US1-S1`, `MC-US1-S3` in `test/features/creators/presentation/cubit/profile_cubit_test.dart`
- [x] T009 [P] [US1] Widget tests `MC-US1-S1`, `S2`, `S4`..`S8` in `test/features/creators/presentation/pages/profile_page_test.dart` (no verified mark, no samples state, WhatsApp URL with the code, share URL per language, viewer swipe, video opens outside, Arabic RTL, bio fallback)
- [x] T010 [US1] `ProfileCubit` and sealed state in `presentation/cubit/profile_cubit.dart`
- [x] T011 [US1] `ProfilePage` + `ProfileView` (board S06: header with back/wordmark/share, panel with photo or scene tile "No photo yet", name, code, facts, `TopHit` "Book with {first}", actions, about, bio, work grid) in `presentation/pages/profile_page.dart`
- [x] T012 [US1] `SampleViewer` full-screen `PageView` in `presentation/pages/sample_viewer.dart`
- [x] T013 [US1] WhatsApp message builder (`mcAskMessage` with the code) and link opening in `domain/whatsapp_link.dart` with test

## Phase 4: User Story 2 - Book this creator (P1)

**Independent test**: from a seeded profile, answer the brief and continue: WhatsApp opens with the composed message naming the creator.

- [x] T014 [P] [US2] Pure brief rules tests (`restrict`, `applyPreset`, `nextOpenSlot`, `isComplete`, `message` equal to the web's `renderBriefMessage` cases) in `test/features/creators/domain/brief/brief_rules_test.dart`
- [x] T015 [P] [US2] `BriefCubit` tests `MC-US2-S1`, `S2`, `S4`, `S5` in `test/features/creators/presentation/cubit/brief_cubit_test.dart`
- [x] T016 [P] [US2] Widget tests `MC-US2-S1`..`S6` in `test/features/creators/presentation/pages/book_page_test.dart`
- [x] T017 [US2] Brief rules in `domain/brief/brief_rules.dart` (sentence parts, restrictions, completeness, WhatsApp message with creator line)
- [x] T018 [US2] `BriefCubit` in `presentation/cubit/brief_cubit.dart` with the `BriefSubmit` port
- [x] T019 [US2] `BriefBar` widget (board `.bar`: sentence tokens, options list) in `presentation/widgets/brief_bar.dart`
- [x] T020 [US2] `BookPage` (board S06b) in `presentation/pages/book_page.dart`; "Change" goes to `/creators` with answers kept in the cubit

## Phase 5: User Story 3 - Browse the directory (P2)

**Independent test**: filter by type and emirate: only matching cards and the right count; a card opens its profile; the primary action goes to `/`.

- [x] T021 [P] [US3] Cubit tests `MC-US3-S1`..`S5` in `test/features/creators/presentation/cubit/directory_cubit_test.dart` (filters, append page, count line data, empty)
- [x] T022 [P] [US3] Widget tests `MC-US3-S1`..`S6` in `test/features/creators/presentation/pages/directory_page_test.dart` (one link semantics label, filters kept on back)
- [x] T023 [US3] `DirectoryCubit` in `presentation/cubit/directory_cubit.dart`
- [x] T024 [US3] `CreatorDirectoryCard` (board `.card`, gallery from photo and scene tiles, who, facts, foot) in `presentation/widgets/creator_directory_card.dart`
- [x] T025 [US3] `DirectoryPage` (board S05) in `presentation/pages/directory_page.dart`, provided by the `/creators` shell route

## Phase 6: User Story 4 - Work by specialty (P2)

**Independent test**: `/work/weddings` shows counts, creators, samples; an emirate chip narrows all three.

- [x] T026 [P] [US4] Cubit tests `MC-US4-S1`..`S3`, `S5` in `test/features/creators/presentation/cubit/specialty_cubit_test.dart`
- [x] T027 [P] [US4] Widget tests `MC-US4-S1`..`S6` in `test/features/creators/presentation/pages/specialty_page_test.dart`
- [x] T028 [US4] `SpecialtyCubit` in `presentation/cubit/specialty_cubit.dart`
- [x] T029 [US4] `SpecialtyPage` (board S05b) in `presentation/pages/specialty_page.dart`

## Phase 7: User Story 5 - Hire pages (P3)

**Independent test**: preset brief filled, change a word, "See who's free" composes the message; questions expand.

- [x] T030 [P] [US5] Cubit tests `MC-US5-S1`, `S2`, `S5` in `test/features/creators/presentation/cubit/hire_cubit_test.dart`
- [x] T031 [P] [US5] Widget tests `MC-US5-S1`..`S6` in `test/features/creators/presentation/pages/hire_page_test.dart`
- [x] T032 [US5] `HireCubit` in `presentation/cubit/hire_cubit.dart` (presets into `BriefCubit`, redirect path)
- [x] T033 [US5] `HirePage` (board S05c) in `presentation/pages/hire_page.dart`

## Phase 8: Polish

- [x] T034 [P] Screen golden tests 15..19, four variants plus self baselines in `test/goldens/screens/15_19_creators_golden_test.dart` (own baselines for the sample viewer, empty directory, no samples are not added)
- [ ] T035 `tool/goldens.sh --update` is done (app goldens and baselines committed); `pnpm fidelity` for 15..19 is NOT run (no node_modules in this worktree), thresholds not recorded, `shipped.json` not updated
- [x] T036 `node scripts/check-scenario-tests.mjs specs/011-mobile-creators/quickstart.md` passes; MC-US2-S3 (free days) has no test: the API has no availability read (research R2)
- [x] T037 `dart format --set-exit-if-changed lib test`, `flutter analyze`, `flutter test --coverage` (80 % of changed lines: coverage run, per-line check not run)
- [ ] T038 Device walkthrough at 360 px, English and Arabic, light and dark, text scale 2, VoiceOver and TalkBack (manual)
- [x] T039 Code review for constants: no profession, specialty, place or price written in `lib/features/creators/` (SC-006)

## Dependencies

Phase 1 then 2 then stories. US2 reuses US1's profile reads; US5 reuses US2's brief. US3 and US4
are independent of US2. Phase 8 last. Open items needing the owner: R1 (price) and R2 (verified,
availability note, availability days) in research.md.
