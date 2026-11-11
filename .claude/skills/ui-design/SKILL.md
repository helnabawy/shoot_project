---
name: ui-design
description: How to design and build any user-facing screen in this project so it is simple to use and looks deliberately designed rather than AI-generated — the chosen visual world "The Brief Bar" (one Spotlight-style panel: the brief as a search field, options as grouped result rows, the Top Hit as the one action), its tokens and type, the client-flow simplicity rules, and the mandatory impeccable workflow (context, craft floor, detector, finish review, DESIGN.md). Use this skill before writing or changing any page, section, component, form, empty/error/success state, the brief builder, auth screens, account pages, or any later surface (creator profiles, pricing, quotation), any screen of the Flutter app (where the approved canvas boards are the authority), and whenever someone asks to make the site prettier, simpler, more modern, more user-friendly or "less AI-looking".
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
- **Signature interaction** (owner-amended 2026-11-07, FR-067): the brief
  is built one step at a time. The bar opens as one field ("Type what
  you're looking for") with only the first list; each choice becomes a
  tinted token in the sentence and the next list takes its place; the Top
  Hit appears only when every part is answered; a token reopens its step,
  Backspace takes the last answer back, typing searches every list.
  Nothing is pre-selected. Without JavaScript every list shows as a form.
  Also: typing filters the groups live and the
  sentence re-composes as rows are set; arrow keys move the highlight,
  Return fires the Top Hit, Escape clears the filter. A set row is ticked
  and printed into the sentence; an unset row is an invitation ("pick a
  date"); attention carries its one-sentence message in the trailing slot.
  Reduced motion: the highlight moves without animation.
- **Below the fold**, on the bare ground: how it works as three numbered
  rows, why us as a result group, specialties as a result group, the
  creator invitation as a second smaller bar with its own Top Hit, FAQ as
  expanding rows, a closing Top Hit.

## Creator surfaces (feature 002)

The directory, the profile, booking a creator, the specialty pages and the provider's profile editor
all inherit this world; their direction contracts are `.impeccable/surfaces/creators-directory.md`,
`creator-profile.md` and `provider-profile.md`, and their parts are recorded in `DESIGN.md`. Reuse,
do not reinvent: a creator is a **result row with a photo tile** (initials when there is no photo),
never a card; the directory and the specialty page are the same panel (`buildDirectory` with a fixed
filter); facts on a profile are single rows, not badges; the work is a uniform 4:5 grid with no
captions or hover zoom; the editor is one page in sections between a status bar and a closing bar,
with English and Arabic fields side by side (page language first), never a wizard. Counts, proof and
verification are real or absent: no ratings, reviews, response times or invented totals.

## The mobile app (`apps/mobile`, features 006–015, planned)

The Flutter app is built from the approved design canvas
(https://claude.ai/artifact/HeYx13fA2XFumiydvHeoTV), imported into `specs/design-system/canvas/`:
40 phone screens at 360 px (01–40) and the designer's Arabic dark boards 42 and 43. For app screens
**the canvas boards are the authority**, ahead of `DESIGN.md` (which records the web build). A
screen is built to its board and proven by the pixel diff (`design-fidelity` skill); "close enough"
is not done. How to build it is in the `flutter-mobile` skill.

- **No board, no screen.** A state or layout the canvas does not show is designed in the canvas
  first (through the design system and this skill's rules), re-exported, and then built. Never
  improvise a screen in Dart. iPad layouts are the exception: a centred column of at most 600 px,
  checked by self-baselines, unless a spec's clarify says otherwise.
- **The fixed `primary` red.** The Top Hit and every primary action use the `primary` role (#E01414,
  hover #C00F0F; feature 006). The person's chosen accent (five curated accents, Blue default) only
  recolours selection, focus and tints, never a primary action. One primary action per screen, as on
  the web.
- **Scene tiles.** A photo slot with no photo is a `SceneTile` (the warm scene gradient with its key
  light), never a grey box, a stock image or a generic icon. The splash, the learning steps, the hero
  and the confirmed booking sit on the golden-hour scene, copied verbatim from the boards' SVG; other
  screens get the still corner glow. Real photography replaces a tile only when the API sends it.
- **Motion with a 5-second cap.** React (120/180/260 ms) answers a tap; arrive (rise, focus, roll,
  tick, grow, deal, write-in, shake) plays once; ambient loops exist only on the landing, behind one
  Pause control. Every other screen's self-started motion ends within 5 s (WCAG 2.2.2), and reduced
  motion shows the end state at once.
- **Navigation.** The header and its menu (board 06) are the navigation; no bottom tab bar.
- **Same honesty rules.** No invented proof, counts or ratings; the boards' placeholder data
  (Omar K., AED 950) lives only in the shared test examples, never in the app.
- **Craft gates.** Principle IX applies to the app. The canvas boards are its direction contract and
  the fidelity gate is its proof; feature 007's Constitution Check states how impeccable's detector
  and finish review apply to Flutter screens (they read HTML, not Dart).
- Verify on a 360 px phone and on iPad 768/1024, in English and Arabic, light and dark, at the
  largest text size, with VoiceOver and TalkBack (Principle VI).

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
