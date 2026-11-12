# Tasks: Mobile first visit and landing

**Input**: `specs/010-first-visit-landing/` (spec, plan, research, data-model, contracts)
**Prefix**: tests are named `ML-US<n>-S<m> ...`. Tests first in every phase. All app paths are under `apps/mobile/`.

## Phase 1: Setup

- [x] T001 Add `landing.motionPaused` to `lib/core/preferences/preferences_store.dart` (`PreferenceKeys`, in `all`); update its test in `test/core/preferences/`.
- [x] T002 [P] Add ARB keys prefixed `ml` (English and Arabic, interface labels only: Skip, Next, Start a brief, step N of 3, Open menu, Close menu, Pause/Play motion, menu labels, messages) to `lib/core/l10n/arb/app_en.arb` and `app_ar.arb`; regenerate with `flutter gen-l10n`.
- [x] T003 [P] Change `firstRunRedirect` in `lib/core/routing/app_router.dart` to `/welcome/0` and flip `built` for `/welcome/:step` and `/menu` in `app_routes.dart` once their pages exist (done in US2/US3); update `test/core/routing/`.

## Phase 2: Foundational (API for recording a brief)

- [x] T004 [P] Failing test `packages/domain/src/api/v1/brief.test.ts`: `briefRecordV1` and `briefReceiptV1` validate the examples; rejects bad date, empty selections.
- [x] T005 Implement `packages/domain/src/api/v1/brief.ts`, examples `examples/brief-record.json`, `brief-receipt.json`, register `briefRecord` in `endpoints.ts`, export from `index.ts`, regenerate `specs/contracts/mobile-api/v1.schema.json`.
- [x] T006 Implement `apps/web/src/modules/brief/commands/record-brief.ts` (validate against `getBriefBuilderConfig`, past date refused in business zone, duplicate window 60 s, allowance, `sourcePath=/app/landing`), `api.ts` `recordBriefV1`, route `apps/web/src/app/(payload)/api/mobile/v1/briefs/route.ts`; unit test for the pure validation. (Verified: the pure validation and problem mapping are unit-tested; the Testcontainers integration test is deferred to post-merge integration run (owner instruction), so end-to-end recording is unverified.)
- [x] T007 [P] Dart wire models and repository: `features/brief/data/` (`BriefRemoteDataSource` POST, `BriefRepositoryImpl`), test with `scripted_adapter` against the shared example JSON.

## Phase 3: User Story 1 - Build a brief (P1)

- [x] T010 [US1] Failing tests `test/features/brief/domain/brief_engine_test.dart` for ML-US1-S1..S7 rules: next unanswered step, option filtering by persona, clearing answers, take-back, past-date refusal (business zone), no pre-fill (default listed first), multi-choice Continue, optional skip.
- [x] T011 [US1] Implement `lib/features/brief/domain/` (`brief_draft.dart`, `brief_engine.dart`, `brief_receipt.dart`, failures, `record_brief.dart` use case).
- [x] T012 [US1] Failing cubit tests `test/features/brief/presentation/brief_cubit_test.dart` (ML-US1-S1..S6, S9): example state, touch ends example, pick advances, incomplete submit opens first unanswered with message, complete submit records, option-gone reopens step, rate limit state.
- [x] T013 [US1] Implement `BriefCubit`/state (singleton, memory only) and `features/brief/brief_injection.dart`.
- [x] T014 [US1] Failing widget tests `test/features/brief/presentation/brief_bar_test.dart` (ML-US1-S1,S2,S3, S8 Arabic RTL).
- [x] T015 [US1] Implement `BriefBar` (search field, step list, printed words, Continue/skip, take-back), writing example via `Ambient`/`WriteIn`, in `lib/features/brief/presentation/`.

## Phase 4: User Story 2 - First visit (P2)

