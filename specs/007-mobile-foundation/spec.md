# Feature Specification: Mobile foundation (design system, shell and design-fidelity check)

**Feature Branch**: `007-mobile-foundation`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Feature 007 "mobile-foundation" (test-id prefix MF-) for the Flutter app in apps/mobile. Give the app the design system and the tooling every later mobile screen is built on, so each of the 40 designed phone screens (canvas boards in specs/design-system/canvas/, index manifest.json) can be built pixel-for-pixel and proven so automatically. Scope: type scale and missing tokens; a design-system widget library matching the boards' components; motion in three tiers; the app shell (routing that mirrors the web URLs, first-run state, not-found (37) and something-went-wrong (39) screens, a component gallery in debug builds); an automated design-fidelity check against the canvas boards in English and Arabic, light and dark, with side-by-side and overlay images, run on every change together with the app's format, analysis and test checks; self-baseline overflow checks at other widths, on iPad and at large text. Depends on 006. Out of scope: other product screens, the REST API (008), sign-in (009)."

Test-id prefix for this feature: `MF-` (for example `MF-US2-S3`).

Design source: the canvas boards in `specs/design-system/canvas/` (screen numbers 01–43, indexed by
`manifest.json`). Screen numbers below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every screen looks exactly like its design (Priority: P1)

The owner approved 40 phone screens on the design canvas. When a screen is built in the app, the
owner (and anyone reviewing a change) can see automatically, without opening the app, whether the
built screen matches its board: the check renders the board and the app screen at the same size,
with the same placeholder content, and fails when they differ by more than an agreed tolerance or
when a key element (the header, the wordmark, the heading, the one primary action) has moved. For
every comparison it produces a side-by-side image and an overlay image, so a reviewer sees where
the difference is at a glance. This feature proves the check on the two screens it builds:
Not found (37) and Something went wrong (39).

**Why this priority**: "Pixel perfect" is the owner's requirement for the whole app. Without an
automatic, repeatable check, fidelity is a matter of opinion and drifts with every later change.
Every later mobile feature (009–015) depends on this check existing.

**Independent Test**: Build screen 37 in the app, run the check, and confirm it passes with the
review images produced; then shift the heading by 2 px and confirm the check fails and names the
element.

**Acceptance Scenarios**:

1. **Given** screen 37 is built in the app, **When** the fidelity check runs, **Then** it compares
   the app's render with the board's render in English light at the board's exact size and passes,
   and it saves a side-by-side and an overlay image for the comparison.
2. **Given** a built screen whose heading sits 2 px lower than on its board, **When** the check
   runs, **Then** it fails and the report names the element that moved and by how much.
3. **Given** a built screen whose colours or text differ from its board on more pixels than its
   threshold allows, **When** the check runs, **Then** it fails and the report shows the share of
   differing pixels against the threshold.
4. **Given** a screen in the manifest that has a threshold override, **When** the override has no
   written reason, **Then** the check refuses to run for that screen and says why.
5. **Given** a board changed on the canvas and was re-exported, **When** the check runs, **Then**
   the screens whose board changed are listed as needing review, even if they still pass.

---

### User Story 2 - The same look in English and Arabic, light and dark (Priority: P1)

Only English light boards exist for screens 01–40 (plus two Arabic dark boards, 42 and 43). The
check still has to hold the app to the design in all four combinations, because the app must be
equal in Arabic and in dark mode. Dark and Arabic references are derived from the English light
boards using the design system's colour roles and written Arabic copy, and the derivation is proven
trustworthy by comparing it with the two boards the designer drew in Arabic dark.

**Why this priority**: Arabic RTL and dark mode are acceptance criteria in this project, not polish;
a check that only covers English light would let half the app drift.

**Independent Test**: Derive the Arabic dark reference for screen 21 and compare it with the
designer's board 42; then do the same for 13 and 43. Both comparisons pass the threshold.

**Acceptance Scenarios**:

1. **Given** an English light board, **When** its references are derived, **Then** four references
   exist (English light, English dark, Arabic light, Arabic dark) and the English light reference
   derived through colour roles is pixel-identical to the board's own render.
2. **Given** the derived Arabic dark references for screens 21 and 13, **When** they are compared
   with the designer's boards 42 and 43, **Then** both comparisons pass the default threshold.
3. **Given** screen 37 is built, **When** the check runs, **Then** it compares all four variants
   and passes each.
4. **Given** a board colour that maps to no colour role, **When** references are derived, **Then**
   the derivation fails and names the colour, rather than guessing a dark value.

