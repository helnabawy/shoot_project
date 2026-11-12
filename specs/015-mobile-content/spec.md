# Feature Specification: Mobile guides, editor-built pages and legal

**Feature Branch**: `015-mobile-content`

**Created**: 2026-11-11

**Status**: Planned (plan, tasks and implementation on branch `claude/015-mobile-content`)

**Input**: User description: "Feature 015 "mobile-content" (test-id prefix MG-) for the Flutter app in apps/mobile. Build canvas screens 33 guides, 34 guide article, 35 editor-built page (How it works), 36 legal (Terms, Professional terms, Privacy) and 38 page removed, at the website's paths (/guides, /guides/{slug}, /{slug}, /terms, /terms/professional, /privacy). All text comes from the CMS: guides with topics and pages, articles with long-form text, editor-built pages from sections, versioned legal documents with their effective dates and earlier versions, and a removed notice distinct from not found. Business rules mirror the website's marketing and legal pages (005). Depends on 007 and 008."

Test-id prefix for this feature: `MG-` (for example `MG-US1-S2`).

Design source: the canvas boards for screens 33, 34, 35, 36 and 38 in `specs/design-system/canvas/`
(`manifest.json` maps each number to its board; 33 to 36 use the 2 % text-heavy threshold) and the
canvas note on the added screens (How it works is an editor-built page that reuses the three
learning steps and takes its questions from the CMS; Legal has no primary action). Business rules:
`specs/005-marketing-pages/spec.md` (pages, legal versions, guides, removed pages). Screen numbers
below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the terms and the privacy policy (Priority: P1)

From the menu, the sign-in screens or the join screen, a person opens a legal document (36): its
title, the version and the date it applies from, a switch between Terms, Professional terms and
Privacy, a note that the English text governs if the two languages differ, a table of contents that
jumps to each section, the numbered sections, and earlier versions. The screen is for reading, so
it has no primary action.

**Why this priority**: Sign-in records which versions a person accepted, and app stores require a
reachable privacy policy; the app cannot be released without these.

**Independent Test**: Publish versions 1 and 2 of the Terms; open `/terms` in the app; see version
2 with its date; open earlier versions and read version 1; switch to Privacy; open in Arabic with no
Arabic text and see the English text with the notice.

**Acceptance Scenarios**:

1. **Given** published legal documents, **When** a person opens `/terms`, **Then** 36 shows "Legal",
   the title, "Version {n} · applies from {date}", the switch with Terms selected, the governing-
   language note, the table of contents and the sections of the version in force.
2. **Given** the switch, **When** the person picks Professional terms or Privacy, **Then** that
   document's version in force shows, and the address changes to its own path.
3. **Given** the table of contents, **When** the person taps a section, **Then** the screen scrolls
   to it and the screen reader moves to its heading.
4. **Given** a new version with a future effective date, **When** the person opens the document,
   **Then** the version in force shows, with a line that the new version applies from its date;
   **When** the date arrives, **Then** the new version shows without any editor action.
5. **Given** "Earlier versions", **When** the person opens it, **Then** each earlier version is
   listed with its effective period and opens to its full text.
6. **Given** a document with no Arabic text, **When** it is opened in Arabic, **Then** the English
   text shows, laid out left to right, with a notice in Arabic that the Arabic text is not yet
   available and that the English text governs.
7. **Given** clause numbers, **When** the document is read in Arabic, **Then** each clause keeps the
   same number as in English.

---

### User Story 2 - Browse and read guides (Priority: P2)

A person opens Guides (33) from the menu: a line about what guides are for, topic chips (All,
Briefing, Booking, Preparing), the guides newest first (topic, title, author, reading time), pages,
a way to follow the guides by feed, and "Ready to brief?" with the one primary action "Start a
brief" and "WhatsApp us". An article (34) shows its topic, title, author and reading time, cover
image, lead, long-form text, the same call to brief, and more guides in the same topic.

**Why this priority**: Guides answer questions before people brief; useful, but the app works
without them.

**Independent Test**: Publish three articles in two topics, one dated in the future; open Guides;
see the two live ones newest first; filter by topic; open one and read it; follow its call to brief.

