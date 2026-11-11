# Feature Specification: Mobile creator account

**Feature Branch**: `014-creator-account`

**Created**: 2026-11-11

**Status**: Draft (spec only; plan and tasks follow when the feature is next)

**Input**: User description: "Feature 014 "creator-account" (test-id prefix MW-) for the Flutter app in apps/mobile. Build canvas screens 27 my account (creator), 28 my profile with steps that miss information, 29 every step done, 30 waiting for review, 31 availability and 32 booking requests, at the website's paths (/account, /account/profile, /account/availability, /account/bookings). Creators complete their profile in seven steps, one at a time, with a completion percentage and a plain message about what is missing; send it for review once every required step is done; block days they cannot work; and confirm or decline booking requests before their deadline. Business rules mirror the website's provider profile editor (002) and the creator side of bookings and availability (003). Depends on 009 and 011."

Test-id prefix for this feature: `MW-` (for example `MW-US1-S4`).

Design source: the canvas boards for screens 27, 28, 29, 30, 31 and 32 in
`specs/design-system/canvas/` (`manifest.json` maps each number to its board) and the canvas note
on the account screens. Business rules: `specs/002-creator-profiles/spec.md` (profile fields,
FR-011 to FR-016: gender, nationality, experience, emirates, identity documents, the 90-day
calendar, steps and completion), `specs/003-quick-match-booking/spec.md` (availability, creator
confirmation, delivery). Screen numbers below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete my profile and send it for review (Priority: P1)

A creator who has just joined opens My profile (28). It says plainly that the profile is a draft
only they can see, shows its strength as one number and a bar, and, while anything required is
missing, a message saying the profile is not complete, that clients cannot find or book them until
the team approves it, and how many steps need attention. The profile is seven steps in a sideways
strip of tabs, each with its number (a tick when done), name and a state line ("Needs languages",
"Add a short bio", "8 samples"). One step shows at a time with Back and Next; missing fields are
ringed. "Send for review" stays off until nothing required is missing. When every step is done
(29), the steps show as a list with ticks and "Send for review" is the primary action.

**Why this priority**: No creator can be listed, and no booking can reach them, until their
profile is complete and reviewed; this is the creator side's front door.

**Independent Test**: Sign in as a new creator; open My profile; see 3 steps needing attention;
fill gender, languages and upload a trade license; watch the strength and states change; see 29
with "Send for review" on; send it and see 30.

**Acceptance Scenarios**:

1. **Given** a creator with required information missing, **When** My profile opens, **Then** it
   shows "Draft", the creator's code, the strength percentage and bar, the "isn't complete yet"
   message with the number of steps needing attention, the step strip, and the current step's panel
   with Back and "Next: {step}".
2. **Given** the step strip, **When** it shows, **Then** each tab shows its number or a tick, its
   name and a state line: required and missing in the attention tone ("Needs your gender"),
   recommended in grey ("Add a short bio"), done in the accent ("8 samples"), always in words.
3. **Given** a step with missing required fields, **When** it opens, **Then** those fields are
   ringed in the attention tone with a one-line reason ("Needed before review").
4. **Given** the creator fills a field, **When** they move to another step, **Then** the step is
   saved, its tab's state and the strength update, and the attention count changes.
5. **Given** anything required is missing, **When** the creator reaches the end, **Then** "Send for
   review" is off and a line names the steps that need attention.
6. **Given** every required step is done, **When** My profile opens, **Then** 29 shows "Everything
   we need is here", the steps as a list with ticks and states, and "Send for review" as the primary
   action.
7. **Given** 29, **When** the creator taps "Send for review", **Then** the profile is sent and the
   waiting-for-review screen (30) shows.
8. **Given** the identity step, **When** the creator uploads an Emirates ID or a trade license as a
   photo or a PDF up to 5 MB, **Then** it shows as uploaded with its date and "Waiting for our
   check"; a larger file or another format is refused with a one-line message.
9. **Given** a save fails (no connection, a field rejected), **When** it happens, **Then** the step
   of the first error opens with its message and nothing already saved is lost.

---

### User Story 2 - Answer booking requests (Priority: P1)

