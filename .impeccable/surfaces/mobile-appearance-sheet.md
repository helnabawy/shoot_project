---
version: 1
slug: "mobile-appearance-sheet"
primary_target: "apps/mobile/lib/core/widgets/appearance_sheet.dart"
related_targets: ["apps/mobile/lib/core/widgets/app_bar_actions.dart", "apps/mobile/lib/core/theme/shoot_accent.dart", "apps/mobile/lib/core/theme/accent_cubit.dart"]
---

# Appearance sheet (Flutter app)

## Scope and mode

Operate. Surface scope: one modal bottom sheet in `apps/mobile`, opened from the Appearance button in the app bar (feature 006, `specs/006-mobile-accent-colour/`). It replaces the old three-item theme popup. Platform is the Flutter app (iPhone, iPad, Android); PRODUCT.md and DESIGN.md describe the web, and this sheet inherits their world, it does not restate it.

## Audience, job, action

A person on a phone, often in Arabic, often in dark mode, wants the app to look the way they like and gets on with their day. Job: pick a theme and an accent colour and see it change. There is no Top Hit here and no save button: every tap applies at once and the sheet stays open so accents can be compared. Primary actions elsewhere in the app stay the fixed red `primary`, never the accent.

## Direction contract

THESIS: a settings window in The Brief Bar world, shrunk to one sheet. Rows on the panel, nothing decorative.

- Drag handle, the title "Appearance" as a heading, then two groups: **Theme** (Match device, Light, Dark) and **Accent colour** (Blue, Teal, Violet, Magenta, Graphite, in that fixed order).
- Each row is the Brief Bar row: 44 px minimum (it grows with text size), a 30 px leading tile, the name (wraps, never truncates), a trailing check on the current choice only. The whole row is the tap target.
- The leading tile of an accent row is that accent's fill for the theme on screen, with no glyph. A theme row keeps its icon on the resting tile.
- The current choice is shown by three signals together: the selected-row fill, the accent ink and weight on the name, and the check. Colour is never the only one.
- Sheet width is capped at the form column (480 px), so on an iPad it is a centred narrow sheet, not a stretched one.
- Motion: the theme cross-fade is the platform default and short; with reduced motion it is off and an accent tap recolours in one frame.

## Proof and constraints

Names and values are the curated set in `shoot_accent.dart` (mirrors the R1 table in the spec's `research.md`); five accents, cool hues plus one neutral, so none reads as the attention, success or danger tints (FR-008). No swatch is hand-drawn per theme: the tile reads the same role the app uses. Contrast pairs are proven by `accent_palette_test.dart`.

## Deliberately absent

A colour picker, a "reset" button, an accent preview card, section dividers, a close button (drag, tap outside or back closes it), badges or "new" labels, per-accent descriptions.

## RTL and dark

Directional insets only. In Arabic the tile is at the start (right), the check at the end (left), group labels align to the start. Verified in tests at 360 x 640, 768 x 1024 and 1024 x 768 and at text scale 2.0; visual captures in English and Arabic, light and dark, are part of the finish review.