**Acceptance Scenarios**:

1. **Given** live articles, **When** Guides opens, **Then** they show newest first with topic, title,
   author and reading time, 12 per page, with "Previous", "Page n of m" and "Next".
2. **Given** the topic chips, **When** the person picks a topic, **Then** only that topic's articles
   show and the paging restarts; topics with no live articles are not shown.
3. **Given** an article scheduled for the future, **When** its time has not come, **Then** it is
   absent from the list, from "More guides" and from its own link (which shows not found); **When**
   the time passes, **Then** it appears without any editor action.
4. **Given** an article, **When** it opens, **Then** it shows the topic, title, author, reading time,
   the cover image with its description for screen readers, the lead, the text (headings,
   paragraphs, lists, links, images), "Ready to brief?" and up to two more guides in the same topic.
5. **Given** a link inside an article, **When** it points to a place the app has, **Then** that
   screen opens in the app; **When** it points elsewhere, **Then** it opens outside the app.
6. **Given** an article with no Arabic text, **When** it is opened in Arabic, **Then** the English
   text shows, marked as English, and the article is still listed in the Arabic list only if the
   website lists it there.
7. **Given** "Follow the guides with RSS", **When** tapped, **Then** the feed's address for the app's
   language opens outside the app.
8. **Given** "Start a brief", **When** tapped, **Then** the landing's brief opens at its first step;
   "WhatsApp us" opens WhatsApp with the default message.

---

### User Story 3 - Read an editor-built page (Priority: P2)

Any page an editor builds in the CMS (for example "How it works", Studios, About) opens in the app
at the same address as on the website (35): its title and introduction, its sections (the three
steps, questions and answers, text, a call to action) and one primary action, "Start a brief".

**Why this priority**: It lets the owner add pages to the app without an app update, and the menu's
"How it works" depends on it.

**Independent Test**: Publish a "How it works" page with steps and questions; open `/how-it-works`
in the app; see the steps and questions; expand a question; tap "Start a brief". Edit the page in
the CMS and see the change on the next visit.

**Acceptance Scenarios**:

1. **Given** a published page, **When** its address opens in the app, **Then** its title,
   introduction and sections show in the editor's order, in the app's language with English
   fallback.
2. **Given** a steps section, **When** it shows, **Then** each step shows its number, title and text
   from the CMS (the same three steps as the learning steps of feature 010 for "How it works").
3. **Given** a questions section, **When** the person taps a question, **Then** its answer opens
   below it and its expanded state is announced.
4. **Given** a page section the app does not draw, **When** the page opens, **Then** it is handled
   as decided in FR-022.
5. **Given** a draft page, **When** its address opens, **Then** the not-found screen (37) shows,
   identical to an unknown address.
6. **Given** an editor publishes a change, **When** the person opens the page again, **Then** the
   change shows within 60 seconds of publishing, with no app update.
7. **Given** a page whose address changed, **When** the old address opens, **Then** the page opens
   at its new address.

---

### User Story 4 - A removed page says so (Priority: P3)

A person who follows a link to a page or article that was deleted sees "This page has been
removed" (38): a plain line that it used to be here, then where to go next (read the guides, ask on
WhatsApp) and the one primary action "Start a brief". It is worded differently from "not found".

**Why this priority**: It only matters for old links, but it prevents a dead end.

**Independent Test**: Delete a published page; open its old address in the app; see 38 with its
three ways on; open an address that never existed and see 37 instead.

**Acceptance Scenarios**:

1. **Given** a deleted page or article, **When** its old address opens, **Then** 38 shows the
   removed notice, "Read the guides", "Ask us on WhatsApp" and "Start a brief".
2. **Given** an address that never existed or a draft, **When** it opens, **Then** the not-found
   screen (37, feature 007) shows, never 38.
3. **Given** 38, **When** the person taps "Read the guides", **Then** Guides (33) opens.

---

### Edge Cases

- Very long titles, long Arabic text and the largest text size: text wraps; nothing is cut off at
  360 px; long words and addresses in legal text break rather than overflow.
- A document mixes Arabic and English (names, addresses, numbers): each run reads in its own
  direction inside the screen's direction.
