# Research: Mobile accent colour setting

Feature: [spec.md](spec.md) · Plan: [plan.md](plan.md)

## R1. The curated accents and their values

**Decision**: five accents, in this order, each with fixed light and dark values for every derived role. Blue is today's values, unchanged.

| Id | Name (en / ar) | Theme | accent (fill) | onAccent | accentInk | selected | selectedHover | selectionWash | focus |
|---|---|---|---|---|---|---|---|---|---|
| `blue` | Blue / أزرق | light | #0A60FF | #FFFFFF | #0848C2 | #0A60FF @ 12% | #0A60FF @ 18% | #0A60FF @ 10% | #0A60FF |
| | | dark | #2B6BEB | #FFFFFF | #B7D0FF | #4D8DFF @ 24% | #4D8DFF @ 32% | #2B6BEB @ 14% | #7AA7FF |
| `teal` | Teal / فيروزي | light | #00756A | #FFFFFF | #005F56 | #00756A @ 12% | #00756A @ 18% | #00756A @ 10% | #00756A |
| | | dark | #00796D | #FFFFFF | #8FE3D4 | #2EC4AD @ 22% | #2EC4AD @ 30% | #00796D @ 16% | #4FD1BD |
| `violet` | Violet / بنفسجي | light | #6B3FD6 | #FFFFFF | #5A2FC2 | #6B3FD6 @ 12% | #6B3FD6 @ 18% | #6B3FD6 @ 10% | #6B3FD6 |
| | | dark | #7048E0 | #FFFFFF | #D2C3FF | #9D80FF @ 24% | #9D80FF @ 32% | #7048E0 @ 16% | #B39BFF |
| `magenta` | Magenta / فوشي | light | #B0287A | #FFFFFF | #981F68 | #B0287A @ 12% | #B0287A @ 18% | #B0287A @ 10% | #B0287A |
| | | dark | #B62E80 | #FFFFFF | #FFB6DF | #FF6FBF @ 22% | #FF6FBF @ 30% | #B62E80 @ 16% | #FF8CCC |
| `graphite` | Graphite / فحمي | light | #1D1D1F | #FFFFFF | #1D1D1F | #1D1D1F @ 9% | #1D1D1F @ 14% | #1D1D1F @ 8% | #1D1D1F |
| | | dark | #E8E6E3 | #1D1D1F | #F5F5F7 | #FFFFFF @ 16% | #FFFFFF @ 22% | #FFFFFF @ 12% | #E8E6E3 |

