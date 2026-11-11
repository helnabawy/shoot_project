# Research: Mobile foundation

Decisions for feature 007. Each entry gives the **Decision**, then the **Rationale**, then the
**Alternatives** considered.

## R1. Where the design lives and how it is versioned

- **Decision**:
  - The canvas boards, `canvas.json`, the design system's `tokens.json` (`ds-tokens.json`) and a
    generated `manifest.json` are committed under `specs/design-system/canvas/`.
  - They were exported 2026-11-11 from canvas version `1794329096-280b`.
  - `build-manifest.mjs` regenerates the manifest. It records a sha256 for each board and flags
    boards changed since the last export.
- **Rationale**:
  - The canvas has a file-format version but no content version, so a hash per board is the only
    way to know which goldens a design change affects.
  - Committing the boards keeps the check reproducible offline and in CI.
- **Alternatives**:
  - Fetching the canvas at check time: needs claude.ai auth in CI, and the result is not
    reproducible.
  - Committing rendered PNG references: large binary churn, and they go stale silently.

## R2. Manifest

- **Decision**: one entry per screen, as specified in [contracts/manifest.md](contracts/manifest.md).
  - Screen ids are canvas numbers: board file names do not follow them (`S03-details` is screen 09).
  - Key-element boxes come from the board's classes: `.hd` header, `.wm` wordmark, `.h1` heading,
    `.top` Top Hit.
  - Thresholds: the default is 1 %; screens 33–36 use 2 % with a written reason.
  - Board 41 (1440 web landing) is listed with target `web` and is not compared in this feature.
  - Boards 42 and 43 are listed as designer variants of 21 and 13.
- **Rationale**: one index serves the renderer, the comparison and the roadmap (each entry names
  its owning feature).
- **Alternatives**: naming conventions instead of a manifest. Rejected because the names are
  already inconsistent.

## R3. Type scale

- **Decision**: `shoot_type.dart` defines the roles read from the boards.

  | Role | Size and weight | Line height | Letter-spacing | Notes |
  |---|---|---|---|---|
  | wordmark | 22 / 700 | 1 | -0.03em | |
  | display | 34 / 700 | 1.2 | -0.03em | 30 on sign-in boards, as a variant |
  | title | 26 / 700 | 1.25 | -0.025em | |
  | heading | 20 / 600 | 1.3 | -0.01em | |
  | action | 17 / 600 | | | |
  | row | 16 | 1.3 | | |
  | button | 16 / 500 | | | |
  | body | 15 | 1.6 | | colour body-ink |
  | chip | 15 | | | |
  | meta | 13 | 1.4 | | colour mute |
  | badge | 13 / 500 | | | |
  | group label | 11 / 600 | | 0.06em | uppercase |

  How the values carry over:
  - Letter-spacing in em becomes `em × fontSize` logical pixels.
  - CSS line-height maps to `height` with `TextLeadingDistribution.even` in `TextHeightBehavior`,
    set once on the theme.
  - Numbers use `FontFeature.tabularFigures()`.
  - The same scale is in `tokens.css` as `--text-*` (added 2026-11-11).
- **Rationale**:
  - CSS splits half-leading evenly above and below the text. Flutter's default puts the extra
    leading by font metrics, which shifts text by 1–3 px against the board.
  - Even leading is what makes the ±1 px gate achievable.
- **Alternatives**: Material `TextTheme` names. Rejected because they don't map one-to-one to the
  boards' roles. The `TextTheme` is still filled from these roles so stock widgets match.

## R4. Missing colour roles

- **Decision**: add these roles.
  - `bodyInk`: `#3a342f` light, used by `.body` text on 36 boards.
  - `surfaceSunk`: `#e6e0d9` light, 65 uses (tracks, dividers on tiles; confirmed per use during
    implementation).
  - Scene shades `#f1dcc4`, `#e6c8a8`, `#b98a66`, into the `ShootScene` extension.
  - Dark values are proposed during implementation, contrast-tested by `shoot_colors_test.dart`
    (text roles ≥ 4.5:1 on ground, panel and tile), and approved by the owner in the finish review.
  - Every new role is added to `tokens.css` in the same change.
- **Rationale**: FR-002. The reference derivation (R5) fails on any colour without a role, so
  these must exist first.
- **Alternatives**: mapping `#3a342f` to `ink`. Rejected because it changes the boards' look.

## R5. Dark references: tokenising the boards

- **Decision**: `tools/design-fidelity/src/tokenise.ts` rewrites each board's `<style>` and inline
  styles, replacing hex and rgba values with `var(--role)`.
  - The map is built from `tokens.css`, light block, value → role.
  - Ambiguous values are resolved by the CSS property they sit on. For example, `#0a60ff` is
    `--accent` on `background` and `--focus` on `outline` or `box-shadow`. Overrides are kept in
    `tokenise.overrides.json`.
  - An unmapped colour fails with its board, selector and property (MF-US2-S4).
  - Dark means loading `tokens.css` and adding `class="dark"` on the root.
  - **Proof:** the tokenised English light render must be byte-identical to the raw board's
    render (MF-US2-S1).