- An image in an article fails to load: its description shows in its place; the text stays.
- Unsafe markup in long-form text: it is never run or shown as markup; only the formatting the CMS
  allows is drawn.
- A guide's topic is deleted: the guide shows under the topics it still has.
- An author's name: it is shown as text; author pages open the guides list filtered to that author
  when the address is followed.
- No connection or a server error: the something-went-wrong screen (39) shows with "Try again".
- Two legal versions are in force on the same day: the website refuses this at save, so the app
  shows the one the server reports.
- A person opens an earlier legal version's link directly: it opens with a line saying a newer
  version is in force and a link to it.

## Requirements *(mandatory)*

### Functional Requirements

**Legal (36)**

- **FR-001**: The app MUST show the Terms, Professional terms and Privacy policy at `/terms`,
  `/terms/professional` and `/privacy`, each with the version in force derived from the effective
  dates (005 FR-006), its version number and the date it applies from.
- **FR-002**: The legal screen MUST show "Legal", the title, the version line, a switch between the
  three documents, the note that the English text governs if the languages differ, a table of
  contents linking to each section, the numbered sections, and "Earlier versions" with "All
  versions".
- **FR-003**: A version with a future effective date MUST be announced on the current version's
  screen ("applies from {date}") and take over on its date without an editor action.
- **FR-004**: Earlier versions MUST stay readable, each with its effective period; a person reading
  an earlier version MUST see that a newer one is in force.
- **FR-005**: A document with no Arabic text MUST show the English text in Arabic with a notice
  that the Arabic text is not yet available and that the English text governs; clause numbers MUST
  be the same in both languages.
- **FR-006**: The legal screen MUST have no primary action.
- **FR-007**: The sign-in and join screens of feature 009 MUST be able to open these documents; this
  feature provides the screens.

**Guides (33, 34)**

- **FR-010**: Guides MUST show its line from the CMS, topic chips ("All" plus each topic with live
  articles), live articles newest first with topic, title, author and reading time, 12 per page with
  "Previous", "Page n of m" and "Next", "Follow the guides with RSS", and "Ready to brief?" with
  "Start a brief" as the primary action and "WhatsApp us".
- **FR-011**: Articles scheduled for a future time MUST be absent from every list and their links
  MUST show not found until their time (005 FR-010).
- **FR-012**: An article MUST show its topic, title, author, reading time, cover image with its
  description, lead, long-form text, "Ready to brief?" and up to two more guides in the same topic.
- **FR-013**: Long-form text MUST be drawn from the CMS's allowed formatting only (headings,
  paragraphs, lists, emphasis, links, images with descriptions); no markup MUST ever be run or shown
  as code (005 FR-015).
- **FR-014**: Links in long-form text MUST open the matching app screen when the app has the path,
  and open outside the app otherwise.
- **FR-015**: The feed link MUST open the feed address for the app's language outside the app.
- **FR-016**: The guides list filtered by topic (`/guides/category/{slug}`) and by author
  (`/guides/author/{slug}`) MUST use the Guides layout with its title naming the topic or author.

**Editor-built pages (35)**

- **FR-020**: Any published page MUST open at its address (`/{slug}`, and `/ar/{slug}` in Arabic),
  resolved through the mobile API, with its title, introduction and sections in the editor's order.
- **FR-021**: The app MUST draw at least these section types as board 35 shows them: numbered steps,
  questions and answers (expandable), long-form text, and a call to action; the page's primary
  action MUST be "Start a brief" unless the page's own call to action names another action.
- **FR-022**: A section of a type the app does not draw MUST be skipped; when a page has nothing the
  app draws, it MUST show one row that opens the page on the website (plan research R1; the owner may
  change this to a per-section row or opening the whole page on the website).
- **FR-023**: A draft page MUST be indistinguishable from an unknown address (not-found, 37); a page
  whose address changed MUST open from its old address at its new one (005 FR-003).
- **FR-024**: Published changes MUST show in the app within 60 seconds, with no app update.

**Removed (38)**

- **FR-030**: A deleted page or article's address MUST show the removed screen (38): the removed
  notice, a one-line explanation, "Read the guides", "Ask us on WhatsApp" and "Start a brief" as the
  primary action; its wording MUST differ from not-found (005 FR-005).
