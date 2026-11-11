# Request to the designer: Arabic dark boards and Arabic type rules (feature 007)

The app checks every screen against its board in English and Arabic, light and dark. The Arabic and
dark references are derived from the English light boards, and boards 42 and 43 are meant to prove
that derivation. They can't today, because they show different content from their English boards.

## 1. Two boards, same content as the English ones

Please redo these two as true Arabic dark versions: same state, same elements, same order, only the
language, direction and theme changed.

| Board | Is the Arabic dark of | What differs today |
|---|---|---|
| 42 · Sign in · code · Arabic dark | 21 · Sign in · code | 42 shows a wrong-code error ("هذا الرمز غير صحيح. بقي لديك محاولتان.") and puts "resend code in 0:42" after Continue; 21 has no error and resend before the role choice. |
| 43 · Booking · Arabic dark | 13 · Booking · confirmed, how to pay | 43 merges the meta line ("· السبت 14 ديسمبر، 16:00 · عمر ك.،") into one text and reorders the timeline rows. |

If the error state on 42 is wanted, please add it as its own English board too (light), so both
languages show the same state.

## 2. Confirm the Arabic type rules

Boards 42 and 43 change the type for Arabic in the same way. We'd like to adopt these as the rule
for every Arabic screen. Please confirm or correct:

| Role | English | Arabic |
|---|---|---|
| Letter-spacing | −0.03em to 0.06em | none (Arabic letters join) |
| Group label | 11 px, uppercase | 12 px, no case change |
| Display (`.h1`) | 34 px, line-height 1.25 | 32 px, line-height 1.4 |
| Title (`.h2`) | 26 px, 1.25 | 26 px, 1.4 |
| Rows (`.row`, `.ln`) | 1.375 | 1.6 |
| Meta | 1.4 | 1.7 |
| Body | 1.625 | 1.8 |
| Wordmark | 22 px | 24 px |
| Header padding | start 20, end 12 | mirrored (start is the right) |
| Digit rows (code boxes) | | stay left to right |

## 3. Two small fixes on every board

- **Top Hit glint under reduced motion.** With "reduce motion" on, the glint sheen (`.top::after`)
  stays sitting on the left of the button instead of ending off it. It should not show at all.
- **Dark corner glow.** Boards 42 and 43 use `rgba(74, 58, 47, 0.22)` at 36 % for the glow's middle
  stop. Is that the dark value to use everywhere? (The light one is `rgba(255, 233, 207, 0.6)` at 34 %.)

## 4. From the design check of the boards

The impeccable detector ran on every board (`.impeccable/review/mobile/detector-boards.md`):

- **Price on the Top Hit** (boards 08, 17, 18, 19, 35: `S02b`, `S05b`, `S05c`, `S06b`, `S12`): the
  price is `#fadcdc` on the red, 3.8:1, under AA's 4.5:1. Please use white (`on-primary`), as the
  app does.
- **Screens 37 and 39** stack an icon tile above the heading, a pattern the design check flags as
  template-like. Keep or change?
- **Screen 37's `404` line** above the heading reads as a kicker and is jargon for a client. Drop it,
  or say it in words?
- **Selected rows** (`.row.sel`) are shown by colour only (a blue wash and a blue label). Please add
  a second cue, such as weight 500 or a trailing check.
- **Links turn blue on hover**, including the label of the red Top Hit on the web (1.0:1).

## After the update

Re-export the canvas into `specs/design-system/canvas/` and run `node build-manifest.mjs`. The changed
boards get flagged for review, and the fidelity check validates the Arabic references against 42
and 43.
