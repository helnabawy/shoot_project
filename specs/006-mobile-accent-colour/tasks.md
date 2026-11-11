---

description: "Task list for feature 006 — mobile accent colour setting (Flutter app)"
---

# Tasks: Mobile accent colour setting

**Input**: Design documents from `specs/006-mobile-accent-colour/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/appearance-sheet.md, contracts/preferences-store.md, quickstart.md. The Flutter app scaffold (`apps/mobile`, commit cb9eb1c) is in place.

**Design**: the Appearance sheet is new visible UI, so its tasks follow the `ui-design` skill and the `impeccable` workflow (context → craft floor → build → detector → finish review on captures in English and Arabic, light and dark → DESIGN.md), Principle IX. It inherits the Brief Bar world: 44 px rows, 30 px leading tiles, group labels, a trailing check.

**Tests**: REQUIRED by the constitution (Principle III). Every phase lists its tests first; write them, watch them fail, then implement. Name tests with the 006 ids (`MA-US1-S2`); `quickstart.md` holds the scenario → test mapping and `pnpm check:scenarios` enforces it once T003 is done.

**Organization**: Phase 1 sets up the package and the scenario check; Phase 2 builds the accent data, the fixed primary role, the themes and the preference store that every story needs; Phases 3–5 are one user story each; Phase 6 is polish and the design gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 choose an accent · US2 keep the choice · US3 every accent readable
- File paths are relative to the repository root; `mobile/` below means `apps/mobile/`
- Flutter commands run in `apps/mobile` (`flutter test`, `flutter analyze`); repo scripts need Node 24 (`nvm use`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: owner sign-off on the palette, the new package, and scenario checking for Dart tests

- [x] T001 (approved by the owner 2026-11-11, values and Arabic names unchanged) Get the owner's approval of the five accents (ids `blue`, `teal`, `violet`, `magenta`, `graphite`), their light/dark values and the Arabic names (أزرق، فيروزي، بنفسجي، فوشي، فحمي, plus the group labels: Appearance = المظهر, as the existing theme tooltip already uses, and Theme = السمة; all reviewed by someone who writes Arabic); record any change in the R1 table of `specs/006-mobile-accent-colour/research.md` before T006
- [x] T002 Add `shared_preferences` pinned to an exact version (latest stable 2.x, at least two weeks old, no caret) to `mobile/pubspec.yaml`, and as a dev dependency `shared_preferences_platform_interface` pinned to the exact version that `shared_preferences` resolves to (it provides `InMemorySharedPreferencesAsync` for T005), run `flutter pub get`, and add its row ("Saves appearance choices on the device", feature 006) to the Packages table in `mobile/README.md`
- [x] T003 [P] Extend `scripts/check-scenario-tests.mjs` so `SEARCH_ROOTS` includes `apps/mobile/test`, `SKIP` includes `.dart_tool` and `build`, and the "named" check also accepts `_test.dart` files whose line has the id inside `test(`, `testWidgets(`, `group(` or `blocTest`; add `node scripts/check-scenario-tests.mjs specs/006-mobile-accent-colour/quickstart.md` to the `check:scenarios` script in `package.json`

**Checkpoint**: package resolved; `pnpm check:scenarios` reports the 006 table (failing until the tests exist)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: accent data, the fixed primary role, accent-aware themes, and the preference store

**⚠️ CRITICAL**: no user story work can begin until this phase is complete

### Tests first

- [x] T004 [P] Extend `mobile/test/core/theme/shoot_colors_test.dart`: in both themes `onPrimary` on `primary` and on `primaryHover` ≥ 4.5:1; `withAccent(roles)` replaces exactly the seven roles `accent`, `onAccent`, `accentInk`, `selected`, `selectedHover`, `selectionWash`, `focus` and keeps every other role (including `primary`, `primaryHover`, `onPrimary`) equal; `copyWith` and `lerp` carry the three new roles
- [x] T005 [P] Write `mobile/test/core/preferences/shared_preferences_store_test.dart` with `SharedPreferencesAsyncPlatform.instance = InMemorySharedPreferencesAsync.withData(...)` (from `shared_preferences_platform_interface`, added in T002) in `setUp`: a missing key reads as nothing; a value of the wrong type reads as nothing ("never throws"); `writeString` then `readString` round-trips; `remove` clears; keys outside the three in `PreferenceKeys` are not cached
- [x] T006 [P] Write `mobile/test/helpers/in_memory_preferences_store.dart`: a `PreferencesStore` over a seeded `Map<String, String>`, with flags `failReads` (every read returns nothing) and `failWrites` (writes complete without storing), plus a `writes` log for assertions

### Implementation

- [x] T007 Create `mobile/lib/core/preferences/preferences_store.dart`: abstract `PreferencesStore` with `String? readString(String key)` (synchronous, never throws), `Future<void> writeString(String key, String value)` and `Future<void> remove(String key)` (never throw to the caller; failures logged with `debugPrint` in debug only), and `abstract final class PreferenceKeys { accent = 'appearance.accent'; themeMode = 'appearance.themeMode'; locale = 'appearance.locale'; }` exactly as in contracts/preferences-store.md
- [x] T008 Create `mobile/lib/core/preferences/shared_preferences_store.dart`: `SharedPreferencesStore` wrapping `SharedPreferencesWithCache` created with an allow-list of the three `PreferenceKeys`, with a static `Future<SharedPreferencesStore> open()`; wrap every read and write in try/catch per the interface rules (T005 passes)
- [x] T009 Create `mobile/lib/core/theme/shoot_accent.dart`: immutable `AccentRoles` (seven `Color` fields as in data-model.md) and `enum ShootAccent { blue, teal, violet, magenta, graphite }` with `String id` (`[a-z]+`, never changed once shipped), `AccentRoles light`, `AccentRoles dark`, `static ShootAccent get fallback => blue`, and `static ShootAccent? fromId(String? id)`; values copied verbatim from the R1 table in research.md (translucent roles as `Color.fromRGBO(r, g, b, alpha)`); Blue's values MUST equal today's `ShootColors.light/dark` accent roles
- [x] T010 Update `mobile/lib/core/theme/shoot_colors.dart`: add `primary` #E01414, `primaryHover` #C00F0F, `onPrimary` #FFFFFF to both `light` and `dark` (same values), to `copyWith` and `lerp`, with doc comments ("the one primary action; never changed by the accent"); add `ShootColors withAccent(AccentRoles roles)`; reword the `accent` doc comment from "the one primary action" to "selection fill" (T004 passes)
- [x] T011 Update `mobile/lib/core/theme/app_theme.dart`: add `static ThemeData of(ShootAccent accent, Brightness brightness)` building from `ShootColors.light/dark.withAccent(accent.light/dark)`, memoised per pair; keep `AppTheme.light` / `AppTheme.dark` as `of(ShootAccent.blue, …)`; keep `ColorScheme.primary = accent`; set `filledButtonTheme` to `primary` / `onPrimary` with `primaryHover` for the pressed and hovered states via `WidgetStateProperty`
- [x] T012 Update `mobile/lib/main.dart` and `mobile/lib/core/di/injection.dart`: `main()` awaits `SharedPreferencesStore.open()` after `WidgetsFlutterBinding.ensureInitialized()` and before `runApp`; `configureDependencies(AppConfig config, PreferencesStore store)` registers the store as a singleton; update every caller of `configureDependencies` in `mobile/test/`

**Checkpoint**: `flutter test` green; the app looks exactly as before (Blue, primary buttons now red)

---

## Phase 3: User Story 1 — Choose an accent colour (Priority: P1) 🎯 MVP

**Goal**: the Appearance sheet lists Theme and the five accents; a tap applies an accent to every selection role at once, never to primary actions

**Independent test**: open the sheet, pick Violet, and see the caret, focus ring, progress and selected tiles turn violet while the primary button stays red (quickstart manual steps 2–5)

### Tests first

- [x] T013 [P] [US1] Write `mobile/test/core/theme/app_theme_test.dart`: `MA-US1-S3 the primary action colour is the same under every accent` — for each `ShootAccent` and both brightnesses, the filled button background resolves to `primary` (#E01414) and its pressed state to `primaryHover`, and `ColorScheme.primary` equals that accent's `accent`
- [x] T014 [P] [US1] Write `mobile/test/core/theme/accent_cubit_test.dart` with `bloc_test`: starts at `ShootAccent.blue`; `select(violet)` emits violet; selecting the current accent emits nothing
- [x] T015 [P] [US1] Write `mobile/test/core/widgets/appearance_sheet_test.dart` (keys from contracts/appearance-sheet.md):
  - `MA-US1-S1 first launch lists the accents in order, Blue first and selected`: tapping `appearance-button` opens `appearance-sheet` with `theme-option-system` checked and `accent-option-blue` … `accent-option-graphite` in that order, only Blue checked
  - `MA-US1-S2 tapping an accent applies it to every selection role at once`: tap `accent-option-violet`; in the same pump the theme's `ShootColors` accent, accentInk, selected, selectedHover, selectionWash and focus equal Violet's light values, the sheet stays open, and Violet is the only checked accent
  - `MA-US1-S4 Arabic names, right to left, choice kept`: in `ar`, names are the Arabic ARB strings, `Directionality` is RTL, the tile is at the start (right); switching language with the sheet open keeps the checked accent
  - `MA-US1-S5 each option announces name and selected state`: each row's semantics has its name, `isInMutuallyExclusiveGroup`, and `isChecked` true only on the current choice; every row is at least 44 × 44 (also at text scale 2.0, names wrap, no overflow)
  - Run the four cases above at the 360 × 640 phone size and at 768 × 1024 and 1024 × 768 (iPad portrait and landscape; the iOS app targets iPhone and iPad), with no overflow and the sheet at its intended width
  - FR-014 reduced motion: with `MediaQueryData(disableAnimations: true)` the `MaterialApp`'s `themeAnimationDuration` is `Duration.zero`, and an accent tap recolours in one pump
  - Edge case, device theme changes: with Match device and Violet chosen, switching `platformBrightness` to dark applies Violet's dark roles without another choice

### Implementation

- [x] T016 [US1] Create `mobile/lib/core/theme/accent_cubit.dart`: `AccentCubit extends Cubit<ShootAccent>`, starting at `ShootAccent.fallback`, `select(ShootAccent accent)` emits when different (in memory; saving comes in US2) (T014 passes)
- [x] T017 [P] [US1] Add strings with descriptions to `mobile/lib/core/l10n/arb/app_en.arb` and Arabic to `mobile/lib/core/l10n/arb/app_ar.arb`: `appearanceTitle` (Appearance / المظهر), `appearanceButtonTooltip`, `themeGroupLabel` (Theme / السمة), `accentGroupLabel` (Accent colour / لون التمييز), `accentBlue`, `accentTeal`, `accentViolet`, `accentMagenta`, `accentGraphite` (names as approved in T001); remove `themeMenuTooltip` if nothing uses it after T020
- [x] T018 [US1] Run the impeccable workflow for the sheet: `impeccable context`, write the surface brief `.impeccable/surfaces/mobile-appearance-sheet.md` in surface scope (inherits the Brief Bar world; thesis, first viewport on a 360 × 640 phone, signature interaction "tap to recolour, sheet stays open"), and read `reference/craft-floor.md` before T019
- [x] T019 [US1] Create `mobile/lib/core/widgets/appearance_sheet.dart` per contracts/appearance-sheet.md: modal bottom sheet with drag handle, title, a Theme group (three rows) and an Accent colour group (five rows in enum order); each row ≥ 44 px, 30 px leading tile (accent swatch in the current theme's `accent`, or the theme icon on the resting tile), name that wraps, trailing check on the current choice only; `Semantics` groups with radio-style rows; directional insets only (`EdgeInsetsDirectional`); taps call `ThemeModeCubit.select` / `AccentCubit.select` and keep the sheet open; keys `appearance-sheet`, `theme-option-<system|light|dark>`, `accent-option-<id>`
- [x] T020 [US1] In `mobile/lib/core/widgets/app_bar_actions.dart` replace `ThemeMenuButton` with `AppearanceButton` (44 × 44 icon button, key `appearance-button`, tooltip and semantics label `appearanceButtonTooltip`, opens the sheet), and update `mobile/lib/features/service_health/presentation/pages/service_health_page.dart` and its test to use it
- [x] T021 [US1] Update `mobile/lib/app.dart` and `mobile/lib/core/di/injection.dart`: register `AccentCubit` as a singleton, provide it in `MultiBlocProvider`, pass `theme: AppTheme.of(accent, Brightness.light)` and `darkTheme: AppTheme.of(accent, Brightness.dark)` from `context.watch<AccentCubit>().state`, and set `themeAnimationDuration` to `Duration.zero` when `MediaQuery.disableAnimationsOf(context)` is true
- [x] T022 [US1] Update `mobile/test/helpers/pump_app.dart` to provide an `AccentCubit` (optional `accent` parameter) and build its themes with `AppTheme.of(accent, …)`, so T013–T015 run in the app's real shell (T013–T015 pass)
- [x] T023 [US1] Run `impeccable detect --json` on `mobile/lib/core/widgets/appearance_sheet.dart` and `mobile/lib/core/widgets/app_bar_actions.dart`; fix mechanical findings (ran 2026-11-11: no findings; the detector reads web files, so this is a clean pass with little coverage on Dart)

**Checkpoint**: US1 works on its own; the choice resets on restart

---

## Phase 4: User Story 2 — Keep the choice between launches (Priority: P2)

**Goal**: accent, theme mode and language are saved on the device and applied on the first frame after a restart; bad or missing values fall back silently

**Independent test**: choose Violet, Dark and Arabic, kill and relaunch: the first frame is Arabic, dark, violet (quickstart manual step 6)

### Tests first

- [x] T024 [P] [US2] Write `mobile/test/core/preferences/appearance_cubits_test.dart` with `InMemoryPreferencesStore`:
  - `MA-US2-S2 theme mode and language are restored`: seeded `appearance.themeMode = dark` and `appearance.locale = ar` give `ThemeMode.dark` and `Locale('ar')`; `select` writes `system|light|dark` and `en|ar`; selecting the device language (`null`) removes `appearance.locale`
  - `MA-US2-S3 an unknown saved accent falls back to Blue`: seeded `appearance.accent = 'orange'` gives `ShootAccent.blue`, and the stored value is left untouched until a new `select`
  - `MA-US2-S4 unreadable preferences give the defaults without an error`: with `failReads`, the cubits start at Blue, `ThemeMode.system` and `null`; an unsupported `appearance.locale = 'fr'` and `appearance.themeMode = 'sepia'` also give the defaults
  - FR-012: with `failWrites`, `select(violet)` still emits Violet and nothing throws; the emit happens before the write
- [x] T025 [P] [US2] Add to `mobile/test/app_test.dart`: `MA-US2-S1 a saved accent is applied on the first frame` — configure dependencies with an `InMemoryPreferencesStore` seeded with `appearance.accent = teal`, `themeMode = dark`, `locale = ar`; after the first `pumpWidget(const ShootApp())` (no extra pumps) the active theme's `accent` is Teal's dark value, the brightness is dark and the locale is Arabic

### Implementation

- [x] T026 [US2] Update `mobile/lib/core/theme/accent_cubit.dart`: constructor takes `PreferencesStore`, initial state `ShootAccent.fromId(store.readString(PreferenceKeys.accent)) ?? ShootAccent.fallback`; `select` emits, then `writeString(PreferenceKeys.accent, accent.id)` without awaiting in the UI path
- [x] T027 [P] [US2] Update `mobile/lib/core/theme/theme_mode_cubit.dart`: constructor takes `PreferencesStore`; reads `appearance.themeMode` (`system` | `light` | `dark`, anything else → `ThemeMode.system`); `select` emits, then writes; replace the "In memory only" doc comment
- [x] T028 [P] [US2] Update `mobile/lib/core/l10n/locale_cubit.dart`: constructor takes `PreferencesStore`; reads `appearance.locale` (`en` | `ar` via `AppLocales.supported`, anything else → `null`); `select(locale)` emits, then writes the language code or removes the key for `null`; replace the "In memory only" doc comment
- [x] T029 [US2] Update `mobile/lib/core/di/injection.dart` and `mobile/test/helpers/pump_app.dart` to construct the three cubits with the registered / in-memory store (T024, T025 pass)

**Checkpoint**: US1 and US2 both work; relaunch keeps all three choices

---

## Phase 5: User Story 3 — Every accent stays readable (Priority: P3)

**Goal**: an automated proof that every accent meets FR-007 and FR-008 in both themes, so a future value change cannot regress

**Independent test**: `flutter test test/core/theme/accent_palette_test.dart` passes and fails if any value in `shoot_accent.dart` is pushed below a threshold

### Tests first

- [x] T030 [US3] Write `mobile/test/core/theme/accent_palette_test.dart`:
  - `MA-US3-S1 every accent passes every contrast pair in both themes`: for each accent × theme, flatten translucent roles over `ground` and over `panelSolid`, then assert `onAccent` on `accent` ≥ 4.5; `accentInk` on ground and panel-solid ≥ 4.5; `accentInk` on `selected` and on `selectedHover` over each ≥ 4.5; `focus` against ground and panel-solid ≥ 3 (data-model.md "AccentRoles" constraints)
  - `MA-US3-S2 no accent is close to the primary red or the danger state`: for each accent with saturation ≥ 10%, the hue of `accent`, `selected` and `focus` is at least 30° from the hue of `primary` (#E01414) and of `onDanger` in the same theme; achromatic accents are exempt
  - invariants (no MA id): ids unique and match `^[a-z]+$`; `ShootAccent.values.first == blue`; Blue's roles equal the pre-feature values listed in research.md R1 (SC-005)

### Implementation

- [x] T031 [US3] If any T030 case fails, adjust only the failing value in `mobile/lib/core/theme/shoot_accent.dart` and the same cell of the R1 table in `specs/006-mobile-accent-colour/research.md` together, never the threshold

**Checkpoint**: all three stories work and are proven

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T032 Run `dart format lib test`, `flutter analyze` (no issues) and `flutter test --coverage` (all pass; at least 80% line coverage of the files added or changed under `mobile/lib/core/`, read from `coverage/lcov.info`, Principle III) in `apps/mobile`, and `pnpm lint` and `pnpm check:scenarios` at the root (the edited script lints; the 006 table passes)
- [ ] T033 (done on an iPhone 17 simulator only, 2026-11-11: sheet, accent and theme switching, Arabic RTL, relaunch persistence, bottom inset; still to do: iPad portrait and landscape, an Android emulator, VoiceOver / TalkBack, largest text size by hand, the SC-001 timing) Walk through quickstart.md manual checks 1–10 on an iOS simulator (iPhone at 360 px width, and iPad in portrait 768 px and landscape 1024 px) and an Android emulator at phone size, in English and Arabic, light and dark, largest text size, VoiceOver / TalkBack; record the time for check 9 (SC-001 under 10 s)
- [x] T034 (iPhone captures only; verdict `fix` for one bottom-inset issue, fixed and re-captured on device; DESIGN.md and its sidecar updated 2026-11-11) Impeccable finish review: capture the sheet (Blue and Violet selected) on a phone and an iPad in English light, English dark, Arabic light and Arabic dark into `.impeccable/review/mobile-appearance-sheet/`, spawn the finish reviewer, act on its verdict until `ship`, then let the documenter record the sheet and the accent set in `DESIGN.md`
- [x] T035 [P] Update `mobile/README.md`: Themes section (the five accents, `primary` / `primaryHover` / `onPrimary`, `withAccent`, `AppTheme.of`), Languages section (the language choice is saved), "Not done yet" (remove "The language and theme choices are not saved between launches")
- [x] T036 [P] Mark feature 006 as implemented in the project `CLAUDE.md` feature line and tick every task here

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: T001 blocks T009 (values); T002 blocks T008; T003 is independent
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories. T004–T006 first (tests and fake), then T007 → T008, T009 → T010 → T011, then T012 (needs T008)
- **US1 (Phase 3)**: depends on Phase 2
- **US2 (Phase 4)**: depends on Phase 2 and on T016 (it extends `AccentCubit`) and T021 (DI wiring); otherwise independent of the sheet UI
- **US3 (Phase 5)**: depends only on T009–T010; can run in parallel with US1 and US2
- **Polish (Phase 6)**: after the stories you ship

### Within each story

- Tests are written and seen failing before the implementation tasks that make them pass
- ARB strings (T017) before the sheet (T019); the design brief and craft floor (T018) before the sheet

### Parallel opportunities

- T003 alongside T001–T002
- T004, T005, T006 together
- T013, T014, T015, T017 together once Phase 2 is done
- T024 and T025 together; T027 and T028 together
- The whole of Phase 5 alongside Phases 3–4
- T035 and T036 together

## Parallel example: User Story 1

```text
Together after Phase 2:
  T013 app_theme_test.dart (MA-US1-S3)
  T014 accent_cubit_test.dart
  T015 appearance_sheet_test.dart (MA-US1-S1, S2, S4, S5)
  T017 ARB strings
Then in order: T016 → T018 → T019 → T020 → T021 → T022 → T023
```

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 and Phase 2 (the app is unchanged apart from red primary buttons)
2. Phase 3: the sheet and live accent switching
3. Stop and validate: quickstart steps 2–5; the choice resets on relaunch, which is acceptable for a demo

### Incremental delivery

1. + US2: saved accent, theme and language (quickstart step 6)
2. + US3: the palette proof (can land any time after Phase 2)
3. Polish and the impeccable finish review before release

### Out of scope here (follow-ups)

- A CI job running `flutter analyze` and `flutter test` (listed under "Not done yet" in `apps/mobile/README.md`)