- **FR-031**: Unknown addresses and drafts MUST show not-found (37), never 38.

**Design, content and accessibility**

- **FR-040**: Screens 33, 34, 35, 36 and 38 MUST match their canvas boards in English and Arabic,
  light and dark, through the design-fidelity check of feature 007, compared at their full scroll
  heights (33 to 36 at the 2 % threshold the manifest records). States with no board (a topic
  filter, an earlier legal version, an expanded question, an article without cover, the English
  fallback notice) MUST be kept as the app's own baselines.
- **FR-041**: Each screen MUST have at most one primary action, drawn as the Top Hit in the fixed
  primary red: "Start a brief" on 33, 34, 35 and 38; none on 36.
- **FR-042**: Every guide, page, legal text, topic, author, image and line of copy MUST come from
  the CMS through the mobile API (feature 008); interface labels ("Previous", "Next", "In this
  document") MUST come from the app's English and Arabic string files; no profession MUST be
  written in the app.
- **FR-043**: Arabic MUST be right to left with start and end positions only, mirrored direction
  icons, and Arabic interface strings written by a person; English fallback text MUST be laid out
  left to right inside the Arabic screen.
- **FR-044**: Body text MUST be large enough to read comfortably (16 px with a 1.6 line height on a
  360 px phone, as on the boards) and MUST grow with the system text size up to its largest
  setting; every interactive element MUST have a touch target of at least 44 × 44 and a screen-
  reader name, role and state (for example "Topics", "Pages", "Legal documents", "Back to the
  guides"); headings MUST be announced as headings.
- **FR-045**: Self-started motion MUST end within 5 seconds, and none MUST play under reduced motion.
- **FR-046**: These screens MUST show no invented proof (testimonials, counts, ratings, client
  logos); counts such as "Page 1 of 3" and reading times MUST be computed from real content.
- **FR-047**: These screens MUST ask for no sign-in and offer no payment.

### Key Entities

- **Legal document**: kind (terms, professional terms, privacy), with versions.
- **Legal version**: number, effective date, period in force, sections with numbers and titles,
  text per language, governing-language note.
- **Article**: title, topic(s), author, publication time, reading time, cover image with
  description, lead, long-form text, per language with English fallback.
- **Topic**: name per language, address; listed only with live articles.
- **Author**: name; their guides.
- **Page**: title, address per language, introduction, ordered sections, state (draft, published,
  removed), previous addresses.
- **Section**: type (steps, questions, long-form text, call to action, others) and its content.
- **Address resolution**: for a path, whether it is a page, a removed page or unknown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each legal document is reachable from the menu in 2 taps and from sign-in in 1 tap.
- **SC-002**: A person finds a guide on a given topic in under 20 seconds from the menu.
- **SC-003**: An editor's published change to a page, article or legal document shows in the app
  within 60 seconds, with no app update.
- **SC-004**: In testing, 0 future-dated articles appear anywhere before their time, and 0 drafts
  are distinguishable from unknown addresses.
- **SC-005**: Screens 33, 34, 35, 36 and 38 pass the fidelity check in all four variants (33 to 36
  with at most 2 % and 38 with at most 1 % of pixels differing), with every key element within
  1 px.
- **SC-006**: Every acceptance scenario `MG-US1-S1` … `MG-US4-S3` has an automated test named with
  its id.

## Assumptions

- Features 007 (shell, routes, not-found 37, something-went-wrong 39, fidelity check) and 008 (the
  mobile API's reads for guides, articles, pages, legal documents and address resolution) exist
  first; this feature can ship alongside 010 to 014.
- The guides list uses the website's page size (12) and the website's topic list; "More guides"
  shows up to two, as board 34 does.
- Reading time is computed by the server, as on the website.
- Intent pages at `/hire/{slug}` belong to feature 011; specialty pages at `/work/{specialty}` too.
- Editors preview drafts on the website only; the app never shows drafts.
- The app keeps no offline copy of guides or legal texts in this feature.
- The footer of the website has no equivalent in the app; its links live in the menu (feature 010).