Measured (WCAG 2.1, composites flattened over the page ground #EFE9E3 / #141416 and over panel-solid #FCFBFA / #28282C), lowest margin per accent and theme:

| Accent | Light | Dark |
|---|---|---|
| Blue | all pass, lowest 1.11× the threshold | all pass, lowest 1.06× |
| Teal | all pass (accentInk on hover tint over ground 4.92:1) | all pass, lowest 1.18× |
| Violet | all pass, lowest 1.14× | all pass, lowest 1.21× |
| Magenta | all pass, lowest 1.08× | all pass, lowest 1.21× |
| Graphite | all pass, lowest 2.35× | all pass, lowest 1.47× |

Pairs checked (FR-007): onAccent on accent ≥ 4.5; accentInk on ground and on panel-solid ≥ 4.5; accentInk on selected and on selectedHover, each flattened over ground and over panel-solid, ≥ 4.5; focus against ground and panel-solid ≥ 3.

**Rationale**:
- The page has three warm tinted states (attention = peach, success = green, danger = rose) and a red primary action (#E01414). A selected tint in orange, green, red or pink would read as one of those states (FR-008), so the set stays in cool hues (blue, teal, violet, magenta) plus a neutral.
- Magenta (hue about 325°) is kept far enough from the primary red (0°) and the danger rose; the automated hue check in the palette test enforces a minimum hue distance of 30° from both (MA-US3-S2).
- Graphite gives people who dislike colour a neutral option. Its dark fill is light, so its `onAccent` is dark ink: `onAccent` is a per-accent role, not always white.
- Teal's first ink (#00665C) failed on the hover tint (4.47:1) and was deepened to #005F56.

**Alternatives considered**: six accents including Green or Orange (rejected: confusable with success / attention, FR-008); a free colour picker with run-time contrast correction (out of scope in the spec, and it would compute roles at run time, against FR-006); generating tints from one seed colour with Material's `ColorScheme.fromSeed` (rejected: values are not hand-checked and drift between Flutter versions).

**Owner check**: approved by the owner on 2026-11-11, values and names unchanged (originally a proposal to approve at the start of implementation, spec Assumptions). The Arabic names need review by someone who writes Arabic (FR-015).

## R2. Saving preferences on the device

**Decision**: add `shared_preferences` (the Flutter team's first-party plugin; latest stable 2.x at implementation time, pinned exactly in `pubspec.yaml`) and use its `SharedPreferencesWithCache` API, created once in `main()` before `runApp`. Reads after that are synchronous from its in-memory cache; writes go to the platform store (NSUserDefaults on iOS, DataStore/SharedPreferences on Android) without blocking the UI.

**Rationale**: it is the platform primitive for small key-value settings, maintained by the Flutter team, needs no native code of ours, and loading it before `runApp` gives FR-009's "first frame already right" with a single await of a few milliseconds. `allowList` limits the cache to our three keys.

**Alternatives considered**:
- `hydrated_bloc`: persists cubit state automatically, but adds two packages (it needs a storage backend and `path_provider`) and code-gen-free but opaque JSON blobs; more than three strings need.
- A JSON file via `path_provider` + `dart:io`: also a new package, plus file locking and corruption handling we would write ourselves.
- Our own platform channels to NSUserDefaults / SharedPreferences: same result as the plugin with native code to maintain on both platforms.
- The legacy `SharedPreferences.getInstance()` API: works, but the plugin's documentation steers new code to `SharedPreferencesAsync` / `SharedPreferencesWithCache`.

## R3. How the accent reaches every widget

**Decision**:
- `ShootColors` keeps one set of base roles per theme and gains `withAccent(AccentRoles)` which replaces the seven accent roles. `ShootAccent` (an enum with a stable `id`) holds `AccentRoles light` and `AccentRoles dark`.
- `AppTheme.of(ShootAccent accent, Brightness b)` builds the `ThemeData` from `ShootColors.light/dark.withAccent(...)` and memoises the ten combinations.
- `ShootApp` watches an `AccentCubit` and passes `AppTheme.of(accent, light)` / `AppTheme.of(accent, dark)` to `MaterialApp.router`. Changing the accent rebuilds the theme in the same frame; with reduced motion `MaterialApp`'s theme animation is turned off (`themeAnimationDuration: Duration.zero` when `MediaQuery.disableAnimations`).
- Material's `ColorScheme.primary` stays mapped to the accent, because stock widgets (Checkbox, Switch, Radio, progress, text selection) use it as their selection colour. Primary actions do not use it: see R4.

**Alternatives considered**: an `InheritedWidget` above the theme that widgets read directly (rejected: stock widgets would not follow it); rebuilding `ShootColors` from scratch per accent (rejected: duplicates every non-accent role five times).

## R4. The fixed primary action colour

**Decision**: add `primary` #E01414, `primaryHover` #C00F0F and `onPrimary` #FFFFFF to `ShootColors` (same values in both themes, mirroring the web's `--primary` roles decided on 2026-11-10). `filledButtonTheme` uses `primary`, with `primaryHover` for the pressed and hovered states. The palette test asserts that every accent leaves these three roles untouched (MA-US1-S3) and that onPrimary on primary and primaryHover is ≥ 4.5:1 (4.91:1 and 6.24:1).

**Rationale**: today the app's filled buttons use `accent`, so without this change the accent would recolour primary actions, against FR-005. Mirroring the web keeps the two apps consistent, as the mobile README requires ("when a token changes on the web, change it here").

## R5. Where the setting lives

**Decision**: the app bar's theme icon (`ThemeMenuButton`, a popup with three items) becomes an **Appearance** button that opens a modal bottom sheet with two groups in the Brief Bar row grammar: **Theme** (Match device, Light, Dark) and **Accent colour** (the five accents). Each row is 44 px or taller, leads with a 30 px tile (the accent's swatch in the current theme; the theme rows keep their icons), shows the name, and trails a check on the current choice. Each group is a single-selection radio group for assistive technology. The sheet closes with the drag handle, a tap outside, or the system back gesture; choices apply on tap.

**Rationale**: a popup menu with eight items and two kinds of choice is cramped and has no place for swatches; a sheet is the platform's idiom for a short settings panel and keeps the existing entry point (spec Assumptions).

**Design gate**: the sheet is new UI, so it goes through the `impeccable` workflow (craft floor, detector, finish review on captures in English and Arabic, light and dark) before the task is done (Principle IX). The mobile app has no surface brief yet; one is written for this sheet in surface scope, inheriting the Brief Bar world.

## R6. Saving theme mode and language

**Decision**: `ThemeModeCubit` and `LocaleCubit` take the same `PreferencesStore` as `AccentCubit`, read their initial state from it in the constructor, and write on `select`. Unknown or unreadable values fall back to the defaults (FR-011); a failed write is caught and logged in debug builds only (FR-012).

## R7. Proving scenarios in Dart

**Decision**: the Dart tests carry the `MA-…` ids in their `test` / `testWidgets` / `blocTest` / `group` names, and `scripts/check-scenario-tests.mjs` is extended to search `apps/mobile/test` and to accept `_test.dart` files with those Dart test functions. `pnpm check:scenarios` gains `specs/006-mobile-accent-colour/quickstart.md`.

**Rationale**: Principle III requires every scenario to map to a named test; the script today only reads TypeScript tests.