A live creator opens Bookings (32). Updates at the top ("New request for Sat 14 Dec") can be marked
as read. The request waiting for an answer is the one primary action: what, where, when, how long,
which profession, for whom (the client's name), the quotation reference and the deadline to answer
("Answer by 18:00"), with "Confirm" and "Decline". Below: bookings coming up, bookings done, and the
calendar's status.

**Why this priority**: A request not answered in time lapses and the client is offered someone
else; answering fast is how creators win work.

**Independent Test**: Seed an accepted booking for a live creator; open Bookings; confirm it; see
the booking move to Coming up and the day booked on the calendar; seed another and decline it with
a reason; see it leave the list.

**Acceptance Scenarios**:

1. **Given** a request waiting for the creator, **When** Bookings opens, **Then** it shows under
   "Waiting for you" with the occasion and emirate, the deadline, date and time, duration,
   profession, the client's name and the quotation reference, with "Confirm" as the primary action
   and "Decline".
2. **Given** a request, **When** the creator taps "Confirm" before its deadline, **Then** the
   booking becomes "confirmed", the day is booked on their calendar, and the request moves to
   "Coming up".
3. **Given** a request, **When** the creator taps "Decline", **Then** a sheet asks for a reason
   (optional), and sending it lapses their assignment so the client is offered another creator.
4. **Given** a request whose deadline has passed, **When** Bookings opens, **Then** it is no longer
   offered for an answer and a line says it lapsed.
5. **Given** several requests, **When** Bookings opens, **Then** the one with the nearest deadline is
   the primary action and the others are listed below it with their own Confirm and Decline.
6. **Given** a booking whose shoot day has passed, **When** Bookings opens, **Then** it offers "Mark
   as delivered", and marking it moves the booking to "delivered" for the client to confirm.
7. **Given** an update, **When** the creator taps "Mark as read", **Then** it is marked read and no
   longer counts as new.
8. **Given** a request, **When** the creator looks at it, **Then** the client's phone number is
   never shown.

---

### User Story 3 - My account at a glance (Priority: P2)

The creator's My account (27) shows who they are (name, professions, code), "Up next" with the one
thing to do as the primary action (finish the profile, answer a request, set the calendar), and "In
your account": Bookings, My profile (with its status and strength), Availability, View my public
profile ("Only you, until live"), and Log out.

**Why this priority**: It is the creator's home, but every place it links to is useful on its own
from its own path.

**Independent Test**: Sign in as a draft creator; see "Finish my profile" under Up next with the
missing steps; finish the profile; see Up next change; seed a request and see it become Up next.

**Acceptance Scenarios**:

1. **Given** a creator with a draft profile, **When** My account opens, **Then** Up next shows
   "Draft", the strength, "Your profile isn't complete yet", the steps that need attention with what
   each needs, and "Finish my profile", which opens the first of them.
2. **Given** a live creator with a request waiting, **When** My account opens, **Then** Up next shows
   that request with its deadline and an action that opens it on Bookings.
3. **Given** the In your account rows, **When** they show, **Then** each carries a status from the
   creator's own data ("None yet", "Draft · 57%", "Free every day", "Only you, until live").
4. **Given** "View my public profile", **When** tapped, **Then** the creator's public profile (16,
   feature 011) opens as clients see it, marked as a preview while the profile is not live.
5. **Given** a signed-in client, **When** they open `/account`, **Then** they see the client's
   account (24, feature 013), not this screen.

---

### User Story 4 - Block the days I cannot work (Priority: P2)

The creator opens Availability (31): a month calendar where a tap blocks or frees a day, each tap
saving at once ("Saved."); booked days are fixed; a legend; a line counting the days blocked in the
next 90 days; the list of booked shoots; and "See every day as a list" for people who prefer a
list.

**Why this priority**: Matching only offers creators on free days; a correct calendar prevents
requests the creator must decline, but the default (free every day) works until they set it.

**Independent Test**: Open Availability; block two days and free one; reopen the app and see the
same days blocked; try to change a booked day and see it refused; switch to the list view.

**Acceptance Scenarios**:

1. **Given** Availability, **When** it opens, **Then** it shows the current month with weekday
   headers in the app's language, each day marked free, unavailable or booked, the legend, and the
   count of blocked days in the next 90 days.
2. **Given** a free day within the next 90 days, **When** the creator taps it, **Then** it becomes
   unavailable, is saved at once, "Saved." shows, and the count updates; tapping again frees it.
