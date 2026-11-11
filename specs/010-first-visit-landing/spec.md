# Feature Specification: Mobile first visit and landing

**Feature Branch**: `010-first-visit-landing`

**Created**: 2026-11-11

**Status**: Draft (spec only; plan and tasks follow when the feature is next)

**Input**: User description: "Feature 010 "first-visit-landing" (test-id prefix ML-) for the Flutter app in apps/mobile. Build the first visit and the landing from canvas screens 01 splash, 02–04 learning steps, 05 landing (full page) and 06 menu: a splash that plays once, three skippable learning steps shown once per device, the landing as one scrolling page (golden-hour hero with the brief bar as the one primary action, occasion tiles, a moving creator strip under a Pause control, the dark band for creators, a closing call to start a brief) and the menu (browse, sign in or join, language, theme, WhatsApp, legal, editor sign-in). Business rules mirror the website's landing and brief builder (001). Depends on 007 (design system, shell, fidelity check) and 008 (mobile API)."

Test-id prefix for this feature: `ML-` (for example `ML-US1-S3`).

Design source: the canvas boards in `specs/design-system/canvas/` for screens 01, 02, 03, 04, 05 and
06 (`manifest.json` maps each number to its board), and the canvas notes on the first visit, the
flow change and the landing. Business rules: `specs/001-landing-auth-cms/spec.md` (landing, brief
builder FR-046 to FR-068, personas, site settings) and `specs/002-creator-profiles/spec.md` (which
creators may be shown). Screen numbers below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a brief from the landing (Priority: P1)

