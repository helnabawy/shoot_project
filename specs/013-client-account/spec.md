# Feature Specification: Mobile client account

**Feature Branch**: `013-client-account`

**Created**: 2026-11-11

**Status**: Draft (spec only; plan and tasks follow when the feature is next)

**Input**: User description: "Feature 013 "client-account" (test-id prefix MK-) for the Flutter app in apps/mobile. Build canvas screens 24 my account (client), 25 finish your account and 26 your bookings at the website's paths (/account, /account/finish, /account/bookings). My account says who you are, shows the one thing to do next as the primary action, lists the places in the account with a status each, the briefs and log out. Finish your account is a one-time checklist after the first booking (number verified, name, optional email, language and theme) with a progress bar; nothing beyond number and name is mandatory. Your bookings lists upcoming and past bookings with their status. Business rules mirror the website's account (001) and bookings (003). Depends on 009 and 012."

Test-id prefix for this feature: `MK-` (for example `MK-US1-S2`).

Design source: the canvas boards for screens 24, 25 and 26 in `specs/design-system/canvas/`
(`manifest.json` maps each number to its board), the canvas notes on the account screens and the
design system's section on the first visit and where sign-in happens. Business rules:
`specs/001-landing-auth-cms/spec.md` (account page, briefs, FR-052, FR-059),
`specs/003-quick-match-booking/spec.md` (booking states, private links, members see their
quotations and bookings). Screen numbers below are canvas numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what to do next in my account (Priority: P1)

A signed-in client opens My account (24) from the header's account button. At the top: who they are
(name, number, "Client"). Then "Up next": the one thing that needs them, such as a quotation to
accept, with its status, a one-line summary and the primary action ("Review the quotation"). Then
"In your account": Bookings, Your briefs, Your details and Language and theme, each with its status
("1 waiting for you", "2 of 4", "English · auto"). Then their briefs, "Start a brief" and "Log out".

**Why this priority**: After the first booking, the account is where a client comes back to; it has
to answer "what do I need to do now?" in one look.

**Independent Test**: Sign in as a seeded client with one quotation to accept; open the account;
see the quotation under Up next with "Review the quotation"; tap it and see the quotation (12);
accept it and see Up next change.

**Acceptance Scenarios**:

1. **Given** a signed-in client, **When** My account opens, **Then** it shows their name and number
   with "Client", Up next, In your account with a status per row, their briefs, "Start a brief" and
   "Log out", matching board 24.
2. **Given** a quotation waiting for the client's acceptance, **When** My account opens, **Then** Up
   next shows that booking's status, its one-line summary (who, what, where, when, professional,
   price) and "Review the quotation", which opens the quotation (12).
3. **Given** several things need the client, **When** My account opens, **Then** Up next shows only
   the most urgent one (FR-003), and the Bookings row says how many are waiting.
4. **Given** nothing needs the client, **When** My account opens, **Then** Up next is not shown and
   "Start a brief" becomes the primary action.
5. **Given** the client's briefs, **When** the list shows, **Then** each brief shows its sentence,
   the date sent and its status in words ("We replied"), newest first.
6. **Given** a signed-out person, **When** they open `/account` or tap the account button, **Then**
   the sign-in screen (20, feature 009) opens and, once signed in, they arrive at My account.
7. **Given** a signed-in creator, **When** they open `/account`, **Then** they see the creator's
   account (27, feature 014), not this screen.

---

### User Story 2 - See all my bookings (Priority: P1)

From My account, the client opens Your bookings (26): their number at the top, tabs for Bookings,
Briefs and Settings, upcoming bookings first and past ones below, each with what, where, when, who,
the price and its status as a badge in words. A booking opens its quotation and status page. The one
primary action starts a new brief.

**Why this priority**: Clients need to find a booking again without the WhatsApp message or the
link; this is the list that replaces them.

**Independent Test**: Seed a client with bookings in several states (awaiting payment, confirmed,
paid, cancelled); open Your bookings; see them grouped and badged; tap one and see its page; switch
to Briefs and Settings.

