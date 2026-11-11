# Implementation Plan: Mobile accent colour setting

**Branch**: `006-mobile-accent-colour` | **Date**: 2026-11-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-mobile-accent-colour/spec.md`

## Summary

People using the Flutter app choose an accent colour from five curated options (Blue default, Teal, Violet, Magenta, Graphite) in a new Appearance sheet that also holds the light / dark / match-device choice. Each accent is a fixed set of hand-checked light and dark values for the seven selection roles, so contrast is proven by a test rather than computed at run time. Primary actions move to their own fixed red role (`primary` #E01414, mirroring the web) so the accent never recolours them. The accent, the theme mode and the language are saved on the device with the Flutter team's `shared_preferences` plugin, loaded before the first frame so there is no flash of the default.

## Technical Context

**Language/Version**: Dart 3.13.2, Flutter 3.47.2 (stable), as pinned in `apps/mobile/README.md`

**Primary Dependencies**: existing `flutter_bloc` 9.1.1 (cubits), `get_it` 9.3.0 (DI), `flutter_localizations` + `intl` (ARB strings); new `shared_preferences` (latest stable 2.x at implementation, pinned exactly)

**Storage**: on-device key-value store through `shared_preferences` (NSUserDefaults on iOS, Android DataStore/SharedPreferences); three string keys, see [contracts/preferences-store.md](contracts/preferences-store.md)

**Testing**: `flutter_test` (unit and widget), `bloc_test` for the cubits, `mocktail` where a fake is not simpler; scenario ids `MA-…` in test names

**Target Platform**: iOS (iPhone and iPad: `TARGETED_DEVICE_FAMILY = "1,2"`) and Android phones; the sheet is verified at 360, 768 and 1024 px widths (Principle VI)

**Project Type**: mobile app (`apps/mobile`, Flutter, clean architecture by feature with a shared `core/`)

**Performance Goals**: an accent change redraws in the same frame as the tap; the preference load before `runApp` adds no visible delay to launch (one await of the plugin's cache, a few milliseconds)

**Constraints**: WCAG 2.1 AA for every accent in both themes (FR-007); English LTR and Arabic RTL; offline, no account (FR-013); no colour computed from user input (FR-006)

**Scale/Scope**: 5 accents × 2 themes × 7 roles; 3 saved keys; 1 new sheet; changes confined to `apps/mobile/lib/core/` plus the app shell, and one repo script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan meets it |
|---|---|---|
| I. Spec-driven | Pass | Spec 006 written and validated; this plan, then tasks, then analyze before code. |
| II. Performance budgets | Pass (web budgets not affected) | No web change. On mobile: no network, one small preference load before the first frame, theme rebuild in one frame. |
| III. Test-first | Pass | Every scenario maps to a named Dart test ([quickstart.md](quickstart.md)); tests are written first; `check:scenarios` is extended to read Dart tests (R7). |
| IV. Content in the CMS | Pass | The accent set is a design-token set with accessibility guarantees, not editorial content (spec Assumptions); accent names are interface strings in the ARB files. |
| V. Modular | Pass | All new code sits in `apps/mobile/lib/core/` (theme, preferences, widgets); no feature reaches into another; DI stays in the composition root. |
| VI. Accessible, bilingual, themed | Pass | AA checked per accent and theme by test; sheet designed in Arabic RTL and English, light and dark, 44 px targets, large text, reduced motion, screen-reader semantics. This also delivers the constitution's "the choice persists" for theme on mobile. |
| VII. Secure by default | Pass | Only three non-sensitive strings are stored; no personal data, no network. |
| VIII. Simplicity | Pass with justification | One new package and one small interface, recorded in Complexity Tracking. |
| IX. Designed, not generated | Pass with gate | The sheet reuses the Brief Bar row grammar (44 px rows, 30 px tiles, group labels, trailing check); built with the impeccable workflow, finish review on four captures (R5). |
| Stack | Pass | Constitution 1.4.0 (2026-11-10) admits `apps/mobile` (Flutter, Dart, `flutter_test` / `bloc_test` / `mocktail`, exact pins) and its mobile test pyramid and verification sizes; this plan uses only that stack plus the package in Complexity Tracking. |

## Project Structure

### Documentation (this feature)

```text
specs/006-mobile-accent-colour/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0: palette values, storage, wiring, placement
├── data-model.md        # Phase 1: accents, roles, saved preferences, cubits
├── quickstart.md        # Phase 1: how to verify, scenario → test mapping
├── contracts/
│   ├── appearance-sheet.md
│   └── preferences-store.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code

