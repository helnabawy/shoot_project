---
name: design-fidelity
description: The pixel-perfect gate between the approved design canvas and the Flutter app — the canvas boards in specs/design-system/canvas/ and their manifest.json (screen id, board file, w, h, variants, geometry boxes, threshold and reason, sha256), how the en-dark, ar-light and ar-dark references are derived (tokenise.ts, class="dark", dir="rtl" plus strings.ar.json, validated against designer boards 42 and 43), font and determinism rules (vendored Roboto and Noto Sans Arabic, never SF Pro, debugDisableShadows = false, goldens on Linux only through apps/mobile/tool/goldens.sh in Docker), thresholds (0.01, 0.02 for text-heavy boards) and the ±1 px geometry gate, the override policy, reading the review images, and the pnpm fidelity commands. Use this skill whenever a task builds or changes a mobile screen or core widget, adds or updates a Flutter golden, re-exports the canvas, touches tools/design-fidelity, asks whether the app "matches the design", or a fidelity or golden test fails.
---

# Design fidelity: the app matches the canvas, pixel for pixel

> **Status: planned.** The canvas and its manifest are in the repo today
> (`specs/design-system/canvas/`). The pipeline that renders the boards and diffs them against the
> app (`tools/design-fidelity/`, the screen goldens, `goldens.sh`, `pnpm fidelity`) is built in
> feature 007 (mobile-foundation); 007's `plan.md` fixes the exact file names and wins over this
> summary where they differ.

The owner approved a design canvas of 40 phone screens (360 px wide, boards 01–40), a 1440 px web
landing (41) and two designer-made Arabic dark boards (42 = Arabic dark of 21, 43 = Arabic dark of
13). Every app screen is built to its board and proven by an automated diff: a Flutter golden of the
screen against a Playwright render of the board, in English and Arabic, light and dark. "Looks close"
is not done; a passing `pnpm fidelity` is.

Read with: `flutter-mobile` (how to build the widgets; the CSS-to-Flutter rules that make the diff
pass), `ui-design` (the boards are the authority for app screens), `testing-strategy` (where this
layer sits in the pyramid).

## The canvas and its manifest (exists today)

`specs/design-system/canvas/` holds every `.dc.html` board, `canvas.json`, the design system's
tokens as `ds-tokens.json`, and `manifest.json`. Never edit a board or the manifest by hand: change
the canvas, re-export, and rerun `build-manifest.mjs` (steps in `specs/design-system/README.md`).

Board file names do not follow screen numbers (`S03-details.dc.html` is screen **09**). Always go
from a screen id to its board through the manifest.

```jsonc
{
  "canvas": { "title": "…", "url": "https://claude.ai/artifact/HeYx13fA2XFumiydvHeoTV",
              "version": "1794329096-280b", "exportedAt": "2026-11-11T00:00:00Z" },
  "designSystem": { "title": "Shoot Design System", "url": "…", "version": "…" },
  "defaults": { "scale": 2, "threshold": 0.01, "geometryTolerancePx": 1, "reducedMotion": true },
  "screens": [
    {
      "id": "09",                         // canvas number, 01–43; the golden and test ids use it
      "title": "…",
      "board": "S03-details.dc.html",
      "w": 360, "h": 780,                 // the root's size in CSS px = Flutter logical px
      "target": "mobile",                 // "web" for 41
      "feature": "012-mobile-quick-match",
      "variants": ["en-light", "en-dark", "ar-light", "ar-dark"],
      "boxes": { "header": ".hd", "wordmark": ".wm", "h1": ".h1", "topHit": ".top" },
      "threshold": 0.02, "reason": "…",   // optional, together; only on overridden boards
      "sha256": "…",                      // of the board file
      "changedSinceLastExport": true      // only when the board changed in the latest export
    }
  ]
}
```

- `boxes` maps a box name to a board selector. The geometry gate compares each box's rectangle in
  the reference against the widget keyed with the same name in the golden (see
  `flutter-mobile/references/widget-catalogue.md`).
- Boards 42 and 43 carry `variantOf` (`"21"`, `"13"`) and a single `ar-dark` variant: they are not
  built screens, they validate the derived references.
- A changed board gets a new `sha256` and `changedSinceLastExport: true`; its screen's goldens are
  stale until the screen passes fidelity against the new board.
- **Adding a board**: add it to the canvas, re-export, rerun `build-manifest.mjs`; it maps the board
  to its feature, finds the boxes from the known selectors, and applies the text-heavy threshold.
  Then add its screen golden in the owning feature.

## How the four variants are made (*planned*, 007)

Only English light exists for 01–40. The other three references are derived, never drawn by hand:

1. **Tokenise.** `tools/design-fidelity/src/tokenise.ts` swaps each hard-coded hex or rgba in a
   board's styles for `var(--role)` from `specs/design-system/tokens.css`. A value that matches
   several roles is resolved by the CSS property it sits on (`#0a60ff` is `--accent` on a
   background, `--focus` on an outline), with exceptions in `tokenise.overrides.json`; an unmapped
   colour fails with its board, selector and property, never guessed. Proof that it is right: the
   English light render is pixel-identical before and after tokenising.
2. **Dark.** Load `tokens.css` and add `class="dark"` to the root; the tokens supply the dark values.
3. **Arabic.** `tools/design-fidelity/src/localise.ts` sets `dir="rtl"` and `lang="ar"`, replaces
   text nodes from the board's strings file (`specs/design-system/canvas/strings.ar/<board>.json`,
   English → Arabic, one per board), and mirrors direction-implying icons. Those strings are the
   same Arabic as the app's `app_ar.arb` and the shared API examples (a test asserts they agree), so
   the reference and the golden show the same words.