**Acceptance Scenarios**:

1. **Given** a client with bookings, **When** Your bookings opens, **Then** it shows "Upcoming" (shoot
   date today or later, soonest first) and "Past" (earlier, most recent first), each row with the
   occasion and emirate, date and time, professional, price and a status badge in words.
2. **Given** a booking row, **When** the client taps it, **Then** its quotation or booking page
   opens (12, 13, 14 or 40, feature 012).
3. **Given** the Briefs tab, **When** the client opens it, **Then** their briefs show as on My
   account, and a brief that led to a booking links to it.
4. **Given** the Settings tab, **When** the client opens it, **Then** it shows their name, number,
   email, language and theme, each changeable as on screen 25, and "Log out".
5. **Given** a client with no bookings, **When** Your bookings opens, **Then** an empty state says
   so in one line and "Start a new brief" is the primary action.
6. **Given** a booking whose state changed, **When** the client opens or refreshes the list,
   **Then** its badge shows the new state.

---

### User Story 3 - Finish your account, once (Priority: P2)

After their first booking is saved, the client is shown, once, "Finish your account" (25): a
checklist with a progress bar ("2 of 4"), where the mobile number is already verified and the name
already given, and email (optional, for quotes and receipts) and language and theme can be added in
seconds. "Later" closes it for good; the checklist stays reachable from "Your details".

**Why this priority**: It helps clients keep receipts and set preferences, but nothing in it is
required, so it follows the screens that show bookings.

**Independent Test**: Complete a first booking as a new number; return to the app and open the
account; see 25 once with "2 of 4"; add an email and see "3 of 4"; tap "Later"; reopen the account
and see My account, not 25.

**Acceptance Scenarios**:

1. **Given** a client's first booking was saved, **When** they next open My account, **Then** 25
   shows once with the checklist (mobile number verified, your name, email, language and theme), the
   progress bar and count, and what the account does.
2. **Given** 25, **When** it shows, **Then** its primary action is the first unfinished item ("Add
   email"), and every unfinished item also has its own action ("Add", "Set").
3. **Given** the client adds a valid email, **When** it is saved, **Then** the item shows as done
   with the address, the progress advances, and the primary action moves to the next unfinished
   item.
4. **Given** an invalid email, **When** the client saves it, **Then** a one-line message under the
   field says what to fix and nothing is saved.
5. **Given** the client taps "Later", **When** 25 closes, **Then** My account shows and 25 does not
   open on its own again; "Your details" opens the same checklist.
6. **Given** the client edits their name, **When** it is saved, **Then** the new name shows in My
   account and is the name creators see on new requests.
7. **Given** "Language and theme", **When** the client sets them, **Then** the app changes at once
   and the choice is kept on the device (feature 006), and the item shows the choice.
8. **Given** every item is done, **When** 25 shows, **Then** it says so and its primary action
   returns to My account.

---

### User Story 4 - Log out and leave (Priority: P3)

The client can log out from My account or Settings, which signs this device out and returns to the
landing. They can also remove their account from the app (FR-031).

**Why this priority**: Logging out is expected but rare; account deletion is a store requirement
that must be in place before release, not for the first build.

**Independent Test**: Sign in, log out, and confirm protected screens ask to sign in again and no
personal data is left on screen; then follow the account-removal path and confirm its outcome.

**Acceptance Scenarios**:

1. **Given** a signed-in client, **When** they tap "Log out", **Then** the device is signed out, the
   landing opens, and opening `/account` asks them to sign in.
2. **Given** a client logged out, **When** someone opens the app on that device, **Then** no name,
   number, booking or brief of theirs is shown anywhere.
3. **Given** a client who chooses to remove their account, **When** they confirm, **Then** the
   outcome decided for FR-031 happens and they are signed out.

---

### Edge Cases

- The session has expired or was revoked: any account screen sends the person to sign in (20) and
  back to the same screen afterwards.
- A client has many briefs or bookings: lists load in pages as the person scrolls; the account
  screen shows the latest few briefs with a way to all of them.
- A quotation expires while Up next shows it: when the screen is next opened or refreshed, Up next
  moves to the next item and the booking shows "Expired".
- A brief recorded on the website before the person had an account (the same number signs in
  later): it appears in the account only if the website linked it to this account.
- An email already used by another account: a one-line message says it is in use; nothing is
  saved.
- The client changes the app's language: statuses, dates and briefs redraw in that language; brief
  sentences show as recorded in the language they were written in.
- No connection: the something-went-wrong screen (39) shows with "Try again"; nothing personal is
  stored for offline use.
- Largest text and long Arabic labels: rows and badges wrap; nothing is cut off at 360 px.

## Requirements *(mandatory)*

### Functional Requirements

**My account (24)**

- **FR-001**: My account MUST be reachable only when signed in; a signed-out person MUST be sent to
  sign in (20) and returned here; a creator account MUST see the creator's account (27, feature
  014).
