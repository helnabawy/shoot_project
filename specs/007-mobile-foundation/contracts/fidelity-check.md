# Contract: design-fidelity check

## Commands

| Command | Where | What it does |
|---|---|---|
| `apps/mobile/tool/goldens.sh` | repo root or `apps/mobile` | Runs `flutter test --tags golden` with `GOLDENS=1` on macOS with the pinned Flutter 3.47.9 (refuses another OS or version). Fails when an app render differs from its committed golden. |
| `apps/mobile/tool/goldens.sh --update` | same | Rewrites the app goldens (`--update-goldens`). Used only when a screen is deliberately changed. Never touches references. |
| `pnpm fidelity` | repo root | `pnpm --filter design-fidelity exec playwright test`: the `refs` project renders the references, then the `compare` project checks the committed app goldens against them. |
| `pnpm fidelity --grep 37` | repo root | One screen. |
| `pnpm fidelity:report` | repo root | Opens the last HTML report. |

## Inputs

- `specs/design-system/canvas/manifest.json` and the board files.
- `specs/design-system/tokens.css`, which supplies the colour roles for the dark derivation.
- `specs/design-system/canvas/strings.ar/<board>.json`, which supplies the Arabic copy.
- `tools/design-fidelity/tokenise.overrides.json`, which resolves colours that map to more than
  one role.
- `apps/mobile/test/fonts/*`, which both sides draw with.
- `apps/mobile/test/goldens/screens/goldens/<id>/<variant>.png` and `.boxes.json`.

## Reference rendering (`refs`)

1. **Browser setup.** Chromium, with `deviceScaleFactor: 2`, a viewport of the board's `w×h`,
   `reducedMotion: 'reduce'`, and `colorScheme` from the variant.
2. **Loading the board.** `./support.js` is routed to an empty 200 response. The board loads from
   `file://`, and the test fonts are injected.
3. **Variant transforms.** For dark, the board is tokenised and `class="dark"` is added. For
   Arabic, it is localised. Both run before load.
4. **Size check.** The step asserts that `.root` measures exactly `w×h`.
5. **Outputs.** It screenshots `.root` with `animations: 'disabled'` into `build/refs/<id>/<variant>.png`
   and writes `<variant>.boxes.json`.

## Comparison (`compare`)

### Pixel gate

- Each app golden is checked with `toMatchSnapshot` against its reference, using
  `maxDiffPixelRatio` from the screen's `threshold` (default 0.01) and a per-pixel
  `threshold: 0.2`.
- `updateSnapshots: 'none'`, so a missing reference fails.

### Geometry gate

- For every box name, `|x|`, `|y|`, `|w|` and `|h|` must each differ by no more than
  `geometryTolerancePx` (1).
- A box present on one side and missing on the other fails.

### Attachments, per screen and variant

| File | Content |
|---|---|
| `side-by-side.png` | board, app and difference, each at 1× |
| `overlay.png` | the app at 50 % over the board, plus a difference-blend strip |
| `expected.png`, `actual.png`, `diff.png` | Playwright's own images |
| `result.json` | `{ id, variant, diffRatio, threshold, boxes: { name: {dx,dy,dw,dh} }, pass }` |

### Report header

- Screens with `changedSinceLastExport`.
- Screens skipped because their feature has not shipped.
- Overrides with their reasons.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Every compared screen and variant passes. |
| 1 | Any of: a pixel or geometry failure; a missing reference or golden; a threshold override with no reason; a board that does not render at its size; an unmapped colour in the dark derivation. |

## Never

- Never write a reference from app output, and never run `-u` on the `compare` project.
- Never commit `tools/design-fidelity/build/`.
- Never commit goldens made on another platform than macOS with the pinned Flutter.