- [x] T020 [US2] Failing tests `test/features/welcome/` (ML-US2-S1..S8): cubit marks seen on skip/finish, deep link never shows, content unavailable skips and leaves unseen, step position semantics, reduced motion.
- [x] T021 [US2] Implement `features/welcome/` (`WelcomeCubit` reading landing howItWorks steps, `SplashView`, `LearnStepPage` with demos from real components, `welcome_routes.dart`, injection).
- [x] T022 [US2] Register welcome routes via `routes:` in `lib/app.dart` (additive) and wire `FirstRunStore`.

## Phase 5: User Story 3 - Menu (P2)

- [x] T030 [US3] Failing tests `test/features/menu/` (ML-US3-S1..S7): groups and order, language and theme apply, sign-in/join navigate, WhatsApp URL built from site settings, close returns, not-built destinations show 37.
- [x] T031 [US3] Implement `features/menu/` (`MenuPage`, `menu_routes.dart`, injection) using `ShootRow`, `SegmentedControl`, `TopHit`; WhatsApp via `url_launcher` with web fallback; editor sign-in via `WebsiteLinks`.

## Phase 6: User Story 4 - Below the hero (P3)

- [x] T040 [US4] Extend `AmbientPause` (additive: `initiallyPaused`, `onChanged`) and `LandingMotionStore`; tests ML-US4-S4 (Pause persists, announced) in `test/core/motion/`.
- [x] T041 [US4] Failing tests `test/features/landing/presentation/` (ML-US1-S9, ML-US4-S1..S8): fixed layout from sections, strip omitted under 4, tile presets brief, closing returns to hero, strip stops for screen reader, failure shows 39.
- [x] T042 [US4] Implement `LandingCubit` and `LandingPage` (header, hero over `GoldenHourScene`, bar, occasions, strip with `SnapCarousel`, band, closing), set as `home` in `lib/app.dart`.

## Phase 7: Fidelity and polish

- [x] T050 [P] Golden tests `test/goldens/screens/{01_splash,02_learn_brief,03_learn_price,04_learn_number,05_landing,06_menu}_golden_test.dart` with `fidelity:` keys; Arabic strings in `specs/design-system/canvas/strings.ar/` only if boards need them. (Verified: tests written and baselines generated on macOS with Flutter 3.47.9. The Arabic variants use English CMS landing text because no Arabic landing example exists; no `strings.ar` files for boards 01-06.)
- [ ] T051 Run `tool/goldens.sh --update` on macOS, review against board references, `pnpm fidelity`; add `010-first-visit-landing` to `tools/design-fidelity/shipped.json` only when it passes.
- [ ] T052 [P] impeccable detector and finish review; 5 s motion cap tests (ML-US2, FR-034).
- [ ] T053 `dart format`, `flutter analyze`, `flutter test --coverage` (80 % of changed code); `pnpm typecheck && pnpm test`.
- [x] T054 Persona/content audit: no profession, occasion, place or price literal in `lib/features/{brief,welcome,landing,menu}` (SC-008) with a test that greps the sources.
- [ ] T060 Follow-up (not in this feature): extract `brief/actions.ts` recording into a shared command.

## Dependencies

Setup -> Foundational -> US1 -> (US2, US3 parallel) -> US4 -> Polish. MVP: US1.

## Status at the end of the first implementation pass

Open and why:
- T051: `pnpm fidelity` against the board references was not run, and `010-first-visit-landing` is not in `tools/design-fidelity/shipped.json`. Screens 01, 05 (key light, ticker, scene details) and the 02-04 demonstrations are simplified against their boards; screen 06 is close. Needs `strings.ar/` files for boards 01-06 first.
- T052: the impeccable detector and finish review were not run. The 5 s motion cap is covered by the splash timing test only.
- T060: follow-up, not in this feature.
- Manual: SC-001 to SC-003, device walkthrough with VoiceOver and TalkBack.
- Owner decisions: research R1 (demonstration content), R4 (strip minimum setting), R8 (accent row in the menu), Arabic copy review (`app_ar.arb` `ml*` keys, written by the agent, not by a person).
- Integration tests (Testcontainers/Docker) for POST /briefs: deferred to post-merge integration run.
