# Feature Specification: Mobile creators (directory, profile, book this creator, work by specialty, hire page)

**Feature Branch**: `011-mobile-creators`

**Created**: 2026-11-11

**Status**: Draft (spec only; plan and tasks follow when the feature is next)

**Input**: User description: "Feature 011 "mobile-creators" (test-id prefix MC-) for the Flutter app in apps/mobile. Build canvas screens 15 creators directory, 16 creator public profile, 17 book this creator, 18 work by specialty and 19 hire page, at the same paths as the website (/creators, /creators/{code}, /book/{code}, /work/{specialty}, /hire/{slug}). Business rules mirror the website's creator profiles and directory (002) and intent pages (005 User Story 4). Only listed creators are shown; the verified mark shows only when identity is verified; no ratings or invented counts. Depends on 007 and 008."

Test-id prefix for this feature: `MC-` (for example `MC-US2-S3`).

Design source: the canvas boards for screens 15, 16, 17, 18 and 19 in
`specs/design-system/canvas/` (`manifest.json` maps each number to its board) and the canvas notes
on accounts and the public profile. Business rules: `specs/002-creator-profiles/spec.md` (who is
listed, profile content, codes, specialty pages, counts) and `specs/005-marketing-pages/spec.md`
User Story 4 (intent pages at `/hire/{slug}`); the brief on 17 and 19 follows feature 001's brief
builder. Screen numbers below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a creator's profile (Priority: P1)

A person opens a creator's profile from a shared link, the landing's creator strip, the directory or
a specialty page. They see the creator's photo (or a scene tile until one is uploaded), name and
code, the verified mark with what it means when the creator's identity has been checked, the
deciding facts (what they are, what they shoot, where they work), one primary action "Book with
Omar" with the starting price, then actions (see the work, ask on WhatsApp, the creator's own
links), about (languages, experience, bio) and their work samples.

**Why this priority**: A real person with real work is what turns a brief into a booking, and
shared profile links are how creators bring their own clients into the app.

**Independent Test**: Seed a listed creator with samples and open `/creators/{code}` in the app;
every section shows the creator's data in both languages; the primary action opens 17 with that
creator; an unlisted creator's link shows the not-found screen.

**Acceptance Scenarios**:

1. **Given** a listed creator, **When** their profile (16) opens, **Then** it shows their photo or a
   scene tile labelled "No photo yet", name, code, professional types, specialties, emirates, the
   primary action "Book with {first name}" with the starting price, the actions, about and work
   sections, all from the creator's profile data.
2. **Given** a creator whose identity documents are verified, **When** the profile opens, **Then**
   the verified mark shows with its one-line meaning; **Given** one whose identity is not verified,
   **Then** no mark and no space for it show.
3. **Given** a creator who is unverified, paused, suspended or of a deactivated persona that is not
   listed, **When** their profile link opens, **Then** the not-found screen (37) shows, except that a
   deactivated persona's creator stays reachable by direct link as on the website (002 edge cases).
4. **Given** the work section, **When** the person taps a sample, **Then** it opens full screen with
   its caption and description for screen readers, and the person can swipe through the samples; a
   video sample shows a play mark and opens its video link outside the app.
5. **Given** the profile, **When** the person taps "Ask on WhatsApp", **Then** WhatsApp opens a chat
   with the business number and a message naming the creator's code, in the app's language.
6. **Given** the profile, **When** the person taps the share button, **Then** the system share sheet
   offers the website address of this profile in the app's language.
7. **Given** a creator with no samples, **When** the profile opens, **Then** the work section shows
   an "awaiting samples" state instead of an empty grid, and "See the work" is not offered.
8. **Given** the app is in Arabic, **When** the profile opens, **Then** the creator's Arabic bio and
   labels show right to left, falling back to English where the creator wrote none.

---

### User Story 2 - Book this creator (Priority: P1)

From a profile, "Book with Omar" opens a short brief with that creator fixed (17): the professional
type is limited to the types the creator offers, the place to the emirates they work in, and the
date to days they are free. When the brief is complete, the one primary action continues into Quick
Match with the creator already chosen; no sign-in until the number step at the end.