4. **Validate the method.** Derive the Arabic dark of 21 and 13 and diff them against the designer's
   42 and 43 under the normal threshold and geometry gate. A mismatch is fixed in `tokenise.ts` or the
   strings, never by loosening a threshold.

## Fonts and determinism

- **Fonts.** Static Roboto and Noto Sans Arabic, with their licences, are vendored in
  `apps/mobile/test/fonts/` and loaded in `apps/mobile/test/flutter_test_config.dart`. The reference
  renderer injects the same font files into each board, so both sides rasterise the same glyphs.
  SF Pro is never vendored (its licence forbids it): the gate is exact for Android, whose system face
  is Roboto, and iOS is checked by eye in the simulator. The app itself bundles no font.
- **Shadows.** `flutter_test` replaces shadows with outlines by default; `flutter_test_config.dart`
  sets `debugDisableShadows = false` so goldens show real shadows.
- **Linux only.** Goldens depend on the platform's rasteriser, so they are made and checked only on
  Linux, through `apps/mobile/tool/goldens.sh`, which runs the `golden`-tagged tests in Docker
  (`ghcr.io/cirruslabs/flutter:3.47.2`, the pinned SDK). A plain `flutter test` on macOS skips them.
- **Screen goldens** (`apps/mobile/test/goldens/screens/<id>_<name>_golden_test.dart`, tag
  `golden`, through `test/helpers/golden.dart`'s `pumpBoard(id, variant)`): each variant renders
  at the board's w × h with device pixel ratio 2, a fixed `Clock`, animations off (the arrive end
  state), and data from `packages/domain/src/api/v1/examples/` (the boards' placeholder data:
  Omar K., AED 950). Output: `goldens/<id>/<variant>.png` plus `<variant>.boxes.json` from the keyed
  widgets; self-baselines under `goldens/<id>/self/`.
- **References**: Chromium (the pinned `@playwright/test` 1.63.0) at device scale 2 with reduced
  motion, `support.js` stubbed, the board loaded from `file://`; the test asserts the root is
  exactly w × h before it screenshots `.root` and writes the boxes as JSON.
- **Self-baselines** catch overflow where the canvas has no board: widths 393 and 430, iPad 768 and
  1024 (a centred column of at most 600 px unless 007's clarify says otherwise), and text scale 2.0.
  These are Flutter-only goldens; there is no reference to diff.

## Thresholds and the geometry gate

- **Pixel diff.** `maxDiffPixelRatio` comes from `defaults.threshold` (0.01), or the screen's own
  `threshold`: 0.02 for the text-heavy boards 33–36, because long running text has more anti-aliased
  edges. The defaults are calibrated on boards 37 and 39 in feature 007.
- **Geometry gate.** Every manifest box must match the golden's keyed widget within
  `geometryTolerancePx` (±1 logical px) on x, y, width and height, in every variant. Pixel ratios can
  hide a layout that is 3 px off; the gate does not.
- **Override policy.** A per-board threshold is set in `build-manifest.mjs` (the manifest is
  generated), always with a written `reason` naming what differs and why it cannot be fixed (a
  rasteriser difference, not a layout or colour bug). The PR that adds or raises one shows the review
  images. The geometry tolerance has no per-board override: a box off by more than 1 px is a bug.

## Review images and commands (*planned*)

```bash
apps/mobile/tool/goldens.sh            # run the golden tests in Docker; fail on any change
apps/mobile/tool/goldens.sh --update   # rewrite the Flutter goldens after an intended change
pnpm fidelity                          # render the references, diff every golden, run the geometry gate
pnpm fidelity:report                   # open the report: side-by-side and overlay per screen and variant
```

Screens whose feature has not shipped are reported as skipped. The references and the report are
build output (`tools/design-fidelity/build/`, git-ignored), rendered from the boards on every run;
two runs give identical results. The exact commands, exit codes and report layout are in
`specs/007-mobile-foundation/contracts/fidelity-check.md`.

Each comparison in the Playwright HTML report shows the expected (board), actual (Flutter) and diff
images, plus a side-by-side and a 50 % overlay attachment. Read them in that order: overlay for
shifts, side-by-side for colour and weight, diff for where. Common causes and their fixes are in
`flutter-mobile/references/css-to-flutter.md` ("Reading a failed diff"). CI uploads the report.

The order of work for a screen: build it from catalogue widgets → `goldens.sh --update` → look at the
golden in the diff → `pnpm fidelity` → fix and repeat until it passes in all four variants.

## Rules

- **Never update references from Flutter output.** References come only from the boards. The
  compare project never writes snapshots (`updateSnapshots: 'none'`), the scripts never pass `-u`,
  and a missing reference fails. `goldens.sh --update` rewrites the app's own goldens, never the
  references.
- **The canvas is the source.** If the design is wrong, the canvas changes and is re-exported; the
  sha256 and `changedSinceLastExport` mark the affected screens, and they pass fidelity again before
  merge. A board in the repo is never patched to make a diff pass.
- **Every screen scenario has a fidelity test** for en-light, en-dark, ar-light and ar-dark, named
  with its scenario id (for example `MF-US1-S1`) so `pnpm check:scenarios` finds it.
- **CI.** The `mobile` job runs `dart format`, `flutter analyze`, `flutter test --coverage`, the
  goldens, then `pnpm fidelity`. The authoritative result is that Linux run.

## Reference files

- [`references/pipeline.md`](references/pipeline.md) — the `tools/design-fidelity/` workspace, the
  refs and compare projects, the golden harness, and the files each step reads and writes.