3. **Given** a booked day, **When** the creator taps it, **Then** nothing changes and a line says
   booked days change only through the booking.
4. **Given** the previous and next month buttons, **When** used, **Then** the calendar moves by a
   month, never before the current month or beyond the 90-day window.
5. **Given** a save fails, **When** it happens, **Then** the day returns to its previous state with a
   one-line message.
6. **Given** "See every day as a list", **When** tapped, **Then** the same 90 days show as a list of
   rows, each with its state and the same tap to block or free.
7. **Given** the calendar step in My profile, **When** the creator blocks a day there, **Then**
   Availability shows the same day blocked.

---

### User Story 5 - Wait for review, then go live (Priority: P3)

After sending, My profile shows "Waiting for review" (30): where the profile stands (sent on a date,
the team checks it, then live), and what to do meanwhile: view the public profile, edit the profile
("changes are checked too"), hide the profile, and the primary action "Set your calendar".

**Why this priority**: The review is done by the team; this screen only keeps the creator informed
and busy while they wait.

**Independent Test**: Send a seeded complete profile for review; see 30; approve it in the admin;
reopen and see the profile live; hide it and see it gone from the directory.

**Acceptance Scenarios**:

1. **Given** a profile sent for review, **When** My profile opens, **Then** 30 shows "Waiting for
   review", the date sent, the three stages, the while-you-wait rows and "Set your calendar", which
   opens Availability.
2. **Given** the team approves the profile, **When** My profile opens, **Then** it shows the profile
   as live, and it appears in the directory within 60 seconds (002 US3-S2).
3. **Given** the team does not accept an identity document, **When** My profile opens, **Then** the
   identity step shows "Not accepted" with the team's note and asks for a new upload.
4. **Given** a live profile, **When** the creator edits it, **Then** clients keep seeing the last
   approved version until the change is approved (002 US3-S3), and My profile says so.
5. **Given** "Hide my profile", **When** the creator confirms it, **Then** the profile is hidden
   everywhere at once until they show it again (002 edge cases).

---

### Edge Cases

- A creator opens My profile on two devices: the last saved value wins; the other device shows it
  on its next refresh.
- Camera or photo access is refused: the upload explains in one line why access is needed and how
  to allow it, and offers choosing a file instead.
- An upload is interrupted (app closed, connection lost): the file is not shown as uploaded; the
  creator can retry.
- The sample limit is reached: "Add a sample" is off and a line gives the limit.
- A persona the creator chose is deactivated: their profile stays reachable by direct link but is
  not listed (002 edge cases); My profile says so.
- A specialty or emirate the creator chose is removed: it disappears from their choices; if that
  leaves a required field empty, the step needs attention again.
- A request arrives for a day the creator just blocked: blocking does not cancel it; the request
  still needs an answer.
- A day becomes booked while the calendar is open: the next refresh shows it booked and locked.
- Very long Arabic step names: the step strip scrolls sideways and the current tab stays in view;
  at the largest text size labels wrap.
- No connection: screens show the something-went-wrong screen (39) with "Try again"; unsaved input
  on the current step is kept on screen.

## Requirements *(mandatory)*

### Functional Requirements

**My account (27)**

- **FR-001**: The creator's My account MUST be reachable only when signed in as a creator; a
  signed-out person MUST be sent to sign in (20) and returned; a client MUST see 24 (feature 013).