**Why this priority**: It is the shortest path from a profile to a booking, and the path a creator's
own shared link leads to.

**Independent Test**: From a seeded creator's profile, tap the primary action, answer the brief,
continue, and confirm the brief is recorded with the creator fixed and the details step (09) opens
with that creator.

**Acceptance Scenarios**:

1. **Given** a creator's profile, **When** the person taps "Book with {first name}", **Then** 17
   opens with the creator's card at the top and a brief whose professional type offers only that
   creator's types and whose place offers only the emirates they work in.
2. **Given** a creator who offers one professional type, **When** 17 opens, **Then** that type is
   already in the sentence and the first step asked is the occasion.
3. **Given** the date step, **When** it shows, **Then** days the creator has blocked or is booked on
   cannot be chosen.
4. **Given** a complete brief, **When** the person taps the primary action, **Then** the brief is
   recorded with the creator fixed and Quick Match continues at the details step (09, feature 012)
   with that creator chosen; until 012 is built, WhatsApp opens with the brief instead (001
   FR-049).
5. **Given** 17, **When** the person taps "Change" next to the creator, **Then** the directory (15)
   opens and the answers given so far are kept for the next creator chosen.
6. **Given** 17, **When** it shows, **Then** a hint says no account is needed and the number is
   asked at the last step.

---

### User Story 3 - Browse the directory (Priority: P2)

A person opens Creators (15) from the menu or "See all" and sees listed creators as cards (name,
code, emirates, years, specialties, languages, availability note, starting price), with filters for
professional type, emirate and occasion, a line saying how many match and in what order, "Show
more", and one primary action that sends them to the brief instead: "Tell us the shoot, we'll match
you".

**Why this priority**: Browsing is the fallback for people who want to choose by person; the brief
remains the faster path, so the directory follows the profile and booking.

**Independent Test**: Seed listed creators of two types in two emirates; filter by type and
emirate and see only matching cards and the right count; tap a card and see its profile; tap the
primary action and land on the landing's brief.

**Acceptance Scenarios**:

1. **Given** listed creators, **When** the directory opens, **Then** it shows their cards in the
   directory's order, with a line naming how many match the filters and the order used.
2. **Given** the type control, **When** the person picks a professional type, **Then** only
   creators of that type are listed and the count line updates; the type control lists the active
   personas from the CMS and is not shown when only one is active.
3. **Given** emirate and occasion chips, **When** the person picks some, **Then** only creators who
   work in a chosen emirate and shoot a chosen occasion are listed; "More" opens the full list of
   emirates and occasions.
4. **Given** more matching creators than one page, **When** the person taps "Show more", **Then**
   the next page is added below and "Showing n of m" updates.
5. **Given** filters with no match, **When** the list would be empty, **Then** an empty state says
   so in one line and offers the brief as the primary action; no zero count is shown.
6. **Given** a card, **When** the person taps anywhere on it, **Then** the creator's profile opens;
   going back returns to the same place in the list with the same filters.

---

### User Story 4 - Work by specialty (Priority: P2)

From an occasion or a shared link (`/work/{specialty}`), a person sees the specialty's page (18):
its title and line from the CMS, the counts of samples and professionals when they are not zero, an
emirate filter, the first creator as the top result and everyone else below, "See all", recent work
by creators in that specialty, and the one primary action "Start a {specialty} brief".

**Why this priority**: Specialty pages answer "who shoots weddings here?" and are linked from search
on the website; in the app they are a browsing aid behind the brief.

**Independent Test**: Seed creators and samples in the wedding specialty; open
`/work/weddings`; see the counts, the creators, the samples; filter by emirate; tap the primary
action and see the brief open with the occasion filled.

**Acceptance Scenarios**:

1. **Given** a specialty with listed creators and samples, **When** its page opens, **Then** it
   shows its title and line in the app's language, counts of samples and professionals computed
   from listed data, the first creator under a "Top hit" label, the other creators below, and
   recent samples with their caption and creator.
2. **Given** a specialty with no samples or no creators, **When** its page opens, **Then** that
   count is not shown and the empty section is left out.
3. **Given** the emirate chips, **When** the person picks one, **Then** the creators, the samples
   and the counts reflect that emirate.