A person opens the app and sees the landing: a warm golden-hour scene, the headline ("You brief. We
shoot." in the shipped content) and the Brief Bar under it. Before they touch it, the bar writes an
example sentence once to show how it works. When they tap the bar, the example goes away and the
real brief starts at its first step: one short list at a time (who they need, for what, where,
when), each choice printed into the sentence. Once every step is answered, the one primary action,
"See price and who's free", records the brief and takes them to the creators who are free (Quick
Match, feature 012). No account, number or sign-in is asked for.

**Why this priority**: The brief is the product's front door and the only way into Quick Match. It
is what the landing exists for, and every booking in the app starts here.

**Independent Test**: With seeded option sets, open the app on the landing, tap the bar, answer
every step, tap the primary action, and confirm a brief is recorded with every answer and the
next screen opens; add an occasion in the CMS and see it in the list on the next visit.

**Acceptance Scenarios**:

1. **Given** the landing opens and the bar has not been touched, **When** the hero appears,
   **Then** the bar writes its example sentence once, the primary action "See price and who's free"
   is visible under it with its hint, and nothing in the example counts as an answer.
2. **Given** the example is playing, **When** the person touches the bar, **Then** the example
   stops at once and the bar shows the search field and only the first step's list, read from the
   CMS.
3. **Given** the person picks a value in a step, **When** it is chosen, **Then** it is printed into
   the sentence as a word they can tap, and the next unanswered step's list shows; a step that
   takes several choices advances with "Continue", and an optional step offers its skip (such as
   "any date").
4. **Given** the person changes the professional type, **When** later steps no longer offer an
   earlier answer, **Then** that answer is cleared and the person is taken back to that step, and
   the remaining lists show only options for the chosen type or types.
5. **Given** a partly answered brief, **When** the person taps the primary action, **Then** the bar
   opens the first unanswered step with a one-line message naming it, and nothing is recorded.
6. **Given** a complete brief, **When** the person taps the primary action, **Then** the brief is
   recorded (every answer and its label, the date, the language, the source, and the person if
   signed in) and Quick Match step 2 opens for it.
7. **Given** a date in the past (in the business time zone), **When** the person tries to choose
   it, **Then** it cannot be chosen.
8. **Given** the app is in Arabic, **When** the person builds a brief, **Then** the sentence, the
   options and every message are in Arabic, written by a person, and the bar runs right to left.
9. **Given** an editor adds an occasion to its option set and publishes, **When** the person opens
   the landing again, **Then** the new occasion is listed in its configured place, with no app
   update.

---

### User Story 2 - First visit: splash and three learning steps (Priority: P2)

The first time the app is opened on a device, a short splash plays (the aperture opens on the
wordmark and the tagline), then three learning steps show how the app works using the app's own
building blocks: say it in one line; see the price and who is free; your number is your account.
Each step can be skipped. The last step's primary action, "Start a brief", opens the landing with
the brief ready. The steps never show again on that device.

**Why this priority**: It sets expectations (no account, one price, number at the end) and lowers
drop-off at the sign-in step, but the landing works without it.

**Independent Test**: On a fresh install, launch the app, see 01 then 02; move through 03 and 04;
tap "Start a brief" and land on 05 with the brief's first step open; relaunch and land straight on
05.

**Acceptance Scenarios**:

1. **Given** a fresh install opened from its icon, **When** the app starts, **Then** the splash
   plays once, finishes within 2 seconds, and is followed by learning step 1 (02).
2. **Given** any learning step, **When** the person taps "Skip", **Then** the landing opens and the
   steps are marked as seen on this device.
3. **Given** learning step 1 or 2, **When** the person taps "Next" or swipes forward, **Then** the
   next step shows and its position ("2 of 3") is shown and announced.
4. **Given** learning step 3 (04), **When** the person taps "Start a brief", **Then** the landing
   opens with the brief bar at its first step, ready for input, and the steps are marked as seen.
5. **Given** the steps were seen, **When** the app is closed and opened again, **Then** neither the
   splash nor the steps show, and the landing opens.
6. **Given** a fresh install opened by a link (for example a shared creator profile), **When** the
   app starts, **Then** the linked screen opens with no splash or learning steps, and the steps are
   still unseen for the next plain launch.
7. **Given** reduced motion is on, **When** the splash and steps show, **Then** each appears in its
   finished state with nothing moving, and the splash moves on as soon as the app is ready.
8. **Given** a screen reader is on, **When** the splash shows, **Then** it is announced once as the
   brand name, the tagline and "Loading", and the decorative camera details are not read.

---

### User Story 3 - Find everything else from the menu (Priority: P2)

With no footer on the landing, the menu (06) is the one place for the rest of the app: start a
brief (its one primary action), browse creators, guides and how it works, log in with a mobile
number or join as a creator, switch language and theme, ask on WhatsApp, read the terms, the
professional terms and the privacy policy, and, for editors, a way to the website's email sign-in.

**Why this priority**: People who are not ready to brief need a way to look around, change language
and reach a person; without the menu those paths do not exist in the app.

**Independent Test**: Open the menu from the landing's header, switch to Arabic and dark, confirm
the whole app changes at once and stays so after relaunch, and confirm each entry opens its
destination (or the not-found screen while its feature is unbuilt).

**Acceptance Scenarios**:

1. **Given** the landing, **When** the person taps the menu button, **Then** the menu opens with
   "Start a brief" as its one primary action and the groups Browse, You, Settings, WhatsApp and the
   legal links, matching board 06.
2. **Given** the menu, **When** the person picks عربي (or English), **Then** the whole app switches
   language and direction at once, re-reads its content in that language, and keeps the choice
   after relaunch.
3. **Given** the menu, **When** the person picks Light, Dark or Auto, **Then** the app's theme
   changes at once and the choice is kept after relaunch.
4. **Given** a signed-out person, **When** they tap "Log in with your mobile number" or "Join as a
   creator", **Then** the sign-in (20) or join (23) screen of feature 009 opens.
5. **Given** the menu, **When** the person taps "Ask us on WhatsApp", **Then** WhatsApp opens a chat
   with the business number from site settings and the default message in the app's language.
6. **Given** the menu, **When** the person taps "Close menu" or uses the system back gesture,
   **Then** the menu closes and the screen it was opened from shows unchanged.
7. **Given** the landing's header, **When** the person taps the language button ("عربي" in English,
   "English" in Arabic), **Then** the app switches language exactly as from the menu.

---

### User Story 4 - Look around below the hero (Priority: P3)

Below the hero the landing scrolls through four sections: "What do you need shot?" (occasion tiles
that start a brief), "Meet the creators" (a slowly moving strip of real creator cards with a Pause
control that stops every loop on the page), "Shoot for a living?" (a dark band inviting creators to
join) and "Ready when you are" (back up to the brief).

