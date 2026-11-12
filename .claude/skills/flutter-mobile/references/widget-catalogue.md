# The design-system widget catalogue (`apps/mobile/lib/core/widgets/`)

> **Status: planned** (feature 007, mobile-foundation). The binding list, with measurements, states
> and semantics per widget, is `specs/007-mobile-foundation/contracts/component-catalogue.md`.
> This file is the working summary; when they differ, the contract wins and this file is updated.

One widget per file, in `core/widgets/` (motion widgets in `core/motion/`), exported for features
to use. Each widget has:

- a **widget test** (`test/core/widgets/<name>_test.dart`): roles and semantics labels, every
  state, tap targets ≥ 44 px, English and Arabic (mirroring), light and dark;
- a **component golden** (tagged `golden`, run only through `tool/goldens.sh`): every state in all
  four variants, shown on the debug-only gallery page (`core/gallery/gallery_page.dart`).

Widgets read colour roles (`context.colors`), type roles (`shoot_type.dart`), spacing, radii and
motion tokens. They never take a raw `Color`, a `TextStyle` built in a feature, or a hard-coded
duration; a variant is a named constructor or an enum, not a styling parameter.

## Board class → widget map

| Group | Board class | Widget |
|---|---|---|
| Shell | `.root` | `ShootScaffold` |
| | `.hd` | `ShootHeader` (58 px) |
| | `.wm` | `Wordmark` |
| | `.ib` | `ShootIconButton`; text `.ib` is `ShootTextAction` (`square: true` keeps the board's fixed 44 × 44 box, so a `middle` wordmark in `ShootHeader` stays centred) |
| Actions | `.top` | `TopHit` (the one primary action: `primary` fill, type `action` 17/600, optional price and chevron) |
| | `.btn2` | `SecondaryButton` |
| | `a` | `TextLink` |
| Surfaces | `.panel`, `.sum` | `ShootPanel` (`.sum` adds padding 8) |
| | `.bar` | `FloatingPanel` |
| | sheet | `ShootSheet` |
| | `.gl` | `GroupLabel` |
| | `.row` | `ShootRow` |
| | `.srow` | `SummaryRow` |
| | `.t30` | `IconTile` |
| | `.photo` | `PhotoTile` (falls back to `SceneTile`) |
| Inputs | `.field` | `ShootField` |
| | `textarea.field` | `ShootTextArea` |
| | `button.field` | `PickerField` |
| | `.chip` | `ShootChip` in a `ChipGroup` |
| | `.seg` | `SegmentedControl` |
| | `.ph` | `PhoneField` (digits stay LTR inside Arabic; 14 px `mute` chevron after the country code; optional placeholder and read-only) |
| | `.boxes` / `.box` (boards 11, 21, 22) | `OtpCodeInput` (six cells, gap 8, radius 9, 26/500 tabular. Board 21: 56 inside a 1 px `controlBorder` (CSS content-box, 58 tall), the next cell 2 px `focus` (60 tall) while focused. Board 22 `error`: 56 including a 2 px `onDanger` border on `danger`. One hidden field with `AutofillHints.oneTimeCode` in an `AutofillGroup`, number keyboard, max 6, paste fills all six; one semantics node; corrected in feature 009) |
| | board 21 `.panel` of `.row` radios | `ChoiceRowGroup` (rows ≥ 44, padding 7 8, radius 9, 16/1.375, 30 px `tile` icon; chosen = `selected` + `accentInk`, `accent` tile, tick; radio-group semantics; feature 009) |
| | `.ck` (board 23) | `CheckLine` (22 px box in `accent`, gap 12, 14/1.5 `bodyInk`, inline links as their own semantics nodes, whole line ≥ 44 toggles; feature 009) |
| | `#err` (board 22) | `InlineError` (18 px alert, gap 8, 15/1.45 `onDanger`, live region; feature 009) |
| | inline `a`, `.quiet`, `bdi.num` in a sentence | `LinkedText` (ARB sentence with `{name}` tokens; underlined `a`, 500 `.quiet`, LTR-isolated number; feature 009) |
| Status and data | `.badge` | `StatusBadge` |
| | quotation boards | `QuoteLines` |
| | `.num` | `Money` (tabular figures; amounts are never formatted in a feature) |
| | `.track` | `ProgressBar` |
| | `.tabs` / `.tab` | `StepStrip` |
| | `.warn`, `.msg` | `MessageBanner` |
| | availability board | `CalendarMonth` |
| Content | `.card` | `CreatorCard` |
| | `.rail`, `.dots` | `SnapCarousel` (cards scale with width, 296/360, exact at 360) |
| | boards 08, 37–40 | `EmptyState` |
| | boards 34–36 | `RichContent` (CMS block JSON from the API, feature 015) |
| Graphics | `.sc` / `.photo` | `SceneTile` (three variants by index) |
| | hero / splash SVG | `GoldenHourScene` |
| | `.root::before` | `CornerGlow` |
| | inline SVG | `ShootIcon` (paths copied from the boards into `assets/icons/`) |
| Motion | `rise`, `focus`, `roll`, `draw`, `grow`, `glint`, `shake` | `Rise`/`Stagger`, `FocusIn`, `Roll`, `DrawCheck`, `Grow`, `Glint`, `Shake` |
| | landing | `AmbientPause` |

**Naming note.** The chip is `ShootChip`, not `ChoiceChip`, because Material already exports a
`ChoiceChip` and every screen imports `package:flutter/material.dart`. Keep the `Shoot` prefix for any
catalogue widget whose plain name Material or Cupertino already uses.

When a board element has no row here:

1. Look again: it may be an existing widget under another class. Add the row to the contract.
2. Otherwise it is a new catalogue widget. Add it in the feature that first needs it, with its
   widget test and component golden, and add it to the contract. Never build it inside `features/`.

## Fidelity hooks

A manifest screen's `boxes` maps a box name to a board selector (today `header` → `.hd`,
`wordmark` → `.wm`, `h1` → `.h1`, `topHit` → `.top`). The widget that renders each one carries a key
named after the **box name**, so the golden helper (`test/helpers/golden.dart`) can write
`boxes.json` for the ±1 px geometry gate (see the `design-fidelity` skill) and the manifest and the
widget tree name the same thing.