4. **Given** the page, **When** the person taps "Start a {specialty} brief", **Then** the brief
   opens with the occasion filled and its next unanswered step showing.
5. **Given** "See all n", **When** tapped, **Then** the directory opens filtered to that
   specialty.
6. **Given** an unknown or deactivated specialty, **When** its link opens, **Then** the not-found
   screen (37) shows.

---

### User Story 5 - Hire pages (Priority: P3)

A shared link to an intent page (`/hire/{slug}`, for example "Wedding photographer in Dubai") opens
the hire page (19): its title and introduction from the CMS, the brief already filled in for this
page (and still changeable), the one primary action "See who's free", up to six professionals who
can do it, and the page's questions and answers.

**Why this priority**: Intent pages mainly serve search on the website; in the app they matter only
when someone shares or follows such a link, so they come last.

**Independent Test**: Create an intent page preset to photographer, weddings and Dubai; open its
link in the app; the brief shows the three words filled; change the place; tap the primary action
and see the brief recorded with the changed place; the questions expand and collapse.

**Acceptance Scenarios**:

1. **Given** an intent page with presets, **When** it opens, **Then** the brief shows those words
   filled and changeable, with a hint saying so, and nothing else on the screen competes with the
   primary action.
2. **Given** a preset that names a persona, specialty or place that is no longer active, **When**
   the page opens, **Then** that word is left open in the brief and the rest of the page works.
3. **Given** matching listed creators, **When** the page opens, **Then** up to six are listed with
   "See all n"; **Given** none match, **Then** the section and its count are left out.
4. **Given** the questions, **When** the person taps one, **Then** its answer opens below it and its
   expanded state is announced; tapping again closes it.
5. **Given** a complete brief, **When** the person taps "See who's free", **Then** the brief is
   recorded and Quick Match step 2 (07, feature 012) opens.
6. **Given** an unknown, draft or deleted intent page, **When** its link opens, **Then** the
   not-found screen (37) or the removed screen (38, feature 015) shows as the website would.

---

### Edge Cases

- A creator is hidden while their profile is open: the next refresh or action shows the not-found
  screen; a brief started on 17 for them is refused with a plain message and the directory offered.
- A creator offers no emirate that the brief's place list contains: 17 shows the place step with
  the creator's emirates only; if none is active, the brief cannot complete and WhatsApp is offered.
- A creator has no free day in the next 90 days: the date step says so in one line and offers
  WhatsApp.
- Codes typed in lower case or with spaces in a link (`/creators/sh-0087`): the profile still opens.
- A sample image fails to load: its scene tile shows in its place; the caption stays.
- Long names, long Arabic specialty lists and the largest text size: cards and rows wrap; nothing
  is cut off at 360 px.
- The directory with hundreds of creators: pages load as the person asks ("Show more"); scrolling
  stays smooth.
- Content cannot be loaded (no connection, server error): the something-went-wrong screen (39)
  shows with "Try again"; nothing is shown from app constants.
- A profile opened in Arabic for a creator who wrote only an English bio: the English bio shows,
  laid out left to right inside the right-to-left screen.
- The person goes back from a profile to the strip, directory or specialty page: they return to
  where they were.

## Requirements *(mandatory)*

### Functional Requirements

**Who is shown**

- **FR-001**: Every screen in this feature MUST show only listed creators (verified and active,
  002 FR-002); a creator who is not listed MUST never appear in a list, count or sample, and their
  profile link MUST show the not-found screen (37), except the direct-link rule for deactivated
  personas (002 edge cases).
- **FR-002**: The verified mark MUST show only when the creator's identity documents are verified
  (002 FR-013), with its one-line meaning; there MUST be no ratings, review counts or other badges.
- **FR-003**: Counts (creators matching, samples, professionals) MUST be computed from listed data
  and MUST NOT be shown when zero.
- **FR-004**: A creator's gender and phone number MUST never be shown; nationality and years of
  experience MUST be shown only when set (002 FR-011).

**Starting prices**

