# Impeccable detector on the canvas boards (feature 007, T053, 2026-11-11)

`impeccable detect --json specs/design-system/canvas/*.dc.html`: 826 findings, 723 advisory,
103 warnings. The detector reads HTML, so it runs on the boards (the authority the app is held to),
not on Dart. Anything material is raised as a **canvas change**, never as a silent app deviation.

## Raised with the owner and designer

| Finding | Boards | Why it matters | App today |
|---|---|---|---|
| Price text `#fadcdc` on the Top Hit red, 3.8:1 (AA needs 4.5:1) | S02b, S05b, S05c, S06b, S12 | Fails WCAG AA for a price people decide on | `TopHit` draws the price in `onPrimary` (white, 4.9:1); the boards should follow |
| Icon tile stacked above the heading | S10 (37) and S10c (39) | A template tell in the impeccable gate | Built to the board; change only with the canvas |
| Kicker above a heading (the finish review adds the `404` meta line on 37, also jargon against the voice) | S01 landing, S13 legal, S10 (37) | Template tell | Not built in 007 |
| `a:hover` turns link text `#0a60ff`, also on the red Top Hit (1.0:1) | most boards | Hover only, no hover on a phone; on the web it would hide the label | The app has no hover state on the Top Hit |
| Decorative low contrast on the landing (1.2:1) and a learning step (3.7:1) | S01, S00b | Check whether the text is meant to be read | Not built in 007 (feature 010) |

| A selected row is shown by colour only (blue wash and blue label) | boards with `.row.sel` | WCAG 1.4.1; suggest weight 500 or a trailing check | Built to the board; change with the canvas |

## Known and intended

- `radial-halo` (32): the corner glow, the world's signature (`--corner-glow`).
- `marquee`, `pulsing-dot` (6): the landing's ambient loops, which run only under its Pause control
  (FR-021).
- `cramped-padding` (64): the board root and full-bleed rows by design (`.root` has no inset; rows
  carry their own); no text is cramped inside a control.
- `design-system-color` / `-font-size` / `-radius` (691, advisory): DESIGN.md documents the web;
  the app's roles are checked by `tokens_parity_test.dart` instead.