- **FR-002**: It MUST show: the creator (name, professions, code); Up next with at most one item and
  its primary action (the most urgent of: a request to answer, a profile to finish, a profile to
  resend after a document was not accepted, a delivery to mark); In your account (Bookings, My
  profile, Availability, View my public profile, each with a status from the creator's data); "Log
  out".

**My profile (28, 29, 30)**

- **FR-010**: My profile MUST show the profile's status (Draft, Waiting for review, Live, Hidden),
  that only the creator can see it until it is live, and the creator's code.
- **FR-011**: The profile MUST have seven steps in this order: 1 Name and photo, 2 About you, 3 What
  you do and where, 4 Links, 5 Work samples, 6 Your calendar, 7 Verify your identity, holding the
  fields of 002 (display name, photo, bio per language, gender, nationality, years of experience,
  professional types, specialties, emirates, languages, links, samples, the 90-day calendar,
  Emirates ID and trade license).
- **FR-012**: The steps MUST show as a sideways strip of tabs, one step's panel at a time with Back
  and "Next: {step}"; each tab MUST show its number or a tick, its name and a state line in words,
  with required-and-missing, recommended and done told apart by text as well as tone (002 FR-015,
  FR-016).
- **FR-013**: The strength MUST be 14 equal parts, the 8 required for review and 6 recommended
  (photo, bio, nationality, experience, a link, a sample); the calendar is not a part (002 FR-016).
- **FR-014**: While anything required is missing, a message MUST say the profile is not complete,
  that clients cannot find or book the creator until the team approves it, and how many steps need
  attention; missing fields MUST be ringed with a one-line reason.
- **FR-015**: A step MUST be saved when the creator leaves it (Back, Next, another tab, leaving the
  screen); a failed save MUST open the step of the first error.
- **FR-016**: Gender MUST be required before review, offered as the two choices of 002 FR-011, and
  never shown publicly; the phone number MUST never be shown on the profile.
- **FR-017**: Emirates MUST be chosen, never cities (002 FR-012); professional types, specialties,
  emirates and languages MUST be the active options from the CMS, specialties limited to the chosen
  types.
- **FR-018**: The photo and samples MUST be added from the camera or the photo library, the photo at
  least 400 px, samples up to the limit set on the server, each tagged with what it shows; video
  samples MUST be links.
- **FR-019**: Identity documents MUST be uploaded as JPEG, PNG, WebP or PDF up to 5 MB, from the
  camera or files; each MUST show its state (not uploaded, waiting for our check, verified, not
  accepted with the team's note); a newer upload MUST replace the older one of the same kind; the
  files MUST be visible only to the team (002 FR-013).
- **FR-020**: "Send for review" MUST be off until every required part is done; 29 MUST show the
  steps as a list with ticks and "Send for review" as the primary action.
- **FR-021**: 30 MUST show "Waiting for review", the date sent, the stages (sent, the team checks it,
  live), "View my public profile", "Edit my profile", "Hide my profile", and "Set your calendar" as
  the primary action.
- **FR-022**: Edits to a live profile MUST stay unpublished until approved (002 US3-S3), and My
  profile MUST say that changes are checked too.
- **FR-023**: "Hide my profile" MUST ask for confirmation and hide the profile everywhere at once;
  the creator MUST be able to show it again.

**Availability (31)**

- **FR-030**: Availability MUST show a month calendar of the 90-day window starting today in the
  business time zone, with previous and next month buttons, each day marked free, unavailable or
  booked in words for screen readers, a legend, and "{n} days blocked in the next 90 days".
- **FR-031**: A tap on a free or unavailable day MUST toggle it and save at once, showing "Saved.";
  a failed save MUST restore the day with a one-line message.
- **FR-032**: Booked days (from confirmed bookings) MUST be locked; past days MUST not be changeable.
- **FR-033**: "See every day as a list" MUST show the same 90 days as rows with the same actions.
- **FR-034**: The calendar in step 6 of My profile and Availability MUST be the same data (002
  FR-014).
- **FR-035**: Availability MUST have no primary action; every change saves on its own.

**Bookings (32)**

- **FR-040**: Bookings MUST show Updates (new requests and changes, each with "Mark as read"),
  "Waiting for you", "Coming up", "Done", and the calendar's status with a link to Availability.
- **FR-041**: The request with the nearest deadline MUST be the screen's primary action, showing the
  occasion and emirate, the deadline, date and time, duration, profession, the client's name and the
  quotation reference, with "Confirm" (the Top Hit) and "Decline".
- **FR-042**: Confirming MUST make the booking "confirmed" and book the day (003 US3-S1); it MUST be
  refused after the deadline or when the booking is no longer waiting.
- **FR-043**: Declining MUST ask for an optional reason and lapse the creator's assignment so the
  client is offered another creator (003 US3-S2).
- **FR-044**: A booking past its shoot day MUST offer "Mark as delivered", which moves it to
  "delivered" for the client to confirm (003 US3-S4).
- **FR-045**: A creator MUST see only their own bookings and only the client's name, never the
  client's number (003 US4-S4).
- **FR-046**: Payments MUST be shown only as the state the team recorded ("Paid"); nothing is paid or
  requested in the app, and payouts are recorded by the team.

**Design, content and accessibility**

- **FR-050**: Screens 27, 28, 29, 30, 31 and 32 MUST match their canvas boards in English and Arabic,
  light and dark, through the design-fidelity check of feature 007, compared at their full scroll
  heights. States with no board (each of the seven step panels other than the one drawn, live and
  hidden profiles, a not-accepted document, no requests, the list view of availability, the decline
  sheet) MUST be kept as the app's own baselines.
- **FR-051**: Each screen MUST have at most one primary action, drawn as the Top Hit in the fixed
  primary red: the Up next action on 27 ("Finish my profile" on the board); none while "Send for
  review" is off on 28; "Send for review" on 29; "Set your calendar" on 30; none on 31; "Confirm" for
  the most urgent request on 32.
- **FR-052**: Professions, specialties, places, languages, step help texts and every product text
  MUST come from the CMS through the mobile API (feature 008); interface labels MUST come from the
  app's English and Arabic string files; no profession MUST be written in the app.
- **FR-053**: Arabic MUST be right to left with start and end positions only (the step strip and the
  calendar run in reading direction; weeks start on Monday as on the board), mirrored direction
  icons, and Arabic strings written by a person.
- **FR-054**: Every interactive element MUST have a touch target of at least 44 × 44 and a screen-
  reader name, role and state (the labels on the boards, for example "Profile steps", "Profile
  strength", "Previous month", "Add a sample"); calendar days MUST be announced with their date and
  state; every screen MUST work at the largest system text size.
- **FR-055**: Self-started motion (the strength bar growing, ticks drawing) MUST end within 5
  seconds, and none MUST play under reduced motion.
- **FR-056**: These screens MUST show no ratings, review counts or invented proof; the verified mark
  appears only on the public profile when identity is verified (feature 011).
- **FR-057**: The screens MUST open at `/account`, `/account/profile`, `/account/availability` and
  `/account/bookings` (and `/account/bookings/{ref}` for one request), with `/ar` opening them in
  Arabic.

### Key Entities

- **Creator profile (own view)**: every field of 002 with its per-language text, status (draft,
  waiting for review, live, hidden, suspended), last approved version and pending changes.
- **Profile step**: number, name, the fields it holds, its state (needs, recommended, done) and the
  line describing it.
- **Profile strength**: 14 parts, 8 required and 6 recommended, as a percentage.
- **Identity document**: kind (Emirates ID, trade license), upload date, state, the team's note.
- **Sample**: image or video link, tags, order.
- **Availability day**: date, state (free, unavailable, booked).
- **Booking request**: booking reference, occasion, emirate, date, time, duration, profession, client
  name, deadline, state.
- **Update**: a new request or change, read or unread.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator completes every required step and sends the profile for review in under 10
  minutes on a phone (002 SC-003).
- **SC-002**: In a usability session, 5 of 5 creators can say which steps still need them within 10
  seconds of opening My profile.
- **SC-003**: A creator confirms a waiting request in under 15 seconds from opening the app.
- **SC-004**: Blocking a day shows "Saved." within 1 second on a 4G connection for 95 % of taps.
- **SC-005**: In testing, 0 client phone numbers, 0 genders and 0 identity files are visible
  anywhere a client or another creator could see them.
- **SC-006**: Screens 27 to 32 pass the fidelity check in all four variants, with at most 1 % of
  pixels differing and every key element within 1 px.
- **SC-007**: Every acceptance scenario `MW-US1-S1` … `MW-US5-S5` has an automated test named with
  its id.

## Assumptions

- Feature 009 provides creator sign-in and joining (screen 23, where the profession is chosen and
  the professional terms are accepted); feature 011 provides the public profile the preview opens;
  008 provides the profile, uploads, availability, requests and delivery through the mobile API,
  sharing the website's rules and access.
- The sample limit, the confirmation window (24 hours) and the 90-day calendar window are the
  website's settings; board 28's "8 of 12" is placeholder data.
- Files are delivered to clients outside the app (for example by link in WhatsApp); "Mark as
  delivered" only records that it happened.
- An account is either a client or a creator; how a creator removes their account follows the
  decision taken for feature 013 (FR-031), and an account with a profile is suspended by the team
  rather than deleted (002 edge cases).
- Notifications of new requests are feature 018; until then creators see them when they open the
  app.
- Payouts, commission and invoices are recorded by the team and are out of scope.
