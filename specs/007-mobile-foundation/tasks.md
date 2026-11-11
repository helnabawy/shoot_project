---

description: "Task list for feature 007 — mobile foundation (design system, shell and design-fidelity check)"
---

# Tasks: Mobile foundation

**Input**: Design documents from `specs/007-mobile-foundation/`.

**Prerequisites**:
- The design documents: plan.md, spec.md, research.md (R1–R12), data-model.md,
  contracts/manifest.md, contracts/fidelity-check.md, contracts/component-catalogue.md,
  contracts/routes.md and quickstart.md.
- Feature 006 merged (`primary` role, `PreferencesStore`).
- The canvas export in `specs/design-system/canvas/` (done 2026-11-11).

**Skills**: read `flutter-mobile`, `design-fidelity`, `testing-strategy` and `ui-design` before
starting.
- Screens 37 and 39 and the gallery are visible UI, so they follow the impeccable workflow
  (Principle IX). Here the boards are the comp: build to the board, run the detector, run the
  finish review on the four variants.

**Tests**: required by the constitution (Principle III).
- Every phase lists its tests first: write them, watch them fail, then implement.
- Test names carry the 007 ids (`MF-US1-S2`).
- `quickstart.md` holds the scenario → test mapping.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**:
  - US1: the fidelity check
  - US2: four variants
  - US3: the component library
  - US4: motion
  - US5: shell and fallbacks
- Paths are relative to the repository root.
  - `mobile/` means `apps/mobile/`.
  - `fid/` means `tools/design-fidelity/`.
  - `canvas/` means `specs/design-system/canvas/`.
