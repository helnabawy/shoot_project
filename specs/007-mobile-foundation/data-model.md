# Data model: Mobile foundation

This feature has no server data. Its "data" is design files, test outputs, a few in-app value
types and one preference key.

## Screen (manifest entry)

Defined in `specs/design-system/canvas/manifest.json`; the schema is in
[contracts/manifest.md](contracts/manifest.md).

| Field | Type | Rule |
|---|---|---|
| `id` | `"01"`–`"43"` | Canvas number. Unique. |
| `title` | string | From the canvas. |
| `board` | file name | Must exist in `canvas/`. |
| `w`, `h` | int px | The board's frame. `w` is 360 for mobile and 1440 for web. |
| `target` | `mobile` \| `web` | Only `mobile` screens are compared in 007. |
| `feature` | spec dir name \| null | The feature that builds the screen. Null for 41–43. |
| `variants` | subset of `en-light`, `en-dark`, `ar-light`, `ar-dark` | All four for mobile screens. `[ar-dark]` for 42 and 43. |
| `variantOf` | id | Only on 42 (`21`) and 43 (`13`). |
| `boxes` | map name → CSS selector | Key elements for the geometry gate: `header`, `wordmark`, `h1`, `topHit`. |
| `threshold` | 0–1 | Optional; default `defaults.threshold` (0.01). |
| `reason` | string | Required when `threshold` is set. |
| `sha256` | hex | Fingerprint of the board file. |
| `changedSinceLastExport` | bool | Set by `build-manifest.mjs` when the fingerprint changed. |

## Variant

`{ language: en | ar, theme: light | dark }`. Arabic is right-to-left. The variant fixes the
locale, the text direction and the theme on both sides of the comparison.

## Reference (render output, git-ignored)

The board rendered for one variant, stored as `tools/design-fidelity/build/refs/<id>/<variant>.png`
plus `<variant>.boxes.json` (`{ name: { x, y, w, h } }` in logical px).

How each variant is made:
- **en-light**: the raw board.
- **en-dark**: tokenised (research R5), with `class="dark"`.
- **ar-light** and **ar-dark**: tokenised, then localised (research R6).

## App render (golden, committed)

`apps/mobile/test/goldens/screens/goldens/<id>/<variant>.png` plus `.boxes.json`, the same shape
as the reference.

Self-baselines live under `goldens/<id>/self/{w393,w430,ipad768,ipad1024,text2}.png`.

## Comparison result (report)

Kept per screen and variant:
- `diffRatio`
- `threshold`
- `boxes`: `{ name: { dx, dy, dw, dh } }`
- `pass`
- attachments: `side-by-side.png`, `overlay.png`, `diff.png`

The result fails when `diffRatio > threshold` or any `|d*| > 1`.

## Design tokens (in-app value types)

- **ShootColors** (existing, extended):
  - new roles `bodyInk` and `surfaceSunk`, with a light and a dark value each;
  - rule: every text role has contrast ≥ 4.5 on `ground`, `panel` and `tile` in both themes.
- **ShootScene** (`ThemeExtension`): sky, light, halo, dune far/mid/near, tile top/bottom/key,
  scene ink, corner glow, glint sheen, pulse ring, sweep top/bottom/key, plus the three new
  shades. Graphic use only.
- **ShootType**: the roles in research R3. Each is a `TextStyle` with size, weight, height, even
  leading and letter-spacing in px.
- **ShootShadows**: `panel`, `sheet`, `lift`, per theme.
- **ShootTokens** (existing, extended):
  - sizes: `header 58`, `rowBlock 7`, `pane 1080`, `carouselRatio 296/360`, `maxColumn 600`;
  - arrive tier: rise 500, stagger 70, focus 700, roll 700, draw 500, grow 900, write 1100,
    deal 600, shake 450 (ms);
  - ambient tier: glint 7 s, keylight 14 s, settle 5 s, drift 44 s, pulse 2.4 s.

## Motion policy

`MotionPolicy.of(context)` gives two values:
- `reduced`, from `MediaQuery.disableAnimationsOf`;
- `selfStartedBudget`, which is 5 s.

The rules:
- Arrive widgets play once per mount and then hold their end state.
- With `reduced`, an arrive widget builds directly in its end state.
- Ambient widgets need an `AmbientPause` ancestor and stop when it is paused or when `reduced`
  is on.

## First-run state

Stored through the 006 `PreferencesStore`:
- key `firstRun.welcomeSeen`, `"true"` or absent;
- a missing or unreadable value counts as "not seen";
- a write failure keeps the in-memory value for the session.

## Route

An entry in `app_routes.dart`. Each entry has:
- `path`, the web-mirrored pattern;
- `owner`, a feature number;
- `built`, a bool;
- `auth`: `none` \| `required`, enforced from 009 on.

Rules:
- An unbuilt route resolves to not-found (FR-031).
- An `/ar` prefix is valid on every path.