- **FR-002**: My account MUST show, in the board's order: the person (name, number, "Client"); Up
  next; In your account (Bookings, Your briefs, Your details, Language and theme, each with its
  status); Your briefs; "Start a brief"; "Log out".
- **FR-003**: Up next MUST show at most one item, the most urgent of: a quotation to accept
  (soonest expiry first), a delivery to confirm, a booking awaiting payment, a booking whose
  professional declined; it MUST show the booking's status, a one-line summary and one action that
  opens its page; with nothing to show, Up next MUST be left out and "Start a brief" MUST be the
  primary action.
- **FR-004**: Row statuses MUST be computed from the client's own data ("1 waiting for you", "1
  open", "2 of 4", "English · auto") and say nothing when there is nothing to report.
- **FR-005**: The briefs list MUST show the client's own briefs only (001 FR-052), each with its
  sentence, the date sent and its status in words, newest first.

**Your bookings (26)**

- **FR-010**: Your bookings MUST show "Signed in as {number}", the tabs Bookings, Briefs and
  Settings, and under Bookings the client's own bookings grouped as Upcoming and Past (FR-011).
- **FR-011**: Upcoming MUST list bookings with a shoot date today or later in the business time
  zone, soonest first; Past MUST list the rest, most recent first; each row MUST show occasion and
  emirate, date and time, professional, price when set, and a status badge in words (awaiting your
  acceptance, waiting for the professional, awaiting payment, confirmed, paid, scheduled, delivered,
  completed, cancelled, expired, on hold).
- **FR-012**: A booking row MUST open its quotation or booking page (feature 012).
- **FR-013**: The Settings tab MUST offer the same details as 25 (name, number shown, email,
  language and theme) and "Log out".
- **FR-014**: "Start a new brief" MUST be the primary action, opening the landing's brief at its
  first step.
- **FR-015**: A client MUST never see another person's bookings, quotations, briefs or payments
  (003 US4-S4).

**Finish your account (25)**

- **FR-020**: 25 MUST open on its own exactly once per account, the first time the client opens My
  account after their first booking is saved; afterwards it MUST open only from "Your details".
- **FR-021**: The checklist MUST have four items: mobile number (done once verified, showing the
  number), name (done once given, with "Edit"; "Add" otherwise), email for quotes and receipts (optional, "Add"), and
  language and theme ("Set"); a progress bar and "n of 4" MUST reflect them.
- **FR-022**: The primary action MUST be the first unfinished item; when all are done it MUST return
  to My account.
- **FR-023**: Only the verified number MUST be required for an account (009 FR-014); the name
  (asked at the code step in feature 012), email, language and theme MUST stay optional, and an
  account with no name MUST show "Your account" where the name would be.
- **FR-024**: The email MUST be checked for a valid form and for use by another account; it MUST be
  used only for quotes and receipts, never for marketing.
- **FR-025**: Language and theme MUST apply at once and be kept on the device (feature 006).
- **FR-026**: "Later" MUST close 25 and keep it from opening on its own again.
- **FR-027**: The "What your account does" lines MUST come from the CMS.

**Log out and leave**

- **FR-030**: "Log out" MUST sign the device out, remove the session and any personal data the app
  holds, and open the landing.