- **Rationale**: the boards hard-code light hex values. The design system defines one value per
  role per theme, which is exactly the mapping the app uses.
- **Alternatives**:
  - Asking the designer for dark boards: about 40 more boards, and slower. This is kept as the
    fallback if validation (R6) fails.
  - Inverting colours: wrong.

## R6. Arabic references

- **Decision**:
  - `localise.ts` sets `dir="rtl" lang="ar"` on the root.
  - It replaces text nodes using `specs/design-system/canvas/strings.ar/<board>.json`, which maps
    English to Arabic.
  - It mirrors direction-implying icons (`.mir` class or a known path list).
  - The Arabic text is the same text the app shows: ARB entries for interface strings, the shared
    fixtures for content. A test asserts the two agree.
  - Validation: the derived ar-dark renders of screens 21 and 13 are compared with boards 42 and 43
    at the default threshold (MF-US2-S2).
- **Rationale**: Arabic must be written, not machine-translated (constitution). One string source
  keeps the references and the app identical.
- **Alternatives**: machine translation, rejected. Arabic boards for every screen: the fallback.
- **Finding (2026-11-11)**: boards 42 and 43 are not pure variants of 21 and 13. Board 42 adds a
  wrong-code error message and moves the resend line; board 43 merges and reorders text nodes. No
  derivation can match them pixel for pixel, so they cannot validate it (MF-US2-S2).
- **Finding (2026-11-11)**: the designer's Arabic boards use their own type rules, the same in both:
  no letter-spacing, no uppercase, line-height 1.25 → 1.4, 1.375 → 1.6, 1.4 → 1.7, 1.625 → 1.8,
  display 34 → 32, wordmark 22 → 24, group label 11 → 12; the header padding mirrors; digit rows
  stay left to right. The dark corner glow's middle stop is `rgba(74, 58, 47, 0.22)` at 36 %.
- **Decision (owner, 2026-11-11)**: ask the designer for Arabic dark boards of 21 and 13 with the
  same content and state as the English boards, and to confirm the Arabic type rules. The Arabic
  derivation (T038–T042) waits for them. Request: [designer-request.md](designer-request.md).

- **Decision (2026-11-11, finish review)**: digits and Latin data stay in their own direction inside
  Arabic. The phone field, the one-time code and prices (`AED 950`) stay left to right, as on the
  designer's Arabic boards (board 42 sets `.boxes{direction:ltr}`; board 43 keeps `AED 700`); names
  and phrases supplied as data are wrapped in a first-strong isolate when their direction differs
  from the screen's (`lib/core/l10n/bidi.dart`).

## R7. Fonts and determinism

- **Decision**:
  - Vendor static Roboto 400/500/600/700 (OFL since Roboto 3; instances of the variable Android face, see `apps/mobile/test/fonts/README.md`) and Noto Sans Arabic 400/500/600/700 (OFL),
    with licence files, in `apps/mobile/test/fonts/`.
  - `test/flutter_test_config.dart` loads them with `FontLoader` under the families the theme
    resolves on Android (`Roboto`, with fallback `Noto Sans Arabic`).
  - It also sets `debugDisableShadows = false`, because the test default draws shadows as solid
    bands.
  - It injects a fixed `Clock`.
  - The reference renderer forces the same faces with an injected `@font-face` and
    `.root, .root * { font-family: Roboto, 'Noto Sans Arabic' }`.
  - Goldens use `TargetPlatform.android`.
  - The app itself ships no font.
- **Rationale**:
  - Ahem draws boxes.
  - System fonts differ per machine.
  - SF Pro's licence forbids redistribution and use off Apple platforms.
  - Same glyphs on both sides means differences are layout, which is what the gate is for.
- **Alternatives**:
  - Bundling Inter in the app: changes the design.
  - Comparing iOS simulator screenshots: not runnable headless in CI, and SF rendering differs from
    Chromium's anyway.

## R8. CSS to Flutter: shadows, blur, gradients

- **Decision**:
  - `cssShadow(x, y, blur, spread, color)` converts the CSS blur to Flutter's convention. CSS
    sigma is blur/2, and Flutter's `BoxShadow` sigma is `blurRadius × 0.57735 + 0.5`, so
    `blurRadius = (blur/2 − 0.5) / 0.57735`. The CSS 60 px panel shadow becomes about 51.1.
  - `css_gradient.dart` maps:
    - `linear-gradient(<deg>, …)`: CSS angle → `Alignment` begin/end on the gradient line, with
      CSS's length so stops land on the same pixels;
    - `radial-gradient(circle at x% y%, …)` and `ellipse W% H% at …`: centre, and radius to the
      farthest corner or the given size, using `GradientTransform` for ellipses.
  - Both are unit-tested against values measured from board renders.