```text
apps/mobile/
├── pubspec.yaml                              # + shared_preferences (exact pin)
├── lib/
│   ├── main.dart                             # load preferences before runApp
│   ├── app.dart                              # watch AccentCubit; themes from AppTheme.of(accent, …)
│   └── core/
│       ├── di/injection.dart                 # register PreferencesStore and AccentCubit; pass store to cubits
│       ├── preferences/
│       │   ├── preferences_store.dart        # interface + keys
│       │   └── shared_preferences_store.dart # plugin adapter
│       ├── theme/
│       │   ├── shoot_accent.dart             # enum of the five accents with light/dark AccentRoles
│       │   ├── accent_cubit.dart
│       │   ├── shoot_colors.dart             # + primary, primaryHover, onPrimary; withAccent()
│       │   ├── app_theme.dart                # AppTheme.of(accent, brightness), memoised; filled buttons use primary
│       │   └── theme_mode_cubit.dart         # reads/writes the store
│       ├── l10n/
│       │   ├── locale_cubit.dart             # reads/writes the store
│       │   └── arb/app_{en,ar}.arb           # appearance, group labels, accent names
│       └── widgets/
│           ├── app_bar_actions.dart          # ThemeMenuButton -> AppearanceButton
│           └── appearance_sheet.dart         # the sheet (contract: appearance-sheet.md)
└── test/
    ├── helpers/
    │   ├── pump_app.dart                     # + AccentCubit, in-memory store
    │   └── in_memory_preferences_store.dart
    ├── app_test.dart                         # MA-US2-S1
    └── core/
        ├── theme/accent_palette_test.dart    # MA-US3-S1, MA-US3-S2
        ├── theme/app_theme_test.dart         # MA-US1-S3
        ├── theme/shoot_colors_test.dart      # + primary pairs
        ├── preferences/appearance_cubits_test.dart       # MA-US2-S2..S4
        ├── preferences/shared_preferences_store_test.dart
        └── widgets/appearance_sheet_test.dart            # MA-US1-S1, S2, S4, S5

scripts/check-scenario-tests.mjs              # also search apps/mobile/test, accept Dart test names
package.json                                  # check:scenarios includes the 006 quickstart
```

Also updated: `apps/mobile/README.md` (packages table gains `shared_preferences`; Themes section gains accents and `primary`; "Not done yet" loses the line about unsaved choices) and `specs/design-system/tokens.css` is untouched (the web keeps its blue accent).

**Structure Decision**: a mobile-only change inside the existing `apps/mobile` clean-architecture layout. Appearance is cross-cutting app chrome, not a product feature, so it lives in `core/` next to the existing theme and locale code rather than under `features/`.

## Post-design Constitution re-check

Unchanged from the table above after Phase 1: the data model adds no server data, the only new dependency is the one justified below, the contracts are app-internal plus one sheet that inherits the design world, and every scenario has a mapped test file. Gate passes.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `shared_preferences` package | FR-009 and FR-010 need the accent, theme mode and language to survive a restart; Flutter has no built-in persistent key-value store. | Hand-written platform channels to NSUserDefaults / Android preferences duplicate a maintained first-party plugin in two native languages; a JSON file needs `path_provider` (also a package) plus our own corruption handling; `hydrated_bloc` adds two packages for three strings. |
| `shared_preferences_platform_interface` (dev dependency only) | T005 tests the real adapter against the plugin's own in-memory platform (`InMemorySharedPreferencesAsync`) instead of a device. | Mocking the plugin class with `mocktail` would test our mock, not the adapter's error handling against the plugin's real behaviour. It is already a transitive dependency; pinning it makes the test's import explicit. |
| `PreferencesStore` interface (one abstract class, one adapter, one in-memory test fake) | Lets the three cubits be tested for restore, fallback and write failure (MA-US2-S2 to S4, FR-012) without platform plumbing, and keeps the plugin out of the cubits, matching the README's rule that classes take dependencies through constructors. | Using the plugin directly in each cubit would need the plugin's platform test doubles in every cubit test and could not simulate a failing write. |
