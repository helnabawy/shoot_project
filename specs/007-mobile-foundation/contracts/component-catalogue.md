# Contract: component catalogue

Each component is one file in `apps/mobile/lib/core/widgets/` and has:
- a widget test, covering states, RTL, large text and semantics;
- a component golden in all four variants;
- an entry in the gallery.

Measurements come from the boards' CSS (1 CSS px = 1 logical px). Colours are roles, never hex.
Text comes in through parameters; no component holds copy of its own (FR-015).

**How to read the "Board" column.** It gives the board CSS class the widget implements. When a
board's markup changes, the widget follows.

## Shell

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `ShootScaffold` | `.root` | ground background; corner glow (`.root::before`): 400 px circle at top −130, inline-end −100; safe areas; content in a centred column ≤ 600 px on wide screens | none |
| `ShootHeader` | `.hd` | height 58; padding inline-start 20 (12 when it leads with a back button), inline-end 12; leading 44 back button, centre or start wordmark, trailing 44 slot | back is labelled "Back" or with the target's name, and its chevron mirrors in RTL |
| `Wordmark` | `.wm` | type `wordmark` (22/700/1, −0.03em), ink | link to home, labelled with the brand name |
| `ShootIconButton` | `.ib` | 44 × 44, radius 9, transparent, ink icon 20 | pressed, focus ring; `label` required |

## Actions

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `TopHit` | `.top` | height 50, radius 9, `primary` fill, `onPrimary` text in type `action` (17/600); padding 10 12; gap 12; optional trailing price (15/500, tabular) and chevron 16; full width; one glint 1.1 s at 2.4 s after first build (`off` disables it) | enabled, pressed (`primaryHover`), disabled, loading; button role; the label includes the price for screen readers |
| `SecondaryButton` | `.btn2` | height 44, radius 9, 1 px `controlBorder`, padding 0 14, gap 8, type `button` (16/500) | enabled, pressed, disabled |
| `TextLink` | `a` | `accentInk` | link role |

## Surfaces and rows

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `ShootPanel` | `.panel`, `.sum` | `panelSolid`, 1 px `hair`, radius 14, shadow `lift`; `.sum` adds padding 8 | none |
| `FloatingPanel` | `.bar` | `panel` (translucent), 1 px `hair`, radius 14, shadow `panel` (0 24 60) | none |
| `ShootSheet` | sheet | radius 20 on top corners, shadow `sheet` | modal semantics |
| `GroupLabel` | `.gl` | type `group label` (11/600, 0.06em, uppercase), `mute` | header semantics |
| `ShootRow` | `.row` | min-height 48, padding 4 0, gap 12, type `row` (16/1.3); leading `IconTile` or `PhotoTile`; trailing chevron 16 in `mute` (mirrors) or a value | link or button role; selected uses a `selected` wash and an `accentInk` label |
| `SummaryRow` | `.srow` | min-height 44, padding 4 8, gap 12, 15 px | none |
| `IconTile` | `.t30` | 30 × 30, radius 8, `surfaceSunk` background, `tileInk` icon 16 | decorative |
| `PhotoTile` | `.photo` | 44 × 44, radius 10; `SceneTile` while there is no photo | decorative or image label |

## Inputs

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `ShootField` | `.field` | height 44, radius 9, 1 px `controlBorder`, `panelSolid`, padding 0 12, 16 px | focus ring (`focus`), error (danger border plus message), disabled; label above in `meta` |
| `ShootTextArea` | `textarea.field` | min-height 92, padding 10 12 | same as `ShootField` |
| `PickerField` | `button.field` | as `ShootField`, with a trailing chevron 16 in `mute`; opens a sheet | `aria-haspopup` equivalent: hint "opens a list" |
| `ShootChip`, `ChipGroup` | `.chip` | height 40, radius 9, 1 px `controlBorder`, padding 0 14, 15 px; when on: `accent` fill, `onAccent` text, 500; group gap 8, wraps | toggle role with selected state |
| `SegmentedControl` | `.seg` | 1 px `controlBorder`, radius 9, clip; segments of equal width, height 40, 15 px; the on segment is `ink` fill with `ground` text, 500 | radio-group semantics |
| `PhoneField` | `.ph` | height 52, radius 9; country-code segment (18 px, inline-end 1 px `hair`); number 20 px, 0.02em, tabular | the country code button is labelled "Country code, United Arab Emirates, +971" |
| `OtpCodeInput` | `.box` (boards 11, 21, 22) | 6 cells in a row, equal width (flex 1), each 56 high, radius 9, 1 px `controlBorder`, `panelSolid`, digits 26/500 tabular; error shakes once (450 ms) | one text field for assistive technology; autofill one-time code |

