# Feature Specification: Creator home

**Feature Branch**: `023-creator-home`

**Created**: 2026-11-17

**Status**: Clarified 2026-11-17 (ready for `/speckit-plan`)

**Input**: User description: "When the creator is logged in, the home page should be a new page for the creator, different from the client's or guest's, designed to get the needed actions done as fast as possible, keeping the general styles of the app. The owner then asked for a more professional look and simple actions."

Test-id prefix for this feature: `CH-` (for example `CH-US1-S2`).

Design authority: the three boards "Creator home, simplified" at 360 px (A · One request at a time,
B · Nothing to answer, A · Arabic · dark), canvas "Creator Home v2"
(https://claude.ai/artifact/QTXXNkQRiJkVEXi3SEhGJ5), merged into the Screens page of the Shoot design
canvas. The boards must be imported into `specs/design-system/canvas/` with manifest entries before any
app screen is built from them. The not-live home and the booking's decline step have no board yet: a
board for the not-live home (67) is drawn in the same style and approved by the owner before the app
builds that state; the booking's decline step uses the existing reject sheet's layout (board 07f) with
one optional field and is checked by widget test, not by pixel diff.

Related specs: `specs/002-creator-profiles/` (profile status and the profile editor),
`specs/003-quick-match-booking/` (booking requests a creator confirms or declines, the answer-by time),
`specs/014-creator-account/` (the creator's account, bookings and availability in the app),
`specs/019-creator-brief-inbox/` (open briefs that match a creator, accept and reject),
`specs/010-first-visit-landing/` (the landing every visitor sees today). Feature 022 (creator offers,
on its own branch) changes how a creator answers a brief; see Assumptions.

## Clarifications

### Session 2026-11-17

- Q: Should the "Completed" count show every shoot the creator has ever completed, or only this month's? → A: All time.
- Q: When a signed-in creator starts the mobile app, should the creator home be the first screen, as on the website? → A: Yes, the first screen; the client landing stays in the menu.
- Q: When a creator taps Decline on the creator home, should they be asked for the optional reason? → A: Yes. Decline opens the same optional reason step the inbox and bookings pages use today; the creator can skip it.
- Q: What should happen to the "Up next" panel on the creator's account page? → A: Keep it unchanged.

## Background: the home today

Everyone who opens the website or the app lands on the same page: the hero and the brief builder, made
for someone who needs a shoot. A creator who signs in sees that page too. The things a creator has to do
(answer a booking request before its deadline, say yes or no to a new brief) sit two taps away, split
between the account's Up next panel, the inbox and the bookings page. A creator who opens the app
because a push arrived has to find the right page first.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Answer what is waiting, one request at a time (Priority: P1)

A live creator opens the home and sees the one request that most needs an answer: what it is, when,
for how long and for whom, with two buttons, Accept and Decline. After answering, the next request
takes its place. Booking requests and new briefs are one queue; the creator does not choose a page.

**Why this priority**: This is the reason for the feature. Booking requests expire, and a brief that is
answered first is shown first to the client. Every extra tap costs the creator work.

**Independent Test**: Sign in as a live creator who has one booking request and two matching briefs,
open the home, answer all three from it without opening another page, and see each answer recorded on
the bookings page and in the inbox.

**Acceptance Scenarios**:

1. **Given** a live creator with one booking request waiting and two open matching briefs, **When**
   they open the home, **Then** the booking request is shown as the single card with its date and time,
   length, the client's first name and initial, its reference and its answer-by time, the position
   reads "1 of 3", and the two briefs are listed below it as plain rows marked "Next".
2. **Given** the card shows a booking request, **When** the creator chooses Accept, **Then** the
   booking is confirmed exactly as it would be from the bookings page, the next request becomes the
   card, the position reads "1 of 2", "To answer" falls by one and "Coming up" rises by one.
3. **Given** the card shows a brief, **When** the creator chooses Accept, **Then** the brief is
   accepted exactly as it would be from the inbox, the next request becomes the card and "To answer"
   falls by one; "Coming up" does not change.
4. **Given** the card shows any request, **When** the creator chooses Decline, **Then** the optional
   reason step that request's own page uses today is shown (the content-managed reasons for a brief,
   the optional reason for a booking); **When** the creator confirms with or without a reason, **Then**
   the request is declined exactly as it would be from its own page, the reason (if any) is recorded
   for the team, and the next request becomes the card; **When** the creator backs out of the reason
   step, **Then** nothing is recorded and the request stays as the card.
5. **Given** the card shows a booking request, **Then** the line under the buttons says that accepting
   adds the date to the creator's calendar; **Given** it shows a brief, **Then** the line says that
   accepting shows the creator first when the client chooses and that nothing is booked until the
   client does.
6. **Given** several requests are waiting, **Then** booking requests come before briefs, booking
   requests are ordered by the nearest answer-by time, and briefs by the most recently sent.
7. **Given** the creator answers the last request, **Then** the card is replaced by "You are up to
   date" with one line saying new requests show here as they arrive, and no Accept or Decline button
   remains on the page.
8. **Given** a request was taken, withdrawn or expired after the home was opened, **When** the creator
   answers it, **Then** nothing is recorded, a plain "no longer open" message is shown and the queue
   moves on.

---

### User Story 2 - A creator lands on the creator home (Priority: P1)

A signed-in creator who opens the website's home address or starts the app sees the creator home, not
the page made for clients. Everyone else sees what they see today.

**Why this priority**: Without it the creator home is one more page to find, which is the problem
being solved.

**Independent Test**: Open the home address as a guest, as a client, as a creator and as an editor,
and check that only the creator sees the creator home.

**Acceptance Scenarios**:

1. **Given** a signed-in creator, **When** they open the home in English or in Arabic, on the website
   or in the app, **Then** the creator home is shown.
2. **Given** a guest, a signed-in client, an editor or an admin, **When** they open the home, **Then**
   the landing is shown exactly as today.
3. **Given** a creator on the creator home, **When** they open the menu, **Then** they can reach the
   client landing and build a brief of their own.
4. **Given** a creator signs out on the creator home, **Then** the landing is shown; **Given** a
   guest on the landing signs in as a creator, **Then** the creator home is shown, with no reload asked
   of them.
5. **Given** a creator opens a push or a link that points at a specific booking or brief, **Then**
   that page opens as today; the creator home does not get in the way.

---

### User Story 3 - See where I stand at a glance (Priority: P2)

Above the queue the creator sees who they are signed in as, whether their profile is live, and three
counts: how many requests wait for an answer, how many shoots are coming up and how many are completed.
Below the queue they see their next shoot and three rows to manage bookings, availability and profile.

**Why this priority**: It makes the page a home, not only a queue, and it is what remains when nothing
is waiting. The queue works without it.

**Independent Test**: Sign in as a creator with known bookings and compare the three counts, the next
shoot and the availability hint with the bookings and availability pages.

**Acceptance Scenarios**:

1. **Given** a live creator, **Then** the home shows their photo (or the stand-in tile when there is
   none), their name, the names of their professional types, their creator code and the status "Live".
2. **Given** a creator with requests waiting, upcoming confirmed bookings and completed bookings,
   **Then** "To answer", "Coming up" and "Completed" show those three numbers, and each number opens
   the place where those items are listed.
3. **Given** a creator with at least one upcoming confirmed booking, **Then** "Next shoot" shows the
   nearest one as a single row with its day, title, date, time, length and payment state, and choosing
   it opens that booking.
4. **Given** a creator with no upcoming confirmed booking, **Then** the "Next shoot" section is not
   shown.
5. **Given** any creator, **Then** "Manage" lists Bookings, Availability and My profile, and the
   Availability row says whether today is free or blocked.
6. **Given** a creator with nothing waiting, no bookings and nothing completed, **Then** the counts
   read 0, the queue says "You are up to date" and the Manage rows are shown; nothing is invented to
   fill the page.

---

### User Story 4 - A creator who is not live yet knows what to do (Priority: P2)

A creator whose profile is incomplete or waiting for review opens the home and sees why no requests
are arriving and the one thing to do about it.

**Why this priority**: New creators are the ones most likely to be lost. They cannot receive requests,
so the queue would be an empty promise.

**Independent Test**: Sign in as a creator with an incomplete profile and as one in review, and check
the status, the message and the single action in each case.

**Acceptance Scenarios**:

1. **Given** a creator whose profile is incomplete, **Then** the status reads "Not live yet", the home
   says that clients cannot find or book them until the profile is approved, lists the steps still
   missing, and the one primary action is "Finish my profile", which opens the profile editor.
2. **Given** a creator whose profile is waiting for review, **Then** the status reads "In review",
   the home says the team is reviewing it, and there is no primary action.
3. **Given** a creator who is not live, **Then** no queue, no counts of requests and no Accept or
   Decline are shown; Availability and My profile remain reachable.
4. **Given** a creator's profile is approved, **When** they next open the home, **Then** the live
   home of User Stories 1 and 3 is shown.
5. **Given** a creator paused or suspended by the team, **Then** the home shows that status with the
   wording the profile rules already use, no queue and no primary action.

---

### Edge Cases

- A creator who has also booked shoots as a client sees the creator home; their own bookings as a
  client stay reachable from the account.
- A creator account that also holds an editor or admin role sees the creator home on the public site;
  the admin area is unaffected.
- A paused or suspended creator sees their status and the message the profile rules give, and no
  queue.
- A booking request whose answer-by time passes while the home is open leaves the queue on the next
  refresh; answering it shows the "no longer open" message.
- A new request arrives while the home is open: it appears on the next refresh (opening the page,
  returning to the app, pull to refresh in the app); the position and counts follow.
- The creator answers on another device or from the inbox or bookings page: the home shows the
  current queue the next time it is refreshed, and never asks for the same answer twice.
- The answer cannot be sent (offline, or the service fails): the card stays, a plain message says it
  was not sent, and the creator can try again. Nothing is shown as answered until it is.
- More requests than fit: the card is always one; the "Next" list shows the following requests up to a
  short limit and then a row that opens the full list.
- A brief with no date shows "Date to agree"; a booking's client is never shown by full name, phone
  or email on the home.
- Long titles and Arabic text wrap inside the card and the rows; nothing is cut off at 360 px.
- Professional type names come from content in the reader's language; a new professional type works
  without a change to the home.
- The landing's content (hero, brief builder) is not loaded for a creator who sees the creator home.

## Requirements *(mandatory)*

### Functional Requirements

**Who sees it**

- **FR-001**: The home MUST show the creator home to a signed-in member who has a creator profile, on
  the website in English and Arabic and in the app.
- **FR-002**: The home MUST stay unchanged for guests, clients, editors and admins.
- **FR-003**: A creator MUST be able to reach the client landing and the brief builder from the menu.
- **FR-004**: Signing in or out MUST switch between the landing and the creator home without the
  member having to reload or navigate.
- **FR-005**: Links and pushes that point at a specific page MUST keep opening that page.

**Identity and summary**

- **FR-006**: The creator home MUST show the creator's photo or stand-in tile, name, professional type
  names from content, creator code and profile status (Live, Not live yet, In review, or the paused or
  suspended status the profile rules give).
- **FR-007**: For a live creator the home MUST show three counts: To answer (booking requests waiting
  for this creator plus open briefs that match them and that they have not answered), Coming up
  (confirmed bookings not yet shot) and Completed (completed bookings, all time).
- **FR-008**: Each count MUST open the place where those items are listed.

**The queue**

- **FR-009**: The home MUST merge the creator's waiting booking requests and their open matching
  briefs into one queue, using the existing rules for which booking requests wait for a creator and
  which briefs match a creator; this feature adds no matching or booking rule.
- **FR-010**: The queue MUST order booking requests before briefs, booking requests by nearest
  answer-by time and briefs by most recently sent.
- **FR-011**: The home MUST show only the first request as a card, with: its kind (booking request or
  new brief); its title; for a booking, date and time, length, the client's first name and initial,
  reference and answer-by time; for a brief, date or "Date to agree", the professional type needed,
  when it was sent and reference.
- **FR-012**: The card MUST offer exactly two actions, Accept and Decline. Accept is the only primary
  action on the page.
- **FR-013**: Accept and Decline MUST have the same effect, the same checks and the same notifications
  as the existing confirm and decline of a booking and accept and reject of a brief.
- **FR-014**: Decline from the home MUST show the same optional reason step the inbox (for a brief)
  and the bookings page (for a booking) use today, with the same reasons, before recording the
  decline; the creator MUST be able to decline without giving a reason, and backing out of the step
  MUST record nothing.
- **FR-015**: The card MUST carry one line saying what Accept does for that kind of request.
- **FR-016**: The home MUST show the position in the queue ("1 of N") and list the following requests
  as rows marked "Next", which are not answerable until they become the card.
- **FR-017**: After an answer is recorded the next request MUST become the card and the counts and
  position MUST update, without leaving the page.
- **FR-018**: With nothing to answer the home MUST show "You are up to date" in place of the card and
  no Accept or Decline.
- **FR-019**: An answer to a request that is no longer open MUST record nothing, show a plain "no
  longer open" message and move the queue on.
- **FR-020**: An answer that could not be sent MUST never be shown as answered and MUST allow another
  try. In the app the request stays as the card with a plain "not sent" message. On the website, where
  the answer is a page submission, a failed submission leaves the request unanswered and it is the card
  again when the page is next shown.

**Next shoot and Manage**

- **FR-021**: The home MUST show the nearest upcoming confirmed booking as one row (day, title, date,
  time, length, payment state) that opens the booking, and MUST hide the section when there is none.
- **FR-022**: The home MUST list Bookings, Availability and My profile, and the Availability row MUST
  say whether today is free or blocked.

**Not live**

- **FR-023**: A creator who is not live MUST see their status, the reason requests are not arriving
  and, when their profile is incomplete, the missing steps and the single primary action "Finish my
  profile"; a creator in review MUST see that the team is reviewing it and no primary action.
- **FR-024**: A creator who is not live MUST NOT see the queue, the request counts or Accept and
  Decline.

**Privacy, content and quality**

- **FR-025**: The creator home MUST be visible only to the signed-in creator it belongs to, and MUST
  show only that creator's requests, bookings and profile.
- **FR-026**: The home MUST NOT show a client's full name, phone or email, and MUST NOT show the
  platform fee or the creator's earnings. When creators offer prices (feature 022), a brief shows the
  client's price exactly as the inbox does, and Accept accepts at that price.
- **FR-027**: Every label MUST be available in English and Arabic; Arabic is laid out right to left;
  names of professional types, specialties and places come from content, never from the interface's
  own strings.
- **FR-028**: The home MUST work in light and dark theme with no flash of the wrong one, meet WCAG 2.1
  AA, be operable by keyboard and screen reader, and hold at 360, 768, 1024 and 1440 px.
- **FR-029**: The home MUST show current data each time it is opened or returned to, and on pull to
  refresh in the app; it does not update by itself while open.
- **FR-030**: The app's creator home MUST match the canvas boards within the project's pixel-diff
  thresholds, in English light and Arabic dark.

### Key Entities

- **Request to answer**: one item of the queue, either a booking request waiting for this creator or
  an open brief that matches them. It has a kind, a title, a date (or none), a reference, a sent or
  answer-by time and, for a booking, a length and a client first name and initial. It is a view over
  existing bookings and briefs; nothing new is stored.
- **Creator summary**: the three counts and the next shoot for one creator, derived from their
  bookings and matching briefs at the moment the home is opened.
- **Profile status**: the existing status of a creator's profile (incomplete with missing steps, in
  review, live, paused or suspended), which decides which home the creator sees.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A live creator can answer a waiting request within 10 seconds of opening the home, with
  one tap after the page shows.