- **FR-005**: Creator cards (15, 18, 19, the landing strip) and the profile's primary action MUST
  show a starting price "from AED …" with what it covers (for example "4 hours"), where the starting
  price is [NEEDS CLARIFICATION: The boards show a different "from" price per creator and order the
  directory by "lowest starting price first", but the price rules (003) give one price per brief for
  every creator. Where does a creator's starting price come from (the lowest tier for their
  professional type plus their emirate's travel fee, a price the creator sets, or nothing until
  feature 004), and is the directory ordered by it or by the website's order (featured, then most
  recently verified)?]

**Profile (16)**

- **FR-010**: The profile MUST show, in the board's order: header (back, wordmark, share); photo or
  scene tile; name and code; the verified mark (FR-002); professional types, specialties and
  emirates; the primary action "Book with {first name}" with the starting price; Actions ("See the
  work" with the number of samples, "Ask on WhatsApp", the creator's links); About (languages,
  experience, bio); Work (samples).
- **FR-011**: Samples MUST show in the creator's order with alternative text, load as they come into
  view, open in a full-screen viewer with swipe, and mark video samples with a play mark; a video
  link MUST open outside the app.
- **FR-012**: "Ask on WhatsApp" MUST open a chat with the business number from site settings and a
  message naming the creator's code, in the app's language.
- **FR-013**: The share button MUST offer the website address of the profile in the app's
  language, so the link opens the same profile in the app or on the website.
- **FR-014**: The creator's own links (for example Instagram) MUST open outside the app.

**Book this creator (17)**

- **FR-020**: 17 MUST show the creator's card (name, professional types, code) with "Change", and a
  brief with the creator fixed: the professional type limited to the creator's types (filled when
  there is one), the place limited to the emirates they work in, and the date limited to days they
  are free, using the same step-by-step brief as the landing (001 FR-067).
- **FR-021**: The primary action "Book with {first name} · date next" MUST lead the person through
  the remaining steps; with a complete brief it MUST record the brief with the creator fixed and open
  Quick Match at the details step (09, feature 012) with that creator chosen. Until feature 012 is
  built, it MUST record the brief and open WhatsApp with the configured message.
- **FR-022**: "Change" MUST open the directory with the answers kept; choosing another creator
  there MUST return to 17 for them, dropping answers they cannot offer.

**Directory (15)**

- **FR-030**: The directory MUST show a type control listing the active personas (plural names from
  the CMS, hidden when only one is active), emirate and occasion chips from the CMS with "More" for
  the full lists, a count line naming the matches and the order, creator cards, "Showing n of m"
  with "Show more", and the primary action "Tell us the shoot, we'll match you", which opens the
  landing's brief at its first unanswered step.