**Why this priority**: These sections help people who do not know what to type and recruit
creators, but the brief in the hero already carries the main path.

**Independent Test**: Scroll the landing, tap an occasion tile and see the brief open with that
occasion filled; press Pause and confirm nothing moves; open a creator card; tap "Join as a
creator"; tap "Start your brief" and return to the bar.

**Acceptance Scenarios**:

1. **Given** the occasion section, **When** the person taps a tile, **Then** the brief opens with
   that occasion chosen and its next unanswered step showing.
2. **Given** the occasion section, **When** the person taps "Or pick your own", **Then** the brief
   opens at its first step.
3. **Given** enough listed creators exist, **When** the creators section shows, **Then** its strip
   moves slowly, each card shows only facts from the creator's profile, a card opens that creator's
   profile (16) and "See all" opens the directory (15).
4. **Given** the landing is moving, **When** the person presses Pause, **Then** every loop on the
   page stops (the key light, the strip, the glint, the writing example, the small scenes), the
   control reads "Play" and is announced so, and the page stays still until the person presses it
   again, also after relaunch.
5. **Given** fewer listed creators than the minimum in site settings, **When** the landing shows,
   **Then** the creators section is left out entirely, with no placeholder cards.
6. **Given** the creators band, **When** the person taps "Join as a creator", **Then** the join
   screen (23) opens.
7. **Given** the closing section, **When** the person taps "Start your brief", **Then** the page
   returns to the hero and the brief opens at its first unanswered step.
8. **Given** a screen reader or switch control is in use, **When** focus reaches the strip,
   **Then** the strip does not move on its own and each card is reachable in order.

---

### Edge Cases

- No active persona or no option set can be read: the hero keeps its headline, the bar is not
  shown, and the one primary action becomes "Ask us on WhatsApp"; the failure is reported, never
  hidden by built-in options.
- The landing content cannot be loaded at all (no connection, server error): the something-went-
  wrong screen (39, feature 007) shows with "Try again" and WhatsApp.
- The creator list fails while the rest loads: the creators section is left out; the brief still
  works.
- Learning-step content cannot be loaded on the first visit: the steps are skipped this time and
  stay unseen, so they show on the next plain launch.
- An option is deactivated between loading and submitting: the brief is refused, the step it
  concerns reopens with a one-line message, and nothing is recorded.
- The same brief is submitted twice within a minute (double tap, flaky network): one brief is
  recorded.
- The anonymous brief limit per hour is reached on this device: a plain message says so and offers
  WhatsApp; nothing is recorded.
- A brief left half-built: kept while the app is open, so leaving the landing and coming back shows
  it as it was; cleared when the app is closed.
- A creator in the strip is hidden or paused after the strip loaded: tapping the card shows the
  not-found screen (37), never their old profile.
- The language is switched during the learning steps or while the brief is half-built: the screen
  redraws in the new language and keeps its place and answers.
- Largest system text: the hero, bar, tiles and menu grow and wrap; nothing is cut off and touch
  targets stay at least 44 × 44.
- iPad and wide phones: the golden-hour scene fills the width; text, bar and sections sit in the
  centred column (at most 600 px) from feature 007.
- The landing is covered by another screen or the app goes to the background: its loops stop and
  resume when it is visible again, unless paused.

## Requirements *(mandatory)*

### Functional Requirements

**First visit**

- **FR-001**: On a plain launch (from the app icon) when the learning steps have not been seen on
  this device, the app MUST show the splash (01) followed by the learning steps (02, 03, 04); a
  launch from a link MUST never show them.
- **FR-002**: The splash MUST play once, finish within 2 seconds, need no input, and then move on;
  under reduced motion it MUST show its finished frame and move on as soon as the app is ready.
- **FR-003**: Each learning step MUST show "Skip", its position ("1 of 3"), its title and text, and
  one primary action: "Next" on 02 and 03, "Start a brief" on 04; swiping forward and back MUST
  move between steps.