## Status and data

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `StatusBadge` | `.badge` | height 24, radius pill, padding 0 10, gap 6, type `badge` (13/500); tones: attention, success, danger, neutral (`tile`/`tileInk`), accent | text, never colour alone |
| `QuoteLines` | quotation boards | label and amount rows, total in 500, tabular, `hair` dividers | table semantics |
| `Money` | `.num` | `AED 950`, tabular figures, locale-aware digits | none |
| `ProgressBar` | `.track` | height 6, radius 3, track `ink` at 8 %, fill `accent`; grows in once (900 ms) | progress semantics with a value |
| `StepStrip` | `.tabs` / `.tab` | horizontal scroll, gap 4, padding 8, tabs 44 high, 15/500, `mute`; current tab has a 2 px `accent` underline; per-tab state line (peach `onAttention`, grey, blue) | tab semantics; the selected tab is announced |
| `MessageBanner` | `.warn`, `.msg` | `.warn`: radius 9, padding 12 14, 14/1.5, `attention`/`onAttention`; `.msg`: radius 6, padding 12 16, 15/1.8, `danger`/`onDanger` | live region for errors |
| `CalendarMonth` | `.cell` (availability board 31) | 7 columns, cells 44, radius 9, 16 px tabular; states free, blocked, booked (fixed), today | grid semantics; each day announces its state |

## Content

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `CreatorCard` | `.card` | width 296 at 360, scaling with screen width (296/360), `panelSolid`, 1 px `hair` (2 px `accent` when chosen), radius 14, padding 10, gap 10, shadow `lift` | button role; selected state |
| `SnapCarousel` | `.rail`, `.dots` | gap 12, padding 4 32 8, snaps to centre; dots gap 6, the chosen dot widens; "n of m" | announces "n of m" on change |
| `EmptyState` | 08, 37–40 | `IconTile` 44, meta line, title (26/700), body (15/1.6, `mute`), max width 260; actions below | none |
| `RichContent` | 34–36 | paragraphs `body`, headings `title`/`heading`, lists, links `accentInk`, quotes | heading levels |

## Graphics

| Widget | Board | Measurements | States and semantics |
|---|---|---|---|
| `SceneTile` | `.sc` / `.photo` | three variants cycling by index (`.sc`, `:nth-child(2n)`, `:nth-child(3n)`): radial key light plus a dune ellipse plus a linear sweep from the `ShootScene` roles; focus-in once (700 ms) | decorative |
| `GoldenHourScene` | hero/splash SVG | the boards' inline SVG, colours from `ShootScene`; key light ambient on the landing only | decorative |
| `CornerGlow` | `.root::before` | as `ShootScaffold` | decorative |
| `ShootIcon` | inline SVG | stroke 2.2 (2 for 20 px), round caps and joins, from `assets/icons/`; `mirror` flag for direction icons | decorative unless labelled |

## Motion wrappers (`core/motion/`)

| Widget | Board keyframes | Behaviour |
|---|---|---|
| `Rise` / `Stagger` | `rise` | opacity 0→1 and translateY 14→0, 500 ms, `ease-standard`; children are delayed 70 ms each, the first at 60 ms |
| `FocusIn` | `focus` | opacity, blur 10→0, scale 1.06→1, 700 ms, delay 250 |
| `Roll` | `roll` | the number slides up from 110 %, 700 ms, delay 550 |
| `DrawCheck` | `draw` | the tick stroke draws in, 500 ms, delay 500 plus 80 per item |
| `Grow` | `grow` | scaleX 0→1 from inline-start, 900 ms, delay 350 |
| `Glint` | `glint` | sheen at 26 % width crosses once, 1.1 s at 2.4 s; reversed in RTL |
| `Shake` | `shake` | 450 ms, on error only |
| `AmbientPause` | landing | holds the play/pause state; ambient children stop when paused or when motion is reduced |