- **FR-031**: Each card MUST show name, code, emirates, years of experience (when set),
  specialties, languages, the creator's availability note, and the starting price (FR-005), and MUST
  open the profile when tapped anywhere, announced as one link ("{name}, from {price}, see
  profile").
- **FR-032**: Filters and the scroll position MUST be kept when the person goes to a profile and
  back.
- **FR-033**: With no match, the directory MUST show an empty state with the brief as its primary
  action.

**Work by specialty (18)**

- **FR-040**: The specialty page MUST show its title, line and counts (FR-003) from the CMS and
  listed data, an emirate filter, the first creator in the directory's order under "Top hit", the
  others as rows, "See all n" (opening the directory filtered to the specialty), recent samples with
  caption and creator, and the primary action "Start a {specialty} brief" opening the brief with the
  occasion filled.
- **FR-041**: Specialty names, lines and sample captions MUST come from the CMS in the app's
  language with English fallback; an unknown or inactive specialty MUST show the not-found screen.

**Hire page (19)**

- **FR-050**: The hire page MUST show its title and introduction from the CMS, the brief with the
  page's presets filled and changeable (005 FR-012), a hint saying so, the primary action "See who's
  free · price next", up to six matching listed creators with "See all n", and the page's questions
  and answers as expandable rows.
- **FR-051**: A preset that is no longer active MUST leave its word open, never break the brief.
- **FR-052**: A complete brief MUST be recorded (with the page as its source) and open Quick Match
  step 2 (07, feature 012); until 012 is built, WhatsApp opens instead.

**Design, content and accessibility**

- **FR-060**: Screens 15, 16, 17, 18 and 19 MUST match their canvas boards in English and Arabic,
  light and dark, through the design-fidelity check of feature 007, compared at their full scroll
  heights. States with no board (no samples, empty directory, a sample viewer, expanded questions)
  MUST be kept as the app's own baselines.
- **FR-061**: Each screen MUST have exactly one primary action, drawn as the Top Hit in the fixed
  primary red: "Tell us the shoot, we'll match you" on 15, "Book with {first name}" on 16, "Book with
  {first name} · date next" on 17, "Start a {specialty} brief" on 18, "See who's free" on 19. The
  "Top hit" label on 18 marks a result, not an action.
- **FR-062**: All creator data, personas, specialties, places, samples, prices, page copy and
  questions MUST come from the CMS through the mobile API (feature 008); no profession, specialty,
  place or price MUST be written in the app.
- **FR-063**: Arabic MUST be right to left with start and end positions only, mirrored direction
  icons, and Arabic interface strings written by a person; creator codes, prices and dates follow
  the app language's format.
- **FR-064**: Every interactive element MUST have a touch target of at least 44 × 44 and a screen-
  reader name, role and state (the labels on the boards, for example "Back to creators", "Share
  profile", "Sample 1 of 8, video"), and every screen MUST work at the largest system text size.
- **FR-065**: Self-started motion on these screens MUST end within 5 seconds, and none MUST play
  under reduced motion.
- **FR-066**: No screen in this feature MUST ask for sign-in or payment.
- **FR-067**: The screens MUST open at the website's paths (`/creators`, `/creators/{code}`,
  `/book/{code}`, `/work/{specialty}`, `/hire/{slug}`), with `/ar` opening them in Arabic.

### Key Entities

- **Creator profile (public view)**: code, display name, photo, professional types, specialties,
  emirates, languages, years of experience, nationality, bio per language, links, identity-verified
  flag, availability note, starting price (FR-005), samples.
- **Sample**: image or video link, caption per language, specialty, order, creator.
- **Specialty**: name, title, line and introduction per language, counts of listed samples and
  creators.
- **Intent page**: title, introduction, presets (persona, specialty, place), questions and answers,
  per language.
- **Directory query**: chosen type, emirates, occasions and page; the count it matches.
- **Brief (with a fixed creator)**: as in feature 001, plus the creator it was started for.
- **Availability**: the days a creator is blocked or booked (feature 003), used to limit the date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person finds a creator for a given specialty and emirate in under 30 seconds from
  the landing (002 SC-001).
- **SC-002**: A profile opened from a link shows its name, facts and primary action within 2
  seconds on a mid-range phone on a 4G connection.
- **SC-003**: From a profile, a person reaches the details step of Quick Match with the creator
  chosen in under 45 seconds.
- **SC-004**: In testing, 0 unlisted creators appear anywhere and 0 zero counts are shown.
- **SC-005**: Screens 15 to 19 pass the fidelity check in all four variants, with at most 1 % of
  pixels differing and every key element within 1 px.
- **SC-006**: A review of the app's code finds 0 profession, specialty, place or price written in
  it.
- **SC-007**: Every acceptance scenario `MC-US1-S1` … `MC-US5-S6` has an automated test named with
  its id.

## Assumptions

- Features 007 (design system, routes, screens 37 and 39, fidelity check) and 008 (mobile API with
  the public creator, specialty, intent page and availability reads) exist first; Quick Match
  (012) may come later, so 17 and 19 fall back to WhatsApp until it ships.
- The directory's page size, the six creators on a hire page and the order of creators follow the
  website's settings; the app does not define its own.
- The "Top hit" creator on 18 is simply the first creator in the directory's order for that
  specialty and emirate; it is not a recommendation or a ranking by quality.
- The availability note on cards ("weekends and evenings") is a field of the creator's profile
  written by the creator; if the profile has none, the line is left out.
- The number of samples a creator may upload and the identity-verified flag come from feature 002;
  this feature only shows them.
- Filters in the directory are kept while the app is open; they are not part of the shared link.
- The full-screen sample viewer has no board; it uses the design system's components and is
  checked against its own baseline.
- Sign-in, the creator's own profile editor (014), reviews and ratings are out of scope.