---

### User Story 3 - One set of building blocks that matches the boards (Priority: P1)

A person building any later screen finds every component the boards use already made, named and
documented: the header (back, wordmark, trailing button), the one primary action (the "Top Hit", in
the fixed primary red, with an optional trailing price), panels and rows, text fields, picker
fields, chips, the segmented control, the phone field, the six-cell code input, status badges,
quote lines, money amounts, the progress bar, the step strip, the message banner, the month
calendar, the creator card and its snapping carousel, the empty state, rich text, the scene tile
and golden-hour scene, and the icons. Each one matches its board measurements, works in both
languages and both themes, at large text sizes and with a screen reader. A gallery screen, in
development builds only, shows every component in every state.

**Why this priority**: Pixel fidelity across 40 screens is only affordable if each component is
made once, exactly, and reused; otherwise each screen re-solves the same measurements differently.

**Independent Test**: Open the gallery in a development build, switch language and theme, and check
each component against its board; run the component checks for each component in all four variants.

**Acceptance Scenarios**:

1. **Given** the gallery in a development build, **When** a person opens it, **Then** every
   component listed in FR-010 appears in each of its states (for example enabled, pressed, selected,
   disabled, error, loading).
2. **Given** any component, **When** it is shown in Arabic, **Then** it lays out right to left with
   no left/right-specific offsets, and its icons that imply direction are mirrored.
3. **Given** any component, **When** the system text size is at its largest, **Then** text wraps
   rather than truncates or overflows, and touch targets stay at least 44 × 44.
4. **Given** a screen reader is on, **When** a person moves through the gallery, **Then** every
   interactive component announces its name, role and state in the app's language.
5. **Given** a release build, **When** a person tries to reach the gallery by any route, **Then**
   it does not exist and the not-found screen shows.

---

### User Story 4 - Motion that helps and then stops (Priority: P2)

Screens move the way the design shows: things answer a tap quickly ("react"), content arrives once
in order when a screen opens ("arrive": rise, focus, roll, tick, grow, deal, write-in, shake), and
only the landing has slow loops ("ambient") under one Pause control. Every other screen's
self-started motion is over within 5 seconds. A person who has reduced motion on sees every screen
in its finished state with nothing moving.

**Why this priority**: Motion is part of the approved design and of accessibility (WCAG 2.2.2), but
the screens are usable without it, so it follows the static fidelity work.

**Independent Test**: Open screen 39 and time its self-started motion (under 5 s); turn on reduced
motion and confirm the first frame equals the finished state.

**Acceptance Scenarios**:

1. **Given** any screen other than the landing, **When** it opens, **Then** all motion it starts on
   its own ends within 5 seconds.
2. **Given** reduced motion is on, **When** any screen opens, **Then** its first frame is identical
   to its finished state, and no animation runs.
3. **Given** the ambient tier is used, **When** the Pause control is pressed, **Then** every loop on
   that screen stops, and stays stopped until the person presses it again.

---

### User Story 5 - The app finds its way, in either language (Priority: P2)

Links shared from the website open the matching place in the app: the same paths as the website
(`/creators/{code}`, `/match/{ref}/{key}`, `/q/{ref}/{key}`, `/account/…`), with `/ar/…` opening it
in Arabic. A path the app does not know shows the not-found screen (37) with a way home; an
unexpected failure shows the something-went-wrong screen (39) with a way to try again and a way to
reach a person on WhatsApp. The app remembers whether this device has seen the first-visit steps.

**Why this priority**: Every later feature plugs its screens into this shell; the routes and the two
fallback screens must exist first, but they carry no product value on their own.

**Independent Test**: Open `/ar/does-not-exist` and see screen 37 in Arabic; force an error and see
screen 39; relaunch and see the first-run flag kept.

**Acceptance Scenarios**:

1. **Given** a link to a path the app does not know, **When** it opens, **Then** screen 37 shows
   in the link's language with a way home, matching its board.
2. **Given** a link starting with `/ar/`, **When** it opens, **Then** the app shows the target in
   Arabic, right to left.
3. **Given** an unexpected failure while showing a screen, **When** it happens, **Then** screen 39
   shows with "Try again" and a WhatsApp contact, matching its board, and no technical detail.
4. **Given** the first-visit steps were marked as seen on this device, **When** the app is closed
   and reopened, **Then** they are still marked as seen.
5. **Given** a known route whose screen belongs to a later feature, **When** it opens before that
   feature ships, **Then** the not-found screen shows (never a blank or a crash).