- **SC-002**: A creator with three waiting requests can accept all three without leaving the home, in
  three taps; each decline takes at most two taps (Decline, then confirm with or without a reason).
- **SC-003**: In a walkthrough, 9 of 10 creators asked "what do you need to do now?" answer correctly
  from the home within 5 seconds, in English and in Arabic.
- **SC-004**: The share of booking requests that expire unanswered falls after release, compared with
  the four weeks before.
- **SC-005**: Guests and clients see no change: the landing's content, speed and measured page
  budgets are the same as before the feature.
- **SC-006**: The creator home is usable within 2.5 seconds on a mid-range phone on a mobile network,
  and nothing on it moves after it shows.
- **SC-007**: In every test account, "To answer" equals the total in the queue's position ("1 of N"),
  and "Coming up" and "Completed" equal the number of items in those lists on the bookings page.
- **SC-008**: No request can be answered twice and no answer is recorded for a request that is no
  longer open, in every tested race.

## Assumptions

- Completed counts every completed booking, all time (owner, 2026-11-17).
- The creator home is the first screen for a signed-in creator in the app as well as on the website;
  the client landing stays reachable from the menu (owner, 2026-11-17).
- Decline's reason step is the existing one for each kind of request; the boards do not draw it again
  (see board 07f for the brief's). The two buttons on the card stay Accept and Decline.
- "Creator" means a signed-in member whose account type is creator (provider), the same test the
  account page uses today, whether or not they have started a profile; the profile's status (no
  profile counts as incomplete) decides the live or the not-live home.
- Feature 022 (creator offers) is not on this branch. If it lands first, "Accept" on a brief means
  whatever answering a brief means there (for example sending an offer), and the card's note and the
  brief lines follow it; the queue, the order and the two actions stay.
- New requests reach the creator through the existing push and in-app notifications; this feature
  adds none.
- Paused and suspended creators get the status and wording the profile rules already define; no new
  status is introduced.
- The "Next" list shows up to five following requests before the row that opens the full list.
- The boards cover the phone. At 768 px and wider the same content sits in the account column width
  the design system defines; no separate wide design is drawn.
- The creator account home (`/account` and the app's account screen) and its Up next panel stay
  unchanged (owner, 2026-11-17); the same requests can be seen in both places.
- The first, denser design (week strip, "Free today" switch, per-brief buttons, Directions and Message
  client) was shown to the owner and set aside for this one.