- **FR-004**: Each learning step's demonstration MUST be built from the app's real components (the
  brief bar with a list on 02, creator rows with a price and the primary action on 03, the phone
  field and code cells on 04), MUST NOT respond to touches, and MUST be described to screen readers
  in one sentence rather than read element by element. The content shown inside the demonstrations
  is [NEEDS CLARIFICATION: Should the example creators, prices and phone number inside the learning
  steps be (a) editor-written example content from the CMS, or (b) live data (real listed creators
  and a price computed for an example brief)? The boards show named creators and prices, which would
  be invented proof if they were not real or not clearly examples.]
- **FR-005**: Skipping or finishing the steps MUST mark them as seen on this device; they MUST not
  show again unless the app's data is cleared.

**Landing hero and the brief**

- **FR-010**: The landing (05) MUST show the header (wordmark, a language button labelled with the
  other language's name, the account button, the menu button), then the hero over the golden-hour
  scene with the headline, the sub-headline, the brief bar, the primary action and its hint.
- **FR-011**: The brief's sentence, slots, option sets, labels, defaults, placeholders, primary
  action label and hint MUST come from the CMS (001 FR-046, FR-047, FR-051), with options filtered
  to the chosen professional type or types and in their configured order (001 FR-048, FR-063).
- **FR-012**: The brief MUST work step by step as on the website (001 FR-067): one step's list at a
  time; a choice prints a tappable word and shows the next unanswered step; a step that takes
  several choices advances with "Continue"; an optional step offers its skip; typing searches every
  step's options at once; tapping a printed word reopens its step with its current choice focused;
  a "take back" action removes the last answer.
- **FR-013**: Nothing in the brief MUST be pre-filled; a slot's default only lists that option
  first (001 FR-055, FR-067).
- **FR-014**: Before the bar is first touched, it MUST write an example sentence once (an
  illustration, never answers); the first touch MUST end it and show the real first step.
- **FR-015**: Dates MUST be chosen in the business time zone, past dates MUST be refused, and dates
  MUST be shown in the app language's format.
- **FR-016**: The primary action "See price and who's free" MUST be the landing's one primary
  action at all times: with an incomplete brief it opens the first unanswered step with a one-line
  message; with a complete brief it records the brief and opens Quick Match step 2 (07, feature
  012). Until feature 012 is built, a complete brief MUST instead be recorded and WhatsApp opened
  with the configured message, followed by a confirmation with the brief reference (001 FR-049,
  FR-059).
- **FR-017**: Recording a brief MUST store every answer and its label, the date, the language, the
  source (the app's landing), the time, and the member when signed in; it MUST record at most one
  brief for identical submissions within one minute and honour the per-visitor hourly limit from
  site settings with a plain message and a WhatsApp way out (001 FR-049, FR-050).
- **FR-018**: Building and recording a brief MUST NOT require an account, a number or sign-in; the
  number is asked at the end of Quick Match (screens 10 and 11, feature 012).

**Below the hero**

- **FR-020**: The occasion section MUST show its title and tiles from the CMS in their configured
  order, each with the occasion's image when one exists and a scene tile otherwise; a tile MUST
  open the brief with that occasion chosen; "Or pick your own" MUST open the brief at its first
  step; with no tiles, the section MUST be left out.
- **FR-021**: The creators section MUST show listed creators only (verified and active, 002 FR-002)
  chosen by the same editor rule as the website's network section (002 FR-003); each card MUST show
  the creator's own cover photo or a scene tile, name, professional types, emirate, code and the
  starting price only as decided by feature 011; a card MUST open the creator's profile (16) and
  "See all" MUST open the directory (15).
- **FR-022**: The creators section MUST be left out when fewer listed creators exist than the
  minimum set in site settings.
- **FR-023**: The creators band MUST stay dark in both themes, take its title and text from the CMS
  (with persona placeholders resolved, 001 FR-028, FR-041), and offer "Join as a creator" as a
  secondary action that opens the join screen (23, feature 009).
- **FR-024**: The closing section MUST offer "Start your brief", which returns to the hero and opens
  the brief at its first unanswered step; this repeat of the hero's action at the end of the
  scrolling page counts as the same one primary action.
- **FR-025**: The landing's sections MUST be [NEEDS CLARIFICATION: Does the app landing render the
  CMS landing page's sections in the editor's order (drawing only the four section types the app
  designs and skipping the others), or is it a fixed app layout of the four designed sections
  (occasions, creators, creators band, closing) whose content comes from the CMS?]

**Motion on the landing**

- **FR-030**: The landing MUST be the only screen in this feature with looping motion: the key
  light on the hero, the moving creator strip, the glint on the primary action every 7 seconds, the
  writing example, and the small scenes.
- **FR-031**: The landing MUST offer one Pause control (in the creators section heading, or near
  the hero when that section is left out) that stops every loop on the page; its state MUST be
  announced, MUST be kept on the device, and MUST hold until the person presses it again.
- **FR-032**: Loops MUST stop while the landing is covered or the app is in the background, and the
  strip MUST stop while it is touched or while a screen reader or switch control is in use.
- **FR-033**: Under reduced motion the landing MUST be still from its first frame; the Pause
  control MUST read "Play", and pressing it MUST start the loops for that visit only.
- **FR-034**: On screens 01 to 04 and 06, self-started motion MUST end within 5 seconds (the splash
  within 2 seconds; the learning steps' light settles once).

**Menu and header**

- **FR-040**: The menu (06) MUST show, in this order: "Start a brief" as its one primary action
  (opening the landing's brief at its first unanswered step); Browse (Creators to 15, Guides to 33,
  How it works to the editor-built page 35); You; Settings (Language and Theme); "Ask us on
  WhatsApp"; the legal links (Terms, Professional terms, Privacy, to 36); and "Editor? Sign in with
  email".
- **FR-041**: Signed out, the You group MUST offer "Log in with your mobile number" (20) and "Join
  as a creator" (23); signed in, it MUST offer the person's name and a way to their account (24 or
  27, features 013 and 014) instead.
- **FR-042**: Language (English, عربي) and Theme (Light, Dark, Auto) MUST apply at once to the
  whole app with no restart and be kept on the device (feature 006); a language change MUST re-read
  content in that language.
- **FR-043**: "Ask us on WhatsApp" MUST open a chat with the business number and the default
  message from site settings, in the app's language, and fall back to WhatsApp's web address when
  WhatsApp is not installed.
- **FR-044**: "Editor? Sign in with email" MUST open the website's editor sign-in in the system
  browser; the app has no email sign-in.
- **FR-045**: The menu MUST close with its close button or the system back gesture and return to
  the screen it was opened from unchanged.
- **FR-046**: The header's account button MUST open the person's account (013 or 014) when signed
  in and the sign-in screen (20) otherwise; its language button MUST switch language as FR-042 does.
- **FR-047**: A destination whose feature is not built yet MUST show the not-found screen (37),
  never a blank screen (007 FR-031).

**Design, content and accessibility**

- **FR-050**: Screens 01, 02, 03, 04, 05 and 06 MUST match their canvas boards in English and
  Arabic, light and dark, through the design-fidelity check of feature 007; 05 is compared at its
  full scroll height. States with no board (an open step list on the landing, the landing without
  the creators section, the signed-in menu) MUST be kept as the app's own baselines.
- **FR-051**: Each screen MUST have at most one primary action, drawn as the Top Hit in the fixed
  primary red: none on 01; "Next" on 02 and 03; "Start a brief" on 04 and 06; "See price and who's
  free" on 05 (repeated as "Start your brief" at its end, FR-024).
- **FR-052**: Every text the person reads that is product content (headline, hints, section copy,
  learning-step text, occasions, personas, professions, places, creator facts, prices, the WhatsApp
  number and message) MUST come from the CMS through the mobile API (feature 008), never from app
  constants; interface labels ("Skip", "Next", "Close menu") MUST come from the app's English and
  Arabic string files.
- **FR-053**: Arabic MUST be right to left, using start and end positions only, with direction-
  implying icons mirrored, and every Arabic string MUST be written or reviewed by a person, never
  machine-translated.
- **FR-054**: Every interactive element MUST have a touch target of at least 44 × 44, a screen-
  reader name, role and state in the app's language (the labels on the boards, for example "Open
  menu", "Pause motion on this page", "Step 1 of 3"), and MUST work at the largest system text size;
  decorative camera details on the scenes MUST be hidden from screen readers.
- **FR-055**: These screens MUST NOT show ratings, verified badges, review counts, testimonials,
  client logos or counts; a count MAY appear only when it is computed from real data.
- **FR-056**: Nothing in this feature MUST ask for payment or show a way to pay in the app.

### Key Entities

- **Learning step**: position (1–3), title and text per language from the CMS, and the
  demonstration it shows; the same three steps feed the "How it works" page (feature 015).
- **First-visit state**: per device, whether the learning steps have been seen.
- **Landing content**: headline, sub-headline, hints, and the titles, texts and items of the
  occasion section, the creators section, the creators band and the closing section, per language.
- **Brief sentence, slot and option set**: as in feature 001; the sentence with slot tokens, each
  slot bound to a kind (professional type, option set, date, number), and option sets with labels
  per language, order, active flag and the professional types they apply to.
- **Brief**: the recorded answers with labels, date, language, source, member (when signed in),
  time and a stable reference used by Quick Match.
- **Creator card**: a listed creator's cover, name, professional types, emirate, code and (per
  feature 011) starting price.