---

### Edge Cases

- A board's content is taller than the device: the check compares the full scroll height of the
  board (for example screen 05 at 2360 px) with the app screen laid out at the same height.
- A phone wider or narrower than 360 px: layouts stretch fluidly; nothing overflows at 393 or 430;
  the 360 comparison stays exact.
- iPad: content sits in a centred column at most 600 px wide; nothing overflows at 768 or 1024.
- Text scale 2.0: no overflow or clipping on screens 37 and 39 and in the gallery.
- Fonts: the comparison draws both sides with the same test fonts, so a difference means layout,
  not font availability.
- A board uses a colour with no role yet (body text `#3a342f`, `#e6e0d9`, some scene shades): the
  role is added with light and dark values that pass contrast before any screen uses it.
- A reference cannot be rendered (for example a broken board): the check fails for that screen
  rather than passing silently.
- Reduced motion is switched on while a screen is animating: motion stops at its finished state.

## Requirements *(mandatory)*

### Functional Requirements

**Design tokens**

- **FR-001**: The app MUST have the type scale the boards use (wordmark, display, title, heading,
  action, row, button, body, chip, meta, badge, group label), each with size, weight, line height and
  letter spacing, and numbers in tabular figures; the same scale MUST be recorded in the design
  system's token file.
- **FR-002**: Every colour the boards use MUST map to a named colour role with a light and a dark
  value; roles missing today (body text, the `#e6e0d9` surface, the scene shades) MUST be added, and
  every text role MUST meet WCAG 2.1 AA (4.5:1) on its surface in both themes, checked automatically.
- **FR-003**: Shadows, corner radii, sizes (row 44, Top Hit 50, header 58, icon button 44, tiles 30
  and 44) and the three motion tiers' durations and curves MUST be available as named values, never
  as numbers written in a screen.

**Component library**

- **FR-010**: The app MUST provide these components, each matching its board measurements: header
  (back, wordmark, trailing button), icon button, Top Hit (fixed primary red; optional trailing
  price and chevron; one glint after arriving), secondary link/button, panel, sheet, row group and
  row (with tile or photo tile), summary row, text field, multi-line field, picker field, chip and
  chip group, segmented control, phone field (country code + number), six-cell code input,
  status badge (attention, success, danger, neutral), quote lines, money amount, progress bar, step
  strip, message banner, month calendar, creator card, snapping carousel with position dots and an
  announced "n of m", empty state, rich text, scene tile (the photo stand-in), golden-hour scene,
  corner glow, and the icon set drawn from the boards.
- **FR-011**: Every component MUST work right to left in Arabic using start/end positioning only, and
  MUST mirror icons that imply direction (back, forward, chevrons).
- **FR-012**: Every interactive component MUST have a touch target of at least 44 × 44, a visible
  focus indicator, and a screen-reader label, role and state in the app's language.
- **FR-013**: Every component MUST honour the system text size up to its largest setting without
  truncating or overflowing.
- **FR-014**: The app MUST include a gallery screen showing every component in every state, reachable
  only in development builds.
- **FR-015**: Components MUST take all text from the app's localisation files or from data passed
  in; no component may contain user-visible text of its own, and none may name a profession.

**Motion**