- **FR-031**: The app MUST let a client remove their account from the app, where and with the
  outcome [NEEDS CLARIFICATION: App stores require apps that create accounts to let people delete
  their account in the app, and boards 24 and 26 have no such action. Where should it go (for
  example a row in the Settings tab), and what happens to the client's bookings, quotations and
  briefs: deleted, kept without the person's details for the business record, or deletion refused
  while a booking is in progress?]

**Design, content and accessibility**

- **FR-040**: Screens 24, 25 and 26 MUST match their canvas boards in English and Arabic, light and
  dark, through the design-fidelity check of feature 007. States with no board (nothing up next,
  no bookings, the Briefs and Settings tabs, 25 with everything done) MUST be kept as the app's own
  baselines.
- **FR-041**: Each screen MUST have exactly one primary action, drawn as the Top Hit in the fixed
  primary red: the Up next action (or "Start a brief") on 24, the first unfinished item on 25,
  "Start a new brief" on 26.
- **FR-042**: The client's data, statuses, briefs, booking details and account copy MUST come from
  the server through the mobile API (feature 008); interface labels MUST come from the app's English
  and Arabic string files; no profession, occasion, place or price MUST be written in the app.
- **FR-043**: Arabic MUST be right to left with start and end positions only, mirrored direction
  icons, Arabic strings written by a person, and the phone number read left to right inside Arabic.
- **FR-044**: Every interactive element MUST have a touch target of at least 44 × 44 and a screen-
  reader name, role and state (for example "Account completion, 2 of 4", "My account", "Account
  menu"); badges MUST be read as words; every screen MUST work at the largest system text size.
- **FR-045**: Self-started motion (the progress bar growing) MUST end within 5 seconds, and none
  MUST play under reduced motion.
- **FR-046**: These screens MUST show no ratings, counts or proof that the client's own data does
  not support, and no way to pay; payments show only as the state the team recorded.
- **FR-047**: The screens MUST open at `/account`, `/account/finish` and `/account/bookings`, with
  `/ar` opening them in Arabic.

### Key Entities

- **Client account**: name, mobile number (verified), optional email, role "client", the date the
  first booking was saved, whether "Finish your account" has been shown.
- **Up next item**: the one booking that needs the client, its status, summary and action.
- **Booking summary**: occasion, emirate, date and time, professional, price, state.
- **Brief summary**: sentence, date sent, status (new, contacted, closed), linked booking.
- **Device preferences**: language and theme (feature 006).
- **Session**: the signed-in state on this device (feature 009).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a usability session, 5 of 5 participants with a quotation waiting find and open it
  from My account within 10 seconds.
- **SC-002**: A client finds a past booking in under 15 seconds from the landing.
- **SC-003**: "Finish your account" opens on its own at most once per account: 0 repeat showings in
  testing.
- **SC-004**: Adding an email from 25 takes under 30 seconds.
- **SC-005**: After log out, 0 personal details of the client are visible anywhere in the app.
- **SC-006**: Screens 24, 25 and 26 pass the fidelity check in all four variants, with at most 1 %
  of pixels differing and every key element within 1 px.
- **SC-007**: Every acceptance scenario `MK-US1-S1` … `MK-US4-S3` has an automated test named with
  its id.

## Assumptions

- Feature 009 provides sign-in by number, the session, the account's role and its name; feature 012
  provides the booking pages that rows and Up next open; 008 provides the account, briefs and
  bookings reads and the details updates.
- An account has one role (client or creator, chosen at sign-in in feature 009); a creator who also
  books shoots does so from the creator account, which is feature 014's concern.
- The email is stored without a confirmation step in this feature; sending quotes and receipts to
  it, and confirming it, come with notifications (feature 018).
- The number cannot be changed from the app in this feature; a client who changes number asks the
  team on WhatsApp.
- "Language and theme" sets the device's preferences (feature 006); they are not stored in the
  account.
- The account screen shows the latest five briefs; the Briefs tab shows all of them.
- Saved payment methods, invoices and reviews are out of scope.