- **Site settings**: WhatsApp number and default message, the hourly brief limit, the minimum
  number of creators for the strip, the active personas.
- **Motion preference**: per device, whether the landing's loops are paused.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a usability session, 4 of 5 first-time participants go from opening the app to a
  recorded brief in under 60 seconds, without help.
- **SC-002**: A person on a mid-range phone on a 4G connection can tap the brief bar within 2.5
  seconds of a plain launch, after the first visit.
- **SC-003**: From any learning step, the landing is one tap away; the first visit (splash and three
  steps) takes under 30 seconds when read without skipping.
- **SC-004**: The learning steps show at most once per device: 0 repeat showings across relaunches
  in testing.
- **SC-005**: Screens 01 to 06 pass the fidelity check in all four variants, with at most 1 % of
  pixels differing and every key element within 1 px.
- **SC-006**: An editor's change to landing copy, occasions or option sets is visible in the app
  within 60 seconds of publishing, the next time the landing is opened, with no app update.
- **SC-007**: Pressing Pause stops 100 % of the landing's loops; with reduced motion on, 0 frames of
  animation play on screens 01 to 06; on 01 to 04 and 06, self-started motion ends within 5 seconds.
- **SC-008**: A review of the app's code finds 0 profession, occasion, place, price or marketing
  sentence written in it.