- Flutter commands run in `apps/mobile`. Node commands need Node 24 (`nvm use`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the new workspace, the package, the test fonts, the scenario check and CI.

- [ ] T001 Add `tools/*` to `pnpm-workspace.yaml`.
  - Create `fid/package.json`: name `design-fidelity`, private, type module.
  - devDependency `@playwright/test` pinned to the exact version `apps/web/package.json` uses
    (1.63.0); TypeScript from the shared config.
  - Create `fid/tsconfig.json`, extending `packages/config`.
  - Add `fid/build/` to `.gitignore`.
  - Run `pnpm install`.
- [ ] T002 [P] Add `flutter_svg`, pinned exactly (latest stable at least two weeks old, no caret),
  to `mobile/pubspec.yaml`.
  - Run `flutter pub get`.
  - Add its row ("Icons and scene drawn from the boards' SVG", feature 007) to the Packages table
    in `mobile/README.md`.
- [ ] T003 [P] Vendor the static fonts into `mobile/test/fonts/`:
  - `Roboto-{Regular,Medium,SemiBold,Bold}.ttf` with `OFL-Roboto.txt` (OFL since Roboto 3);
  - `NotoSansArabic-{Regular,Medium,SemiBold,Bold}.ttf` with `OFL-NotoSansArabic.txt`.

  Record the sources and versions in `mobile/test/fonts/README.md`. They are test-only: do not
  list them under `flutter: fonts:` in `pubspec.yaml`.
- [ ] T004 [P] Create `mobile/dart_test.yaml` with tag `golden`.
  - Create `mobile/tool/goldens.sh`. It runs `GOLDENS=1 flutter test --tags golden $*` on macOS
    with the pinned Flutter (it refuses another OS or Flutter version), with `--update` mapped to
    `--update-goldens`. (Amended 2026-11-11: the Linux Docker image is not published for this
    Flutter version; the owner chose macOS.)
  - Make it executable.
- [ ] T005 [P] Extend `scripts/check-scenario-tests.mjs` (this also covers 006 R7 if it has not
  landed):
  - `SEARCH_ROOTS` gains `apps/mobile/test` and `tools/design-fidelity/tests`;
  - `SKIP` gains `.dart_tool`, `build` and `goldens`;
  - a Dart line counts as named when the id is inside `test(`, `testWidgets(`, `group(` or
    `blocTest`.

  Add `node scripts/check-scenario-tests.mjs specs/007-mobile-foundation/quickstart.md` to
  `check:scenarios` in `package.json`.
- [ ] T006 [P] Add root scripts `fidelity` (`pnpm --filter design-fidelity exec playwright test`)
  and `fidelity:report` (`pnpm --filter design-fidelity exec playwright show-report build/report`)
  to `package.json`.
- [ ] T007 Add a job `mobile` to `.github/workflows/ci.yml` (research R12). It runs on
  `macos-15` (the golden platform) and:
  - checks out the repo, sets up Flutter 3.47.9 with a pinned action, and sets up Node 24 and pnpm;
  - in `apps/mobile`: `flutter pub get`, `dart format --set-exit-if-changed lib test`,
    `flutter analyze`, `GOLDENS=1 flutter test --coverage`;
  - checks the 80 % changed-line coverage gate;
  - runs `pnpm install --frozen-lockfile`, `pnpm --filter design-fidelity exec playwright install chromium`
    and `pnpm fidelity`;
  - uploads `tools/design-fidelity/build/report` as an artifact, always.

  Note in `mobile/README.md` ("Not done yet" loses the CI line) that branch protection must
  require `mobile`.

**Checkpoint**: `pnpm install` works, `flutter pub get` works, and the CI job exists. It may fail
until later phases add tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tokens, test harness and manifest reader that every story uses.

### Tests first

- [ ] T008 [P] Write `mobile/test/core/theme/shoot_type_test.dart`.
  - Every role in research R3 has the exact size, weight, height and letter-spacing in px
    (`em × size`).
  - `TextLeadingDistribution.even` is set on the theme.
  - The `num` helper adds `FontFeature.tabularFigures()`.
- [ ] T009 [P] Extend `mobile/test/core/theme/shoot_colors_test.dart`.
  - `bodyInk` has at least 4.5:1 on `ground`, `panel`, `panelSolid` and `tile`, in light and dark.
  - `surfaceSunk` exists in both themes.
  - Every role in `tokens.css` `:root` and `.dark` has a Dart value. The test parses
    `specs/design-system/tokens.css` by repo-relative path.
- [ ] T010 [P] Write `mobile/test/core/theme/css_gradient_test.dart` and
  `mobile/test/core/theme/shoot_shadows_test.dart`.
  - `cssShadow(0,24,60,0,c)` gives `blurRadius ≈ 51.1` (±0.1).
  - `linear-gradient(160deg, …)` gives begin/end alignments whose stops land on the CSS gradient
    line for a 44×44 and a 296×180 box.
  - `radial-gradient(circle at 72% 22%, … 46%)` has the right centre and radius.
  - Each is checked against values from research R8.

### Implementation

- [ ] T011 Add the new roles to `specs/design-system/tokens.css` (`:root` and `.dark`) and to the
  `@theme inline` map: `--body-ink`, `--surface-sunk` and the scene shades `--scene-tile-alt-top`,
  `--scene-tile-alt-bottom`, `--scene-tile-deep` (research R4).
  - Light values are `#3a342f`, `#e6e0d9`, `#f1dcc4`, `#e6c8a8` and `#b98a66`.
  - Propose the dark values so that T009 passes, and replace the "Colours the boards use that
    have no role yet" comment with the roles.
  - Get the owner's approval of the dark values in the pull request.
- [ ] T012 Add `bodyInk`, `surfaceSunk` and their `on…` partners where needed to
  `mobile/lib/core/theme/shoot_colors.dart`, light and dark, with the same values as T011.
- [ ] T013 [P] Create `mobile/lib/core/theme/shoot_type.dart`: `ShootType`, holding the roles in
  research R3 as `TextStyle`s, plus `ShootType.num(style)`.
  - Wire it into `mobile/lib/core/theme/app_theme.dart`: `textTheme` mapped from the roles,
    `TextHeightBehavior(leadingDistribution: TextLeadingDistribution.even)` set through
    `DefaultTextHeightBehavior` in `app.dart`, and `fontFamilyFallback: ['Noto Sans Arabic']`.
- [ ] T014 [P] Create these in `mobile/lib/core/theme/`:
  - `shoot_shadows.dart`: `cssShadow` and `ShootShadows.panel/sheet/lift` per theme, from
    `tokens.css`;
  - `css_gradient.dart`: `cssLinearGradient(deg, stops)`, `cssRadialGradient(...)`;
  - `shoot_scene.dart`: a `ThemeExtension<ShootScene>` holding every `--scene-*`, `--sweep-*`,
    corner-glow, glint and pulse role, light and dark, registered in `app_theme.dart`.
- [ ] T015 [P] Extend `mobile/lib/core/theme/shoot_tokens.dart`:
  - sizes `header = 58`, `rowBlock = 7`, `pane = 1080`, `carouselRatio = 296 / 360`,
    `maxColumn = 600`;
  - `ShootArrive` (rise 500, stagger 70, firstDelay 60, focus 700, roll 700, draw 500, grow 900,
    write 1100, deal 600, shake 450 ms);
  - `ShootAmbient` (glint 7 s, keylight 14 s, settle 5 s, drift 44 s, pulse 2.4 s,
    `selfStartedBudget = 5 s`).
- [ ] T016 Create `mobile/test/flutter_test_config.dart`:
  - load every font in `test/fonts/` with `FontLoader`: `Roboto` for the four Roboto weights,
    `Noto Sans Arabic` for the four Arabic weights;
  - set `debugDisableShadows = false`;
  - register a fixed `Clock` (2026-12-14 10:00 Asia/Dubai) for tests;
  - skip tests tagged `golden` unless `GOLDENS=1`.
- [ ] T017 Create `mobile/lib/core/time/clock.dart`, a `Clock` interface with a system
  implementation, registered in `mobile/lib/core/di/injection.dart`. Tests get the fixed clock
  from T016.
- [ ] T018 Create the golden harness `mobile/test/helpers/golden.dart` (research R10).
  - `pumpBoard(tester, id: '37', variant: Variant.enLight, child: …)`:
    - reads `w`, `h` and `boxes` from `specs/design-system/canvas/manifest.json`;
    - sets `tester.view.physicalSize = Size(w*2, h*2)` and `devicePixelRatio = 2`;
    - text scale 1, zero padding, `MediaQueryData(disableAnimations: true)`;
    - `TargetPlatform.android`;
    - locale and theme from the variant;
    - asserts `matchesGoldenFile('goldens/<id>/<variant>.png')`;
    - writes `goldens/<id>/<variant>.boxes.json` from every `ValueKey('fidelity:<name>')`
      (`tester.getRect`, logical px).
  - `pumpSelfBaselines(...)` renders at 393×852, 430×932, 768×1024, 1024×1366 and text scale
    2.0 into `goldens/<id>/self/`, and fails on any `FlutterError` overflow.
- [ ] T019 [P] Create `fid/src/manifest.ts`. It loads `canvas/manifest.json` and validates it per
  contracts/manifest.md:
  - ids unique;
  - `reason` required with `threshold`;
  - the board file exists;
  - `variantOf` points at an existing id.

  Export `comparableScreens()`: target `mobile`, a non-null `feature`, and the feature marked
  shipped in `fid/shipped.json`, which is `["007-mobile-foundation"]` for now.
- [ ] T020 [P] Create `fid/src/fonts.ts`, which builds an `@font-face` block from
  `apps/mobile/test/fonts/*` (file URLs, the weights in T003) plus a
  `.root, .root * { font-family: Roboto, 'Noto Sans Arabic' !important }` rule (research R7).
- [ ] T021 Create `fid/playwright.config.ts`:
  - project `refs` (`tests/refs.spec.ts`, `tests/derivation.spec.ts`);
  - project `compare` (`tests/compare.spec.ts`, `dependencies: ['refs']`);
  - `use: { deviceScaleFactor: 2, reducedMotion: 'reduce' }`;
  - `snapshotPathTemplate: 'build/refs/{arg}{ext}'`, `updateSnapshots: 'none'`;
  - reporter `html` in `build/report`;
  - `workers` 4, `retries` 0.

**Checkpoint**: tokens, type and theme pass their tests. The golden harness and the manifest
reader exist.

---

## Phase 3: User Story 1 — Every screen looks exactly like its design (P1) 🎯 MVP

**Goal**: screen 37 is built from the library and passes the fidelity check in English light, with
review images.

**Independent test**: `pnpm fidelity --grep "37"` passes. Moving the heading 2 px makes it fail
and name `h1`.

### Tests first

- [ ] T022 [P] [US1] Write `fid/tests/manifest.spec.ts`:
  - **`MF-US1-S4`**: a manifest copy with `threshold` and no `reason` throws, naming the screen;
  - **`MF-US1-S5`**: screens with `changedSinceLastExport` come back from `needsReview()`.
- [ ] T023 [P] [US1] Write `fid/tests/compare.spec.ts`, covering each comparable screen and its
  variant `en-light` (the other variants come in US2). Using the reference from `refs` and the
  golden at `apps/mobile/test/goldens/screens/goldens/<id>/<variant>.png`:
  - **`MF-US1-S1`**: `toMatchSnapshot` with the screen's `maxDiffPixelRatio`; the geometry gate
    over `boxes`, ±1; attachments `side-by-side.png`, `overlay.png` and `result.json`.
  - **`MF-US1-S2`**: on a fixture golden with the heading shifted 2 px
    (`fid/tests/fixtures/37-h1-shift.png` plus its boxes), the geometry gate fails with a message
    naming `h1` and `dy=2`.
  - **`MF-US1-S3`**: on a fixture golden with a recoloured block over 2 % of pixels, it fails and
    reports `diffRatio` against `threshold`.
- [ ] T024 [P] [US1] Write `mobile/test/goldens/screens/37_not_found_golden_test.dart`
  (`@Tags(['golden'])`): `pumpBoard` for screen 37 in `en-light`, with self-baselines.
- [ ] T025 [P] [US1] Write widget tests in `mobile/test/core/widgets/`:
  - `shoot_header_test.dart`, `wordmark_test.dart`, `shoot_icon_button_test.dart`,
    `top_hit_test.dart`, `shoot_row_test.dart`, `icon_tile_test.dart`, `empty_state_test.dart`;
  - each checks size, padding and type from contracts/component-catalogue.md, the states, and
    that the fidelity keys exist.

### Implementation

- [ ] T026 [P] [US1] Create `fid/src/review.ts`. In a page `<canvas>` it draws:
  - `sideBySide(board, app)`: board | app | |diff|, at 1×;
  - `overlay(board, app)`: the app at 50 % alpha over the board, plus a difference-blend strip.

  Both return PNG buffers for `testInfo.attach`.
- [ ] T027 [US1] Write `fid/tests/refs.spec.ts`. For each comparable screen and its manifest
  variants:
  - route `**/support.js` to an empty 200 response;
  - `page.goto(file://…/canvas/<board>)` with the fonts from T020 injected;
  - assert `.root` is `w×h`;
  - screenshot `.root` (`animations: 'disabled'`) to `build/refs/<id>/<variant>.png`;
  - write the `boxes` rects to `.boxes.json`; a selector matching anything other than exactly one
    element fails.

  `en-light` only in this phase.
- [ ] T028 [US1] Implement `fid/tests/compare.spec.ts` to make T023 pass, using T019, T026 and
  T027. The report header lists:
  - the screens needing review;
  - the screens skipped because their feature has not shipped;
  - the overrides, with reasons.
- [ ] T029 [P] [US1] Copy the icon paths used by boards 37 and 39 (search, person, calendar,
  chevron, back, refresh, WhatsApp) verbatim into `mobile/assets/icons/*.svg`. Declare the folder
  under `flutter: assets:`. Create `mobile/lib/core/widgets/shoot_icon.dart` (`ShootIcon(name,
  size, color, mirror)`, stroke from the file).
- [ ] T030 [P] [US1] Create in `mobile/lib/core/widgets/`, each per the catalogue and with its
  fidelity key:
  - `shoot_scaffold.dart`: ground, `CornerGlow`, safe area, centred column ≤ `maxColumn`;
  - `shoot_header.dart` (`ValueKey('fidelity:header')`);
  - `wordmark.dart` (`fidelity:wordmark`);
  - `shoot_icon_button.dart`;
  - `corner_glow.dart`.
- [ ] T031 [P] [US1] Create `mobile/lib/core/widgets/top_hit.dart` (`fidelity:topHit`): 50 high,
  radius 9, `primary`, type `action`, optional trailing price and chevron, the pressed colour
  `primaryHover`, and the disabled and loading states. The glint comes in US4.
- [ ] T032 [P] [US1] Create in `mobile/lib/core/widgets/`:
  - `shoot_row.dart`: min 48, gap 12, leading tile, trailing chevron that mirrors;
  - `icon_tile.dart`: 30, radius 8, `surfaceSunk`;
  - `empty_state.dart`: tile, meta line, title, body (max width 260, `mute`, 15/1.6) and an
    actions slot.
- [ ] T033 [US1] Build `mobile/lib/core/routing/not_found_page.dart` to board 37:
  - header with the wordmark and a language button;
  - centred empty state ("404", "That page isn't here", body);
  - the "Where to next" rows (Browse creators, Your bookings);
  - Top Hit "Start a brief".

  Strings go in `mobile/lib/core/l10n/arb/app_en.arb` with descriptions, and in `app_ar.arb`,
  written in Arabic and reviewed. The heading carries `ValueKey('fidelity:h1')`; add `h1` to
  screen 37's boxes by giving the board's heading a stable selector in
  `canvas/build-manifest.mjs` (`main h1`).
- [ ] T034 [US1] Run `apps/mobile/tool/goldens.sh --update` for screen 37, then `pnpm fidelity`.
  Fix the widgets until the result is `diffRatio ≤ 0.01` with every box within 1 px. Commit the
  goldens. Record the measured `diffRatio` per variant in research R9 as the calibration.

**Checkpoint**: MF-US1-S1 to S5 pass; screen 37 matches its board in English light.

---

## Phase 4: User Story 2 — English and Arabic, light and dark (P1)

**Goal**: all four variants have references, the derivation is validated against boards 42 and
43, and screen 37 passes in all four.

**Independent test**: `pnpm fidelity --grep derivation` passes; screen 37 passes in four variants.

### Tests first

- [ ] T035 [P] [US2] Write `fid/tests/derivation.spec.ts`:
  - **`MF-US2-S1`**: for every board, the tokenised `en-light` render is pixel-identical to the
    raw render (`maxDiffPixels: 0`);
  - **`MF-US2-S2`**: the derived `ar-dark` of 21 vs board 42, and of 13 vs board 43, at the
    default threshold;
  - **`MF-US2-S4`**: a board copy with an unmapped colour (`#123456` on `.h1`) makes `tokenise`
    throw a message naming the board, selector, property and colour.
- [ ] T036 [P] [US2] Extend `fid/tests/compare.spec.ts` with **`MF-US2-S3`**: screen 37 is
  compared in `en-dark`, `ar-light` and `ar-dark`.
- [ ] T037 [P] [US2] Write `mobile/test/core/l10n/board_strings_test.dart`. Every Arabic value in
  `canvas/strings.ar/S10-not-found.json` and `S10c-error.json` equals the ARB value for the same
  key, so the references and the app say the same thing.

### Implementation

- [ ] T038 [US2] Create `fid/src/tokenise.ts` (research R5).
  - Parse `specs/design-system/tokens.css` `:root` into a map from value to roles.
  - Normalise `#rgb`, `#rrggbb` and `rgba()` with spacing variants.
  - Rewrite the board's `<style>` text and `style=""` attributes to `var(--role)`, choosing by
    property when ambiguous, plus `fid/tokenise.overrides.json`.
  - Inject `tokens.css`, and add `class="dark"` for dark variants.
  - Throw on an unmapped colour (graphics-only scene gradients map to `--scene-*`).
- [ ] T039 [US2] Create `fid/src/localise.ts` (research R6).
  - Set `dir="rtl"` and `lang="ar"` on `.root`.
  - Replace text nodes from `canvas/strings.ar/<board>.json`, with English as the key, trimmed
    and whitespace-collapsed.
  - Mirror elements with class `mir` and the known direction paths (`m15 6-6 6 6 6`,
    `m9 6 6 6-6 6`).
  - Throw on an English text node with no translation, unless it is listed in that file's
    `"keep"` array (brand, numbers, codes).
- [ ] T040 [US2] Write `canvas/strings.ar/S10-not-found.json`, `S10c-error.json`,
  `S09b-signin-code.json` and `S04-quotation.json`.
  - For 21 and 13, take the Arabic from boards 42 and 43, so the derivation compares like with
    like.
  - For 37 and 39, use the same text as T033 and T066.
  - The Arabic is written by someone who writes Arabic, not machine-translated.
- [ ] T041 [US2] Extend `fid/tests/refs.spec.ts` to render every manifest variant: tokenise for
  dark, localise for Arabic, `colorScheme` from the variant.
- [ ] T042 [US2] Add `en-dark`, `ar-light` and `ar-dark` to `37_not_found_golden_test.dart`.
  Update the goldens, run `pnpm fidelity` and fix until all four variants pass.
  - If MF-US2-S2 cannot pass at 1 %, stop. Report the side-by-side images to the owner and
    choose: ask the designer for the missing variants (the research R5 fallback), or approve a
    documented threshold.

**Checkpoint**: four-variant references exist; the derivation is validated; screen 37 passes in all
four.

---

## Phase 5: User Story 3 — One set of building blocks (P1)

**Goal**: every component in contracts/component-catalogue.md exists, is tested, is in the gallery
and has component goldens.

**Independent test**: the gallery test passes, and every component golden passes in four variants.

### Tests first

- [ ] T043 [P] [US3] Write `mobile/test/core/widgets/rtl_test.dart` (**`MF-US3-S2`**).
  - For every catalogue widget, pump it in Arabic and assert that its start and end children
    swap sides.
  - Direction icons (back, chevron, carousel arrows) are mirrored.
  - No `EdgeInsets.only(left|right)` and no `Alignment.centerLeft|Right` appear in
    `lib/core/widgets/`, and no widget there holds a user-visible string literal (FR-015). Use a
    source scan in the test.
- [ ] T044 [P] [US3] Write `mobile/test/core/widgets/large_text_test.dart` (**`MF-US3-S3`**). For
  every catalogue widget at `TextScaler.linear(2.0)`:
  - no overflow error;
  - every tappable target is at least 44 × 44 (`tester.getSize` on the semantics node's rect).
- [ ] T045 [P] [US3] Write `mobile/test/core/widgets/semantics_test.dart` (**`MF-US3-S4`**).
  Every interactive catalogue widget exposes:
  - a label in the current locale;
  - its role (button, link, toggle, textField, slider/adjustable for the carousel);
  - its state (selected, enabled, checked).

  Use `tester.getSemantics` and `matchesSemantics`.
- [ ] T046 [P] [US3] Write `mobile/test/core/gallery/gallery_page_test.dart` (**`MF-US3-S1`**):
  - the gallery lists one section per catalogue entry;
  - each section shows every state the catalogue names.
- [ ] T047 [P] [US3] Write `mobile/test/goldens/components/components_golden_test.dart`
  (`golden`): each component in its states, in four variants, at 360 wide. These are
  self-baselines that sit alongside the board comparison of the screens that use them.

### Implementation

Each widget gets its own widget test file with size and states, written first, in
`mobile/test/core/widgets/<file>_test.dart`.

- [ ] T048 [P] [US3] Actions and surfaces in `mobile/lib/core/widgets/`:
  - `secondary_button.dart` (`.btn2`: 44 high, radius 9, 1 px `controlBorder`, 16/500);
  - `text_link.dart`;
  - `shoot_panel.dart` (`.panel` / `.sum`);
  - `floating_panel.dart` (`.bar`: translucent `panel`, shadow `panel`);
  - `shoot_sheet.dart` (radius 20, shadow `sheet`);
  - `group_label.dart`;
  - `summary_row.dart`;
  - `photo_tile.dart`.
- [ ] T049 [P] [US3] Inputs in `mobile/lib/core/widgets/`:
  - `shoot_field.dart` (44 high, radius 9, error and focus states, label above);
  - `shoot_text_area.dart` (min 92);
  - `picker_field.dart` (chevron, opens a `ShootSheet`);
  - `choice_chip.dart` and `chip_group.dart` (40 high; on is `accent`/`onAccent`/500; wraps,
    gap 8);
  - `segmented_control.dart` (40 high; the on segment is `ink`/`ground`);
  - `phone_field.dart` (52 high, +971 segment, 20 px number at 0.02em, tabular);
  - `otp_code_input.dart` (6 equal cells × 56 high, digits 26/500, one `TextField` underneath with
    `autofillHints: [AutofillHints.oneTimeCode]`, error shake from US4).
- [ ] T050 [P] [US3] Status and data in `mobile/lib/core/widgets/`:
  - `status_badge.dart` (24 high, pill, 13/500, tones);
  - `money.dart` (`AED 950`, locale digits, tabular);
  - `quote_lines.dart`;
  - `progress_bar.dart` (6 high, radius 3);
  - `step_strip.dart` (tabs 44 high, 15/500, 2 px accent underline, a state line per tab);
  - `message_banner.dart` (`warn`/`msg` tones, live region);
  - `calendar_month.dart` (7-column grid, 44 cells, free/blocked/booked/today, the first weekday
    from the locale).
- [ ] T051 [P] [US3] Content and graphics in `mobile/lib/core/widgets/`:
  - `creator_card.dart` (width `carouselRatio × screen width`, chosen = 2 px `accent`);
  - `snap_carousel.dart` (`PageView` with `viewportFraction = 296/360`, padding 32, dots that
    widen, "n of m" announced through `SemanticsService.announce`);
  - `rich_content.dart` (paragraph, heading, list, link and quote nodes from a plain node list);
  - `scene_tile.dart` (three gradient variants by index, from `ShootScene` via `css_gradient`);
  - `golden_hour_scene.dart` (`SvgPicture.string` from the board's scene SVG with colours from
    `ShootScene`).
- [ ] T052 [US3] Create `mobile/lib/core/gallery/gallery_page.dart`:
  - one section per catalogue entry, every state, using placeholder data from
    `mobile/test/fixtures/` copied into `lib/core/gallery/gallery_fixtures.dart`;
  - language and theme switches at the top.

  Register `/_gallery` only under `kDebugMode`, in `mobile/lib/core/routing/app_router.dart`.
- [ ] T053 [US3] Run the impeccable detector on the boards that use catalogue components (the
  detector reads HTML, not Dart). Raise anything it flags with the owner as a canvas change, never as
  a silent app deviation. Then review the gallery's component goldens (T047) against the boards by eye
  and fix any widget that differs.

**Checkpoint**: MF-US3-S1 to S4 pass; every catalogue component exists with goldens in four
variants.

---

## Phase 6: User Story 4 — Motion that helps and then stops (P2)

**Goal**: the arrive and ambient tiers, the 5 s cap and reduced motion.

**Independent test**: the motion tests pass; screen 39 stops moving within 5 s.

### Tests first

- [ ] T054 [P] [US4] Write `mobile/test/core/motion/motion_policy_test.dart`:
  - **`MF-US4-S1`**: pump the error page (and each arrive widget) and `pump(5s)`; then
    `tester.binding.hasScheduledFrame` is false and no `Ticker` is active;
  - **`MF-US4-S2`**: with `disableAnimations: true`, the first frame's render tree equals the
    tree after `pumpAndSettle`. Compare the golden of frame 0 with the settled one.
- [ ] T055 [P] [US4] Write `mobile/test/core/motion/ambient_pause_test.dart`
  (**`MF-US4-S3`**): two ambient children under `AmbientPause`. Pressing Pause stops both tickers;
  pressing it again restarts them. With reduced motion they never start.

### Implementation

- [ ] T056 [US4] Create `mobile/lib/core/motion/motion_policy.dart`: `MotionPolicy.of(context)`
  returns `reduced` (from `MediaQuery.disableAnimationsOf`) and `selfStartedBudget`. The README
  notes that every self-started animation must finish inside the budget.
- [ ] T057 [P] [US4] Create the arrive widgets in `mobile/lib/core/motion/`: `rise.dart` (with a
  `Stagger` wrapper: 70 ms steps, first at 60), `focus_in.dart`, `roll.dart`, `draw_check.dart`,
  `grow.dart`, `deal.dart`, `write_in.dart` and `shake.dart`.
  - Each plays once per mount.
  - Each uses the durations and curves in `ShootArrive`.
  - Each builds its end state directly when `reduced` is set.
- [ ] T058 [P] [US4] Create `mobile/lib/core/motion/glint.dart`: a sheen at 26 % width crosses
  once, 1.1 s at 2.4 s, reversed in RTL. Add it to `TopHit` (the `glint: false` parameter turns it
  off).
- [ ] T059 [P] [US4] Create `mobile/lib/core/motion/ambient_pause.dart`: an `AmbientPause`
  inherited notifier plus a pause button widget, and `ambient.dart`, a base for looping children
  that stop when paused or reduced. Without an `AmbientPause` ancestor they assert in debug builds
  (FR-021).
- [ ] T060 [US4] Apply `Stagger`/`Rise` to the content of screen 37 and the error page, and
  `FocusIn` to `SceneTile` and `PhotoTile`. Confirm the goldens are unchanged, since they render
  with animations off.

**Checkpoint**: MF-US4-S1 to S3 pass.

---

## Phase 7: User Story 5 — The app finds its way (P2)

**Goal**: the path table, the `/ar` prefix, the fallbacks, screen 39 and the first-run flag.

**Independent test**: the router and error-page tests pass; screen 39 passes fidelity in four
variants.

### Tests first

- [ ] T061 [P] [US5] Write `mobile/test/core/routing/app_router_test.dart`:
  - **`MF-US5-S1`**: `/does-not-exist` shows `NotFoundPage` in English;
  - **`MF-US5-S2`**: `/ar/does-not-exist` shows it in Arabic with `Directionality.rtl`, and the
    locale is saved;
  - **`MF-US5-S5`**: every route in `app_routes.dart` with `built: false` resolves to
    `NotFoundPage`;
  - **`MF-US3-S5`**: with `kDebugMode` overridden to false (through an injected `isDebug` flag),
    `/_gallery` shows `NotFoundPage`.
- [ ] T062 [P] [US5] Write `mobile/test/core/routing/error_page_test.dart` (**`MF-US5-S3`**):
  - a route whose builder throws shows `ErrorPage`, with "Try again" and no exception text in the
    tree;
  - "Try again" re-runs the navigation;
  - the WhatsApp row is hidden when no site number is available.
- [ ] T063 [P] [US5] Write `mobile/test/core/first_run/first_run_store_test.dart`
  (**`MF-US5-S4`**). Using the 006 in-memory `PreferencesStore`:
  - `markWelcomeSeen()` then a new store instance means `welcomeSeen` is true;
  - an unreadable value is false;
  - a failed write keeps the session value.
- [ ] T064 [P] [US5] Write `mobile/test/goldens/screens/39_error_golden_test.dart` (`golden`,
  four variants, plus self-baselines).

### Implementation

- [ ] T065 [US5] Create `mobile/lib/core/routing/app_routes.dart`: the full path table from
  contracts/routes.md as `AppRoute(path, owner, built, auth)`.
  - Rewrite `mobile/lib/core/routing/app_router.dart` to:
    - build `GoRoute`s for `built` routes only;
    - strip `/ar` in `redirect` and call `LocaleCubit.select(ar)`;
    - send unbuilt and unknown paths to `NotFoundPage`;
    - set `errorBuilder` to `ErrorPage`.
  - Keep the existing home route (`service_health`) until feature 010 replaces it.
- [ ] T066 [US5] Build `mobile/lib/core/routing/error_page.dart` to board 39, with strings in both
  ARB files. In `mobile/lib/main.dart`, set `ErrorWidget.builder` for release builds and
  `FlutterError.onError` (log without personal data). Add `ValueKey('fidelity:*')` for the
  manifest boxes of 39.
- [ ] T067 [US5] Create `mobile/lib/core/first_run/first_run_store.dart`, with
  `firstRun.welcomeSeen` stored through `PreferencesStore`. Register it in DI. Add the
  first-launch redirect hook in `app_router.dart`, inactive until `/welcome/:step` is built
  (feature 010). Deep links never redirect.
- [ ] T068 [US5] Run `tool/goldens.sh --update` for 39, then `pnpm fidelity`, and fix until all
  four variants pass.

**Checkpoint**: MF-US5-S1 to S5 and MF-US3-S5 pass; screens 37 and 39 pass in four variants.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T069 [P] Update `mobile/README.md`:
  - Themes: the type scale, the new roles and `ShootScene`;
  - a new "Design fidelity" section (commands, macOS-only goldens, the fonts);
  - "Add a feature" gains "build to the board, add the fidelity keys, add the screen to
    `fid/shipped.json`";
  - "Not done yet" loses the motion and scene lines.
- [ ] T070 [P] Update `specs/design-system/README.md` and `.claude/skills/design-fidelity/SKILL.md`
  with the calibrated thresholds from T034 and T042, and any `tokenise.overrides.json` entries.
- [ ] T071 [P] Make the iOS check from quickstart manual check 9: screens 37 and 39 against their
  boards in the iPhone simulator. Record notes in `.impeccable/review/mobile/`.
- [ ] T072 Run the impeccable finish review on screens 37 and 39 and the gallery, using the four
  variant goldens and the review images, until it returns `ship`. Then run the documenter to
  record the mobile components in `DESIGN.md`.
- [ ] T073 Run the full quickstart: `dart format`, `flutter analyze`, `flutter test`,
  `tool/goldens.sh`, `pnpm fidelity` twice (with identical results, SC-004) and
  `pnpm check:scenarios`, plus the manual checks 1–10. Tick SC-001 to SC-008.

---

## Requirement coverage

| Requirement | Tasks |
|---|---|
| FR-001 type scale | T008, T013, T011 (tokens.css) |
| FR-002 colour roles, AA | T009, T011, T012 |
| FR-003 shadows, radii, sizes, motion values | T010, T014, T015 |
| FR-010 component set | T025, T029–T032, T047–T051 |
| FR-011 RTL, mirrored icons | T043, T029 (`mirror`), T030–T032, T048–T051 |
| FR-012 targets, focus, semantics | T044, T045 |
| FR-013 large text | T044, T018 (text-scale 2.0 baselines) |
| FR-014 debug-only gallery | T046, T052, T061 (MF-US3-S5) |
| FR-015 no copy, no profession in components | T043 (source scan extended to user-visible literals), T053 |
| FR-020 motion tiers | T015, T057, T058 |
| FR-021 ambient only under Pause | T055, T059 |
| FR-022 5 s budget | T054, T056 |
| FR-023 reduced motion | T054, T057 |
| FR-030 web paths, `/ar` | T061, T065 |
| FR-031 unknown and unbuilt routes → 37 | T033, T061, T065 |
| FR-032 failure → 39 | T062, T066 |
| FR-033 first-run flag | T063, T067 |
| FR-034 centred column ≤ 600 | T030 (`ShootScaffold`), T018 (iPad baselines) |
| FR-040 canvas and manifest in the repo | done 2026-11-11 (`specs/design-system/canvas/`); T019 validates it |
| FR-041 references at size, 2×, motion off | T021, T027, T041 |
| FR-042 derived variants, validated on 42/43 | T035, T038–T042 |
| FR-043 pixel and geometry gates, override reasons | T022, T023, T028 |
| FR-044 side-by-side and overlay | T023, T026 |
| FR-045 missing reference fails, never regenerated | T021 (`updateSnapshots: 'none'`), T028 |
| FR-046 self-baselines and overflow | T018, T024, T064 |
| FR-047 CI blocks merging | T007 |
| FR-048 same fonts, fixed clock | T003, T016, T020 |
| SC-001 37 and 39 in four variants | T042, T068 |
| SC-002 derivation within 1 % | T035, T042 |
| SC-003 every component in gallery and goldens | T046, T047 |
| SC-004 deterministic | T073 (two runs) |
| SC-005 reviewer finds the difference in 30 s | T072 (finish review uses the report) |
| SC-006 motion budget and reduced motion | T054 |
| SC-007 no overflow at the listed sizes | T018, T024, T064 |
| SC-008 every scenario has a named test | T005, T073 |

---

## Dependencies & Execution Order

- **Setup** (T001–T007): no dependencies. T002–T006 run in parallel.
- **Foundational** (T008–T021): after Setup. It blocks every story.
- **US1** (T022–T034): after Foundational. It is the MVP: one screen proven against its board.
- **US2** (T035–T042): after US1, because it extends the refs and compare specs and needs
  screen 37.
- **US3** (T043–T053): after Foundational. It can run alongside US1 and US2, since its widget
  files differ from T029–T032. The goldens in T047 need T018.
- **US4** (T054–T060): after US1 (it needs the Top Hit and screen 37). Alongside US3.
- **US5** (T061–T068): after US1. The screen 39 fidelity in T068 needs US2's four-variant
  references.
- **Polish** (T069–T073): last.

## Parallel examples

- **Foundational**: T008, T009 and T010 together (tests). Then T013, T014 and T015 together, and
  T019 and T020 together.
- **US1**: T022, T023, T024 and T025 together. Then T026, T029, T030, T031 and T032 together.
- **US3**: T043–T047 together. Then T048, T049, T050 and T051 together (different files).
- **US5**: T061–T064 together.

## Implementation strategy

1. **MVP**: Setup, then Foundational, then US1. Screen 37 is proven in English light. Stop and
   show the owner the side-by-side report.
2. US2 makes the check trustworthy in all four variants. This is the gate for every later screen
   feature.
3. US3 and US4 fill out the library and motion. US5 closes the shell and screen 39.
4. Features 009–015 then each add their screens to `fid/shipped.json`, and their boards become
   gated automatically.