- **Rationale**: scene tiles stack three gradients, and panels use 60 px shadows. A naive mapping
  is visibly off and fails the 1 % gate.
- **Alternatives**: raster images of scene tiles. Rejected because they can't theme and they add
  asset bytes.

## R9. The comparison

- **Decision**:
  - Playwright `compare` project:
    - reads each Flutter golden;
    - calls `expect(buffer).toMatchSnapshot(<id>/<variant>.png, { maxDiffPixelRatio, threshold: 0.2 })`,
      with `snapshotPathTemplate` pointing at `build/refs/` and `updateSnapshots: 'none'`, so a
      missing reference fails and references are never written from app output (FR-045);
    - runs a geometry gate comparing the board's `getBoundingClientRect()` boxes with the app's
      `boxes.json` (`tester.getRect` of keyed widgets), ±1 logical px (FR-043).
  - Review images come from `review.ts`, which draws in a page `<canvas>`:
    - side-by-side (board | app | diff);
    - overlay (50 % alpha plus a difference blend).

    Both are attached to the test.
  - The HTML report is uploaded as a CI artifact.
- **Calibration (2026-11-11, macOS goldens against Chromium references)**: screen 37 en-light
  diffRatio 0.001179 and en-dark 0.00115 against the 1 % default; every key box within 0.5 px. The
  difference is glyph anti-aliasing on the wordmark and the `404` meta line.
- **Reference fix**: the boards' Top Hit glint (`.top::after`) stays visible under reduced motion
  (`animation: none` leaves it on the button). The reference renderer hides it, as the board's own
  `.top.off` rule does, until the canvas is fixed (raised with the owner).
- **Rationale**: Playwright already ships pixelmatch-based diffing, an expected/actual/diff
  viewer and attachments. No new package is needed.
- **Alternatives**: `flutter_test`'s `matchesGoldenFile` against the board PNG directly. It has
  no geometry gate, no review images, and would need the references inside the Dart tree.

## R10. Golden harness

- **Decision**: `test/helpers/golden.dart` `pumpBoard(id, variant, child)`:
  - sets the view's physical size to (w×2, h×2) at device pixel ratio 2;
  - text scale 1, zero padding, `disableAnimations: true`;
  - locale and theme from the variant, fixture data from the shared examples;
  - writes `goldens/<id>/<variant>.png` and `.boxes.json`.

  Self-baselines go under `goldens/<id>/self/`: 393 and 430 wide, 768×1024, 1024×1366, and text
  scale 2.0. An overflow error fails the test.

  Golden tests are tagged `golden`:
  - `flutter test` locally skips them unless `GOLDENS=1`;
  - `tool/goldens.sh` runs them on macOS with the pinned Flutter 3.47.9, and the CI job runs them
    on a macOS runner. **Amended 2026-11-11**: the decision was a Linux image
    (`ghcr.io/cirruslabs/flutter`), which is not published for this Flutter version; the owner
    chose macOS, the platform they work on.
- **Rationale**: SC-004 needs determinism; FR-046 needs the overflow sizes.
- **Alternatives**: `golden_toolkit` or `alchemist` packages. Rejected because the needed parts
  are about 80 lines, and package-less is the README's rule.

## R11. Routing and fallbacks

- **Decision**:
  - `app_routes.dart` holds the one path table (see [contracts/routes.md](contracts/routes.md)).
  - The go_router `redirect`:
    - strips `/ar` and sets Arabic through `LocaleCubit`;
    - sends the first launch to `/welcome/1` once feature 010 registers it; until then this is
      a no-op;
    - routes known-but-unbuilt paths to not-found.
  - Screen 39 is shown by an `errorBuilder` and by `ErrorWidget.builder` in release builds, with
    `FlutterError.onError` logged without personal data.
  - Deep-link platform files (Associated Domains, Android App Links) belong to feature 008, which
    serves `.well-known`.
- **Rationale**: FR-030 to FR-033.
- **Alternatives**: a bottom tab bar. Rejected because the design has none: navigation is the
  header plus the menu (board 06, feature 010).

## R12. CI

- **Decision**: a new `mobile` job in `.github/workflows/ci.yml` on `macos-15` (amended 2026-11-11
  from `ubuntu-24.04`, with the golden platform; see R10) that:
  - sets up Flutter 3.47.9 from a pinned action;
  - runs `dart format --set-exit-if-changed lib test`, `flutter analyze` and
    `flutter test --coverage` (goldens included, `GOLDENS=1`);
  - checks the 80 % coverage gate on changed lines;
  - runs `pnpm --filter design-fidelity exec playwright install chromium --with-deps` and
    `pnpm fidelity`;
  - uploads the report.

  Branch protection requires the job.
- **Rationale**: FR-047. This closes the constitution 1.4.0 deferred TODO.
- **Alternatives**: running locally only. Rejected because fidelity would drift.