- **FR-020**: Motion MUST follow three tiers: react (answers a person's action, 120/180/260 ms),
  arrive (plays once when content first appears: rise, focus, roll, tick, grow, deal, write-in,
  shake), ambient (loops).
- **FR-021**: Ambient loops MUST be used only on screens that offer a Pause control, and the control
  MUST stop every loop on that screen.
- **FR-022**: On every other screen, self-started motion MUST end within 5 seconds of the screen
  appearing.
- **FR-023**: When the system's reduced-motion setting is on, every screen MUST show its finished
  state from the first frame and run no animation.

**Shell and fallback screens**

- **FR-030**: The app MUST open links using the same paths as the website, with an `/ar` prefix
  selecting Arabic; the list of paths MUST be declared in one place.
- **FR-031**: Unknown paths, and known paths whose screen is not built yet, MUST show the not-found
  screen (37) with a way home.
- **FR-032**: An unexpected failure while showing a screen MUST show the something-went-wrong screen
  (39) with "Try again" and a WhatsApp contact taken from site data when available, and MUST never
  show technical detail to the person.
- **FR-033**: The app MUST remember on the device whether the first-visit steps have been seen.
- **FR-034**: On screens wider than a phone, content MUST sit in a centred column at most 600 px wide.

**Design-fidelity check**

- **FR-040**: The repository MUST hold the canvas boards and a manifest mapping each screen number to
  its board, size, variants, key-element boxes, owning feature, threshold and board fingerprint.
- **FR-041**: The check MUST render each board's reference at its exact size and twice the pixel
  density with motion off, and the app's screen at the same size, density and content, in each
  variant the manifest lists.
- **FR-042**: English dark, Arabic light and Arabic dark references MUST be derived from the English
  light board using the colour roles (FR-002) and written Arabic copy that matches the app's own
  strings; the derivation MUST be validated against boards 42 and 43 (User Story 2, scenario 2).
- **FR-043**: A comparison MUST fail when the share of differing pixels exceeds the screen's
  threshold (default 1 %; 2 % for text-heavy screens 33–36), or when any key element listed for the
  screen is more than 1 px from its board position or size. A per-screen override MUST carry a
  written reason.
- **FR-044**: Every comparison MUST produce a side-by-side image (board | app | difference) and an
  overlay image, kept with the check's report.
- **FR-045**: A missing reference or a screen that cannot be rendered MUST fail the check; references
  MUST never be regenerated from the app's own output.
- **FR-046**: The app's own renders MUST also be kept as baselines at widths 393 and 430, on iPad at
  768 and 1024, and at text scale 2.0, and any overflow at those sizes MUST fail.
- **FR-047**: The check, the app's formatting, static analysis and tests MUST run automatically on
  every proposed change, and a failure MUST block merging.
- **FR-048**: Renders on both sides MUST use the same fonts and a fixed clock, so the check gives
  the same result on every run.

### Key Entities

- **Screen**: one designed screen; has a canvas number (01–43), a board, a size, the variants it is
  checked in, its key elements, its owning feature, an optional threshold with a reason, and the
  fingerprint of its board at export.
- **Variant**: a language and theme combination (English light, English dark, Arabic light, Arabic
  dark).
- **Reference**: the board rendered for one variant; derived for every variant but English light.
- **Comparison result**: per screen and variant: share of differing pixels, threshold, key-element
  offsets, pass or fail, and the review images.
- **Colour role / type role**: a named design value with a light and a dark value (colour) or a size,
  weight, line height and spacing (type).
- **Component**: a reusable building block with its states, used by every screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Screens 37 and 39 pass the fidelity check in all four variants, with at most 1 % of
  pixels differing from their references and every key element within 1 px.
- **SC-002**: The derived Arabic dark references for screens 21 and 13 differ from the designer's
  boards 42 and 43 on at most 1 % of pixels.
- **SC-003**: 100 % of the components listed in FR-010 appear in the gallery and have their own
  automated check in all four variants.
- **SC-004**: Running the check twice on the same change gives the same result 100 % of the time.
- **SC-005**: A reviewer can see where a failing screen differs within 30 seconds of opening the
  report, using the side-by-side and overlay images alone.
- **SC-006**: On every non-landing screen built in this feature, self-started motion ends within
  5 seconds; with reduced motion on, 0 frames of animation play.
- **SC-007**: 0 overflow errors at widths 360, 393 and 430, on iPad at 768 and 1024, and at text
  scale 2.0, for the screens and gallery in this feature.
- **SC-008**: Every acceptance scenario `MF-US1-S1` … `MF-US5-S5` has an automated test named with
  its id.

## Assumptions

- Feature 006 lands first: the fixed primary red (`primary`, `on-primary`) and the saved appearance
  and language exist before the Top Hit and the first-run flag are built here.
- The canvas boards are the design authority for app screens; the exported copy in
  `specs/design-system/canvas/` (canvas version `1794329096-280b`) is what the check compares
  against. Changing the design means changing the canvas and re-exporting, never editing a board in
  the repository.
- Carousel cards scale with the screen width (296/360 of it) and are exact at 360.
- The app bundles no font: it uses the system fonts, as the design does ("zero font bytes").
- The check draws both sides with fonts that may be redistributed (Roboto and Noto Sans Arabic),
  kept for tests only. The Apple system font cannot be redistributed, so the automated check is
  exact for Android's rendering, and iOS fidelity is confirmed by eye in the simulator during the
  finish review.
- The check runs on Linux in the project's continuous integration; renders on other machines are not
  compared.
- Placeholder content in the boards (names, prices, dates) is reproduced by shared example data, never
  shipped as real content; real content comes from the CMS through feature 008.
- Push notifications, the REST API and sign-in are out of scope (features 018, 008 and 009).
