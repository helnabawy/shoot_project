# UI contract: the Appearance sheet

The only new interface this feature exposes to people. Covers FR-001, FR-003, FR-004, FR-014, FR-015.

## Entry point

- The app bar's theme button becomes **Appearance** (tooltip and accessible label "Appearance" / "المظهر"), a 44 × 44 icon button in the same place.
- Tapping it opens a modal bottom sheet. Nothing else in the app changes its entry points.

## Sheet content (top to bottom, logical start/end)

1. Drag handle; the sheet title **Appearance** / **المظهر** as a heading.
2. Group label **Theme** / **السمة**, then three rows: Match device, Light, Dark (existing strings `themeSystem`, `themeLight`, `themeDark`).
3. Group label **Accent colour** / **لون التمييز**, then one row per accent in the fixed order (Blue, Teal, Violet, Magenta, Graphite).

Each row:
- Height ≥ 44 logical px; grows with the text scale; the name wraps, never truncates.
- Leading 30 × 30 tile: for an accent, the accent's `accent` fill in the theme on screen with no glyph; for a theme row, its icon on the resting tile.
- The name, then a trailing check on the current choice only (not colour alone, FR-003).
- The whole row is the tap target. Tapping applies the choice at once (FR-004) and keeps the sheet open, so the person can compare accents.

## Semantics

- Each group is announced as a group with its label; each row as a radio-style option with its name and "selected" / "not selected" (in the app's language).
- Focus order: title, Theme rows, Accent rows. The focus ring uses the current accent's `focus` role.

## Direction and themes

- In Arabic the sheet is right to left: tiles at the start (right), checks at the end (left), group labels aligned to the start.
- The swatch tiles show each accent's value for the theme currently on screen; switching theme from the same sheet updates them in place.

## Motion

- Selecting an accent recolours without a transition when reduced motion is on; otherwise the theme cross-fade is the platform default and short.

## Test hooks

Stable keys for widget tests: `appearance-button`, `appearance-sheet`, `theme-option-<system|light|dark>`, `accent-option-<id>`.