- **SC-009**: Every acceptance scenario `ML-US1-S1` … `ML-US4-S8` has an automated test named with
  its id.

## Assumptions

- Features 007 (design system, routes, first-run flag, screens 37 and 39, fidelity check), 008
  (mobile API, including recording a brief and reading landing content, option sets, creators and
  site settings) and 009 (sign-in 20, join 23) exist before this feature is built. Feature 006
  provides the saved language and theme.
- The splash plays on the first visit only; later plain launches show the platform's launch screen
  and go straight to the landing. The splash shows the wordmark and tagline as brand artwork in both
  languages, because it plays before any content can load; it is the only brand text in this
  feature not read from the CMS.
- The hero always uses the drawn golden-hour scene; a hero photograph set for the website (001
  FR-066) is not used in the app in this feature.
- The writing example in the bar uses the slots' example values from the CMS (the placeholders the
  editor sets), not built-in words.
- The minimum number of creators for the strip is a site setting, defaulting to 4 (the number a
  360 px strip shows at once).
- The landing's Pause choice is remembered on the device; the website's own Pause state is not
  shared with the app.
- A half-built brief lives only while the app is open; it is not saved to the device or the
  account.
- Where the accent choice of feature 006 sits once the menu exists is decided when this feature is
  planned; board 06 has no accent row, so adding one means changing the canvas first.
- The app has no floating WhatsApp button; WhatsApp is reached from the menu and from the screens
  that offer it.
- Push notifications, the website's 1440 landing (41), and the "How it works" page itself (feature
  015) are out of scope.
