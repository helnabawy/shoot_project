---
name: ui-design
description: How to design and build any user-facing screen in this project so it is simple to use and looks deliberately designed rather than AI-generated — the chosen visual world "The Brief Bar" (one Spotlight-style panel: the brief as a search field, options as grouped result rows, the Top Hit as the one action), its tokens and type, the client-flow simplicity rules, and the mandatory impeccable workflow (context, craft floor, detector, finish review, DESIGN.md). Use this skill before writing or changing any page, section, component, form, empty/error/success state, the brief builder, auth screens, account pages, or any later surface (creator profiles, pricing, quotation), and whenever someone asks to make the site prettier, simpler, more modern, more user-friendly or "less AI-looking".
---

# UI design in this project

Design here is governed, not improvised. Three files are the authority and
win over taste, habit and category defaults:

| File | Owns |
|------|------|
| `PRODUCT.md` | users, purpose, principles, what proof exists (none yet) |
| `.impeccable/surfaces/*.md` | per-surface direction contract (thesis, own-world, story, first viewport, signature interaction) |
| `DESIGN.md` + `.impeccable/design.json` | **the source of truth for tokens and components** (written by impeccable's documenter from the shipped build, 2026-11-07); read it before any visible change and keep it current through the documenter |

Constitution Principle IX ("Designed, Not Generated") makes the impeccable
workflow mandatory for UI work.

## The workflow for every UI task

1. Invoke the `impeccable` skill. It runs `impeccable context --target <file>`,
   which loads PRODUCT.md, DESIGN.md and the matching surface brief.
2. A section, component or state inside an existing surface **inherits** the
   world: no new palette, no new fonts, no new card style. A genuinely new
   surface (e.g. `/creators`, `/pricing`) goes through impeccable's
   new-work flow in "surface" scope, which keeps the world and only decides
   composition.
3. Read impeccable's `reference/craft-floor.md` immediately before editing.
4. Build. Use the tokens and sign components below; never hand-pick colours.
5. Run `impeccable detect --json <changed files>` (the CLI ships with the
   user-level impeccable skill at `~/.claude/skills/impeccable/scripts/impeccable`)
   once the change is finished; fix mechanical findings.
6. For a whole surface, capture `desktop.png` and `mobile.png` into
   `.impeccable/review/` (also in Arabic and dark when the surface is
   public), spawn impeccable's finish reviewer, act on its verdict (`ship`,
   `fix`, `rebuild`, `recapture`), then let the documenter update DESIGN.md.
   A page that "looks done" without this is not done.

## The world: The Brief Bar

Chosen on 2026-11-07 by the owner, who pinned a macOS Spotlight / Quick
Actions direction on re-roll round 1 of seed `0ba1ece0` after rejecting
"The Shoot Pass" (gimmicky) and "Bilingual Wayfinding" (municipal, cold,
too literal). Sketch at `.impeccable/mocks/decision/brief-bar.html`;
contract in `.impeccable/surfaces/apps-web-src-app-site-locale-page-tsx.md`.

- **Idea**: the brief is one search field. The visitor types or taps what
  they need into a single floating bar, the options fall into place as
  grouped result rows beneath it, and the Top Hit is the shoot. Nothing is
  painted on the page; the page is the one panel everyone already knows
  how to use. Arabic and English are equals in the same panel.
- **Colour roles** (tokens; values live in `globals.css` and DESIGN.md, which win over this summary):
  `--ground` #EFE9E3 (warm stone), `--ink` #1D1D1F, `--mute` #6B6560 (the sketch's #8A8580 failed AA),
  `--panel` white at 86 % over a 20 px blur (opaque fallback), `--hair`
  rgba(0,0,0,.08), `--tile` #F1EEEA (glyph tiles), `--accent` #0A60FF
  (selection blue: the Top Hit row, the caret, focus rings, and a set
  row's tint and tick tile, and the tint behind a chosen word in the
  sentence (a Spotlight token); never text, never decoration), `--attention` as a fill behind ink text. One
  faint blue wash at the top of the ground is the only gradient. Dark
  theme (first-class, most visits are phones at night): ground #141416,
  panel #28282C at 82 %, ink #F5F5F7, tiles #3A3A3F, accent #2B6BEB (#4D8DFF failed AA under white text).
- **Type**: the system UI stack (`-apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, system-ui, sans-serif`) with the platform's Arabic
  companions; no font files. Display 700 with tight tracking (38 px on
  phones), the field at 22 px / 500, rows at 16 px, labels 11 px uppercase
  tracked, tabular figures. No serif, no mono, no Inter loaded as display.
- **Surfaces**: one panel, 14 px corners, 1 px hairline, the only shadow in
  the system (soft, single, low). Rows are 44 px minimum with a 30 px glyph
  tile (8 px corners) on the start side and a trailing state or key hint.
  At most two panels per page (the bar, and a smaller creator bar); every
  other section sits on the bare ground with hairlines. No other
  translucency, no copied Apple icons, no stock cards or pills.
- **Components** (build once in `apps/web/src/shared/ui/bar/`): `BriefBar`
  (the panel), `BarField` (the sentence field; without JS a row of labelled
  selects), `ResultGroup` + `ResultRow` (tile, label, trailing slot; states
  open / set / attention), `TopHit` (the one accent row = primary action,
  the submit button without JS), `GlyphTile`, `KeyHint` (↩, kbd hints,
  hidden on touch). Everything public is assembled from these.
- **Signature interaction**: typing filters the groups live and the
  sentence re-composes as rows are set; arrow keys move the highlight,
  Return fires the Top Hit, Escape clears the filter. A set row is ticked
  and printed into the sentence; an unset row is an invitation ("pick a
  date"); attention carries its one-sentence message in the trailing slot.
  Reduced motion: the highlight moves without animation.
- **Below the fold**, on the bare ground: how it works as three numbered
  rows, why us as a result group, specialties as a result group, the
  creator invitation as a second smaller bar with its own Top Hit, FAQ as
  expanding rows, a closing Top Hit.

## Client flow rules (spec FR-055–FR-062)

- One primary action per screen; it is the Top Hit row, visible without
  scrolling on a 360 × 640 phone.
- Brief first, account never required. Every slot has a default; the happy
  path is tap a line → pick → tap the action → WhatsApp.
- Labels and errors are one plain sentence, next to the field, saying what
  to do. No placeholder-as-label.
- After submitting: reference, what happens next, expected reply time, a way
  to brief again.
- Auth asks only what it must and returns the client to where they were.
- Feedback within 100 ms on every tap; pending states on every submit.

## Honesty and banned tells

There is no real photography, logo, client list, testimonial, rating or
count yet (PRODUCT.md). Do not invent any. Imagery slots are CMS media with
an honest empty state in the bar grammar (a result row saying what will
appear there). Never ship: stock gradients, translucency anywhere but the bar panel, generic icon tiles, a centred
headline over a row of equal cards, emoji as icons, the font defaults
impeccable lists (Inter as display, Space Grotesk, Playfair, DM Sans, …).

## Bilingual and themes

Design each surface in Arabic as well as English (logical properties, the
field and rows bilingual, Arabic display in the system Arabic face at matched weight) and in
dark as well as light; the finish review receives captures of all four
combinations for public surfaces.
