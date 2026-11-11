# The fidelity pipeline, step by step

> **Status: planned** (feature 007). Paths and helper names follow the source plan; 007's
> `plan.md`, `research.md` and `quickstart.md` fix them.

## Files

| Path | Owner | Role |
|---|---|---|
| `specs/design-system/canvas/*.dc.html` | canvas export | the boards (never edited here) |
| `specs/design-system/canvas/manifest.json` | `build-manifest.mjs` | screen id → board, size, variants, boxes, threshold, sha256 |
| `specs/design-system/tokens.css` | design system | the token values `tokenise.ts` maps hex onto, light and `.dark` |
| `tools/design-fidelity/` | 007 | a pnpm workspace (`pnpm-workspace.yaml` gains `tools/*`); reuses `@playwright/test` 1.63.0, no new package |
| `tools/design-fidelity/src/{manifest,tokenise,localise,fonts,review}.ts` | 007 | load the manifest; hex → `var(--role)` (exceptions in `tokenise.overrides.json`); `dir`/`lang`/strings and icon mirroring; `@font-face` from the vendored fonts; side-by-side and overlay images |
| `tools/design-fidelity/tests/{refs,manifest,derivation,compare}.spec.ts` | 007 | the Playwright projects and checks |
| `tools/design-fidelity/build/` | generated, git-ignored | `refs/` and `report/` |
| `specs/design-system/canvas/strings.ar/<board>.json` | 007, then each screen's feature | the Arabic text per board (English → Arabic) |
| `apps/mobile/dart_test.yaml` | 007 | declares the `golden` tag |
| `apps/mobile/test/helpers/golden.dart` | 007 | `pumpBoard(id, variant)` |
| `apps/mobile/test/flutter_test_config.dart` | 007 | loads the vendored fonts, `debugDisableShadows = false`, fixed clock |
| `apps/mobile/test/fonts/` | 007 | Roboto and Noto Sans Arabic (static) with licences |
| `apps/mobile/test/goldens/screens/` | each screen's feature | one `<id>_<name>_golden_test.dart` per screen |
| `apps/mobile/tool/goldens.sh` | 007 | runs `flutter test --tags golden` in `ghcr.io/cirruslabs/flutter:3.47.2` |

## 1. Flutter goldens (`goldens.sh`)

The shared helper `pumpBoard(id, variant)` (`test/helpers/golden.dart`) reads the screen's w × h
from the manifest and, for the variant:

- sets the test view to w × h logical px at device pixel ratio 2 and text scale 1;
- sets the locale (`en` / `ar`) and theme (light / dark) the way the app does;
- injects a fixed `Clock` and `MediaQuery(disableAnimations: true)`;
- builds the screen's `…View` with state built from the shared API examples
  (`packages/domain/src/api/v1/examples/`), never from data typed into the test;
- matches `goldens/<id>/<variant>.png` and writes `<variant>.boxes.json` from the widgets keyed
  with the manifest's box names (rectangles in logical px, relative to the screen's origin).

Self-baselines (393, 430, 768, 1024 px wide; text scale 2.0) use the same helper with no board and
live under `goldens/<id>/self/`.

## 2. References (`refs` project)

For each mobile screen and variant: load the board from `file://` with `support.js` stubbed; for
derived variants apply tokenise, `class="dark"`, `dir="rtl"` / `lang="ar"` and the strings; inject
the vendored fonts; render in Chromium at device scale 2 with `reducedMotion: 'reduce'`. Assert the
`.root` is exactly w × h, screenshot `.root`, and write the boxes (each selector's bounding rectangle
relative to `.root`) as JSON.

## 3. Compare (`compare` project, depends on `refs`)

For each screen and variant:

- `expect(flutterPng).toMatchSnapshot('<id>/<variant>.png', { maxDiffPixelRatio, threshold: 0.2 })`,
  `maxDiffPixelRatio` from the manifest and `threshold` (the per-pixel colour tolerance) at
  Playwright's default; `updateSnapshots: 'none'`, so a missing reference fails and nothing is ever written
  from Flutter output;
- the geometry gate: every box in the reference JSON against the Flutter `boxes.json`, within
  `geometryTolerancePx` on x, y, width and height; a box missing on either side fails;
- attachments: a side-by-side image and a 50 % overlay.

The HTML report collects every comparison; CI uploads it as an artifact.

## 4. Validation of the derived variants

A dedicated test derives `ar-dark` for screens 21 and 13 and compares them with boards 42 and 43
(screenshotted as they are) under the same threshold and geometry gate. It runs with every
`pnpm fidelity`, so a change to `tokenise.ts` or the Arabic strings is checked against the designer's
own boards.

## When a board changes

1. Re-export the canvas and rerun `build-manifest.mjs` (`specs/design-system/README.md`).
2. The screens flagged `changedSinceLastExport` are stale. Run `pnpm fidelity` for them.
3. If the board's change is intended for the app, change the Flutter screen, rerun
   `goldens.sh --update`, and pass fidelity. Never copy the old reference back.
