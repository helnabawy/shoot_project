# Feature Specification: Sign in to send a brief

**Feature Branch**: `021-brief-sign-in` (worktree branch `claude/021-brief-sign-in-11a95e`)

**Created**: 2026-11-14

**Status**: Implemented 2026-11-15; **amended 2026-11-16** (session 2026-11-15 below): the switch is off by default and sign-in moves to accepting the quotation. Decisions taken on the owner's behalf are listed under Clarifications for the owner to confirm

**Input**: User description: "add new feature for guests to allow send brief but before submitting the system should make the user sign in or register to submit the brief"

Test-id prefix for this feature: `BS-` (for example `BS-US1-S2`).

## Clarifications

### Session 2026-11-15 (amendment: sign in to accept, not to brief)

The owner, after trying the app: *"the app asks user for login before listing all available creators;
I meant to list the available creators and ask the user to login before accepting the quotation in
guest mode"*. So a guest sends the brief and sees the matching creators (Quick Match step 2) with no
account, and is asked to sign in only when they accept the quotation. User Stories 1–5 below still
describe what happens **while the switch is on**; User Stories 6–8 and FR-018 onwards are the
behaviour by default.

- Q: What happens to the "Briefs need sign-in" switch (`briefNeedsSignIn`)? → A: It stays, with the
  same meaning, but is **off by default**, and a migration turns it off on the live site (it was on
  only because the first reading of the request was wrong). Off: a guest's brief is recorded at once
  and continues to step 2, exactly as before feature 021. The owner can still turn it on to ask for
  sign-in before the brief, as User Stories 1–5 describe. A missing value counts as off.
- Q: Is accepting a quotation behind a switch too? → A: No. Accepting always needs a signed-in member,
  on every channel: it starts the creators' confirmation window and leads to payment, so the booking
  must belong to an account (account bookings, payment, notifications). A member who is already
  signed in accepts in one tap, as today.
- Q: What does step 3 (details, `/match/{ref}/{key}/details`) ask of a guest? → A: On the website,
  what it asks today (name and WhatsApp number, date, add-ons, promo code) and no sign-in: the guest
  gets the quotation page (`/q/{ref}/{key}`) without an account. In the app, steps 3 and 4 are the
  approved canvas boards 09 (details), 10 (number) and 11 (code) and the quotation is issued to the
  signed-in member (012 FR-015, research R5), so the app's sign-in comes right before its quotation:
  after the creators and still before accepting. A quotation opened in the app while signed out (a
  link from WhatsApp or the website) asks for sign-in at Accept, as the website does. **Owner
  decision open:** moving the app's number and code screens from before the quotation to Accept would
  change the approved boards 09–12 and the app's quotation request; it is not part of this amendment.
- Q: How does a guest's quotation become theirs? → A: At acceptance, through the private link: when a
  signed-in member accepts a quotation whose booking has no member, the booking (and its brief, when
  that has no member either) becomes theirs in the same step, the same way a kept brief is claimed by
  whoever signs in to send it. A booking that already belongs to another member is not accepted: the
  person is told the quotation belongs to another account and to log in with the number it was made
  with. The name and WhatsApp number given at step 3 stay on the booking as given.
- Q: Where does the person land after signing in? → A: Back on the same quotation, with Accept as its
  one action: one tap accepts. Accepting is not done for them automatically, because it starts the
  creators' clock and the person should see the price again; it is still one tap. A new number becomes
  a client without the client-or-creator question (someone accepting a quotation is hiring).
- Q: What does the guest see before tapping Accept? → A: On the website, one short line under Accept
  says the next step sends a code to their mobile number; members never see it. In the app the board
  has no such line; the number screen says that signing in accepts the quotation.
- Q: What about older app versions? → A: The accept endpoint keeps its declared authentication
  (optional) and answers a signed-out caller `401 booking.errors.signInRequired`; older versions show
  their generic error. The app is not in the stores yet.
- Q: The hourly brief allowance for anonymous visitors (001 FR-050) was moot while every brief came
  from a member. → A: With the switch off it applies again to guests, unchanged; members are not
  limited. Step 3's hourly quotation limit (003) applies to guests as before.
- Q: Content that says "No account needed" / "Sign in with your number"? → A: The default content now
  says what is true: no account to brief and see who is free; a code to the mobile number when
  accepting. The owner edits the live site's copy (see Assumptions).

### Session 2026-11-14

This feature reverses a rule the product was built on. The constitution (Principle IX, "the brief
needs no account"), `PRODUCT.md` ("One sentence, one tap"), 001 (the brief records without an
account) and 010 FR-018 (the app's brief "MUST NOT require an account, a number or sign-in") all say
the opposite today. **Owner, please note:** asking for a number before the brief is sent adds one
screen (number) and one code to every first brief, and usually costs some first-time briefs. The
constitution is amended by this feature (1.4.0 → 1.5.0) so the rule is written down, and a switch in
the content area lets you turn the requirement off again without a release if the numbers drop.

The questions below were answered by the team so the work could start; each answer is the simplest
reading of the owner's request and can be changed before release.

- Q: How does the brief the guest built survive the sign-in round trip? → A: On the website it is kept
  on the visitor's device for one hour and sent as soon as they are signed in; nothing is stored on the
  server until then. In the app it is kept in memory for as long as the app is open (as today). No
  draft is ever saved as a record.
- Q: Does the WhatsApp alternative still work for guests? → A: Yes. "Message us on WhatsApp instead"
  stays open to everyone with no sign-in: it opens a chat and records nothing, so a guest always has a
  way to reach a person (Principle IX). Only *recording* a brief (and continuing to Quick Match) needs
  sign-in. The app's "book a creator" brief, which hands off to WhatsApp and records nothing, is
  unchanged.
- Q: What happens to a new number that signs up from a brief? → A: It becomes a client account
  without being asked "client or creator": someone sending a brief is hiring. A returning number signs
  straight in, whatever its account type.
- Q: Who may send a brief once signed in? → A: Every signed-in member, as today (clients, creators,
  editors and admins). Every recorded brief now carries its member.
- Q: Can the owner switch the requirement off? → A: Yes, one switch in the content area ("Briefs need
  sign-in"), on by default. Off restores today's behaviour exactly.
- Q: What about older app versions that send briefs without signing in? → A: While the switch is on,
  the server refuses a brief without a signed-in member with a clear "sign in to send your brief"
  message; older app versions show their generic error. The app is not in the stores yet, so no
  public version is affected.

Related specs: `specs/001-landing-auth-cms/` (the brief builder and briefs), `specs/002-creator-profiles/`
(`/book/{code}`), `specs/005-marketing-pages/` (`/hire/…` intent pages), `specs/003-quick-match-booking/`
(step 2 onwards), `specs/009-otp-sign-in/` (number and code sign-in on both platforms),
`specs/010-first-visit-landing/` (the app's brief bar, FR-018 superseded here),
`specs/012-mobile-quick-match/` (step 2 in the app).

## Background: the flow today

1. A visitor completes the brief sentence (hero bar on the home page, a creator's `/book/{code}`, an
   intent page `/hire/…`, or the brief bar in the app) and taps the one primary action.
2. The brief is recorded at once, for guests and members alike; a member's brief is linked to them.
3. With Quick Match on, the visitor continues to step 2 (matching creators); with it off, they are
   handed to WhatsApp with the brief written out and a reference.

This feature inserts sign-in between steps 1 and 2 for guests only, while the switch is on. Since the
2026-11-15 amendment the switch is off by default and a guest signs in at accepting the quotation
instead (User Stories 6–8).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A guest signs in to send the brief they built (website) (Priority: P1)

A guest builds a brief on the website and taps the primary action. Instead of the brief being
recorded, they are taken to sign in with their UAE mobile number and a one-time code. The sign-in
screen says why ("Sign in to send your brief") and shows the brief sentence they built. Once the code
is right, the brief is sent for them and they land on Quick Match step 2, exactly where a signed-in
member would have landed. They never type the brief again.

**Why this priority**: This is the owner's request; everything else supports it.

**Independent Test**: As a guest, build a brief on the home page, send it, sign in with a returning
number, and arrive on step 2 with a brief recorded once and linked to that member.

**Acceptance Scenarios**:

1. **Given** a guest with a complete brief and the switch on, **When** they tap the primary action,
   **Then** no brief is recorded and they are on the sign-in screen, which explains that signing in
   sends their brief and shows its sentence.
2. **Given** that guest on the sign-in screen with a number that has an account, **When** they enter
   the right code, **Then** the brief is recorded once, linked to their account, and they are on
   Quick Match step 2 for it (or, with Quick Match off, handed to WhatsApp with the brief and its
   reference, as today).
3. **Given** a guest building a brief for a creator (`/book/{code}`) or from an intent page
   (`/hire/…`), **When** they sign in, **Then** the recorded brief keeps the creator, the chosen
   creator pick and the source page, exactly as a member's brief would.
4. **Given** a guest whose brief is incomplete or invalid, **When** they tap the primary action,
   **Then** they see the same messages as today on the brief itself and are not sent to sign in.
5. **Given** a guest without JavaScript, **When** they send a complete brief, **Then** the same round
   trip works (sign-in, code, brief sent, step 2).

---

### User Story 2 - A new number registers on the way (Priority: P1)

A guest whose number has no account enters the code. Because they came to send a brief, they are
not asked whether they are a client or a creator: a client account is created, they are signed in,
and their brief is sent as in User Story 1.

**Why this priority**: Most guests who send a first brief have no account; without this the request
"sign in or register" is only half met.

**Independent Test**: With a number that has no account, send a brief as a guest, enter the code,
and arrive on step 2 with a new client account that owns the brief.

**Acceptance Scenarios**:

1. **Given** a guest from a brief with a number that has no account, **When** they enter the right
   code, **Then** no client-or-creator question is shown, a client account is created and signed in,
   and the brief is recorded and linked to it.
2. **Given** the same person signing in from the menu (not from a brief), **When** their number is
   new, **Then** the client-or-creator question is asked as today (009 unchanged).

---

### User Story 3 - The brief is never lost (Priority: P1)

A guest who leaves the sign-in screen without signing in (back button, "Change", closing the tab and
coming back within the hour) finds their brief still built on the page they came from. If the brief
can no longer be sent after sign-in (an option was removed meanwhile, the date has passed, or they
sent too many briefs this hour), they are brought back to the brief with it still filled in and a
plain message saying what to change.

**Why this priority**: The owner's condition is "keeping the brief the guest already built"; a lost
brief after a sign-in detour is the worst outcome of this feature.

**Independent Test**: Build a brief, go to sign-in, press back: the brief shows its answers. Build a
brief whose date becomes invalid before sign-in completes: after sign-in the brief shows again with
the date message.

**Acceptance Scenarios**:

1. **Given** a guest on the sign-in screen from a brief, **When** they go back to the page they came
   from within an hour, **Then** the brief shows every answer they gave and its primary action.
2. **Given** a kept brief whose answer is no longer valid when it is sent after sign-in, **When**
   sign-in completes, **Then** no brief is recorded, the person is back on the page the brief came
   from with their answers and the same message the brief shows today for that problem.
3. **Given** a kept brief older than one hour, **When** the person signs in, **Then** they land on
   their account as an ordinary sign-in does and the old brief is not sent.
4. **Given** a brief sent after sign-in, **When** the person goes back to the page it came from,
   **Then** the brief starts empty (it was sent; it is not kept).

---

### User Story 4 - A guest signs in to send the brief in the app (Priority: P1)

In the app, a guest finishes the brief bar on the landing and taps the primary action. They are taken
to the sign-in screens (number, code), which say why. Once signed in they come back and the brief is
sent for them, continuing to Quick Match step 2 as today. A new number becomes a client without the
role question. Leaving sign-in without finishing returns them to the landing with the brief as they
left it.

**Why this priority**: The app and the website must follow the same rule; the server enforces it for
both.

**Independent Test**: In the app, signed out, finish a brief, send it, sign in, and arrive on step 2;
in a second run, back out of sign-in and find the brief still filled in.

**Acceptance Scenarios**:

1. **Given** a signed-out person with a complete brief in the app and the switch on, **When** they tap
   the primary action, **Then** no brief is recorded and the sign-in number screen opens, saying that
   signing in sends the brief.
2. **Given** that person entering the right code, **When** sign-in completes, **Then** the brief is
   recorded once, linked to them, and Quick Match step 2 opens.
3. **Given** a new number from the brief, **When** the code is right, **Then** no role question is
   shown and a client account is created.
4. **Given** the person leaves sign-in without finishing, **When** they are back on the landing,
   **Then** the brief still holds every answer and nothing was sent.
5. **Given** a signed-in member, **When** they send a brief, **Then** it is recorded at once as today.

---

### User Story 5 - Members and the owner (Priority: P2)

A member who is already signed in sends a brief exactly as today: one tap, no extra screen. Guests
see, before they send, that sending will ask for their mobile number, so the extra step is never a
surprise. The owner can turn the requirement off and on in the content area; with it off, guests send
briefs exactly as before this feature.

**Why this priority**: Members are unaffected by design; the switch is the owner's safety lever.

**Independent Test**: Signed in, send a brief: step 2 at once. Turn the switch off, send a brief as a
guest: recorded at once, no sign-in.

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** they send a complete brief, **Then** it is recorded at once,
   linked to them, and they continue as today.
2. **Given** a guest with a complete brief and the switch on, **When** the primary action shows,
   **Then** a short line under it says the next step asks for their mobile number; members never see
   that line.
3. **Given** the switch off, **When** a guest sends a brief on the website or in the app, **Then** it
   is recorded without sign-in, exactly as before this feature.
4. **Given** the switch on, **When** anything other than a signed-in member tries to record a brief
   (an older app, a script), **Then** it is refused with the "sign in to send your brief" message and
   nothing is recorded.

---

### User Story 6 - A guest sees the matching creators without an account (Priority: P1)

A guest builds a brief on the website or in the app and taps the primary action. With the switch off
(the default), the brief is recorded at once and they are on Quick Match step 2 with the creators who
are free that day, exactly as a member would be. No sign-in screen comes in between. On the website
they can go on to step 3, give their name and number, and see their quotation, still without an
account.

**Why this priority**: This is the owner's correction: the creators must be visible to guests.

**Independent Test**: Signed out, with default settings, send a brief on the website and in the app:
step 2 lists the creators; on the website, step 3 issues a quotation with no sign-in.

**Acceptance Scenarios**:

1. **Given** a guest with a complete brief and default settings, **When** they tap the primary action
   on the website, **Then** the brief is recorded at once (with no member) and they are on step 2 for
   it, and no sign-in line shows under the action.
2. **Given** the same guest in the app, **When** they send the brief, **Then** it is recorded and step
   2 opens with the matching creators, with no sign-in screen.
3. **Given** a guest on the website's step 3, **When** they give their details and ask for the
   quotation, **Then** the quotation page opens for them with no sign-in, and its booking has no
   member yet.
4. **Given** fresh content settings, **When** the site settings are read, **Then** "Briefs need
   sign-in" is off.

---

### User Story 7 - A guest signs in to accept the quotation (website) (Priority: P1)

A guest on their quotation page sees Accept as the one action, with a line saying the next step sends
a code to their mobile number. Tapping Accept takes them to sign-in, which says they are logging in to
accept their quotation. Once the code is right (a new number becomes a client, no role question) they
are back on the same quotation, which is now theirs, and one tap on Accept accepts it.

**Why this priority**: It is the second half of the owner's correction: sign-in moves here.

**Independent Test**: As a guest, get a quotation, tap Accept, sign in with a new number, land on the
quotation, tap Accept: the booking is accepted and belongs to the new client.

**Acceptance Scenarios**:

1. **Given** a guest on a quotation that can be accepted, **When** the page shows, **Then** Accept is
   its one action and a line under it says the next step sends a code; a signed-in member sees no line.
2. **Given** that guest, **When** they tap Accept, **Then** nothing changes on the booking and they
   are on the sign-in screen, which says signing in accepts the quotation (this works without
   JavaScript).
3. **Given** that guest entering the right code, **When** sign-in completes, **Then** they are back on
   the same quotation with Accept as its one action; a new number became a client with no role
   question.
4. **Given** that person back on the quotation, **When** they tap Accept, **Then** the booking is
   accepted, and the booking and its brief now belong to their account (the booking shows in their
   account bookings).
5. **Given** a signed-in member whose quotation belongs to another member, **When** they tap Accept
   through the private link, **Then** nothing is accepted and they see that the quotation belongs to
   another account.
6. **Given** a signed-in member on their own quotation, **When** they tap Accept, **Then** it is
   accepted at once, as today.

---

### User Story 8 - Accepting asks for sign-in on every channel (Priority: P1)

The server never accepts a quotation for someone who is not signed in. In the app, a person who opens
a quotation while signed out (a link from WhatsApp or from the website) and taps Accept is taken to
the sign-in screens, which say they are logging in to accept; once signed in they are back on the
quotation and one tap accepts it.

**Why this priority**: The rule must hold for every caller, and the app must turn the refusal into a
sign-in, not an error.

**Independent Test**: Call the accept endpoint without a token: 401 `booking.errors.signInRequired`,
the booking unchanged. In the app, signed out on a quotation, tap Accept: the number screen opens;
sign in: back on the quotation; tap Accept: accepted.

**Acceptance Scenarios**:

1. **Given** a request to accept without a signed-in member (website action, app, script), **When** it
   reaches the server, **Then** nothing is accepted and it is refused with `booking.errors.signInRequired`
   (`401` on the app's API).
2. **Given** a signed-out person on a quotation in the app, **When** they tap Accept, **Then** the
   sign-in number screen opens with a line saying signing in accepts the quotation.
3. **Given** that person entering the right code, **When** sign-in completes, **Then** they are back
   on the quotation (a new number became a client with no role question) and one tap on Accept
   accepts it and makes the booking theirs.
4. **Given** a signed-in app member whose booking belongs to another member, **When** they accept
   through its link, **Then** it is refused with `booking.errors.otherAccount` and nothing changes.

### Edge Cases

- Amendment (2026-11-15): a guest who signs in at Accept and then leaves without accepting keeps an
  unowned quotation; it becomes theirs when they accept. Cancelling a quotation before accepting stays
  open to whoever holds the private link, as today.
- Amendment: a guest who gives one WhatsApp number at step 3 and signs in with another: the booking
  keeps the step 3 number for WhatsApp and belongs to the account they signed in with.
- Amendment: a quotation that expired while the guest was signing in: back on the quotation they see
  the expired state and "Get a fresh quotation", as today.
- Amendment: with the switch off the brief allowance per anonymous visitor (001 FR-050) applies again
  to guests; a guest over it sees today's "too many briefs" message.
- A guest who builds a brief in two tabs: the last one sent is the one kept; sign-in sends that one.
- A guest who signs in from the header instead of the brief's action, with a kept brief: the brief is
  not sent on their behalf (they did not ask to send it); it is still on the page for them to send
  with one tap.
- A person who enters a wrong code or asks for a new one: the brief stays kept; nothing is sent until
  sign-in succeeds.
- The same brief sent twice within a minute (double tap after sign-in, back and forward): recorded
  once, as today's duplicate rule.
- The hourly brief allowance limits anonymous visitors only (001 FR-050); members are not limited,
  as today. With the switch on every brief comes from a member, so the allowance stops applying and
  the one-time-code limits (009) become the guard against floods. Any other refusal after sign-in
  brings the person back to the brief with today's message and the brief still filled in.
- A creator whose profile was hidden between building and sign-in: the brief goes out as a normal
  brief, as today.
- Arabic: the sign-in screens, the kept-brief sentence and every new message are in Arabic and right
  to left, with the number kept left to right.
- The app is closed during sign-in: the brief is lost (the app keeps a brief only while it is open,
  010 edge case); the person signs in and builds it again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: While "Briefs need sign-in" is on, recording a brief MUST require a signed-in member on
  every channel (website and app); a request without one MUST record nothing and be refused with the
  message key `brief.errors.signInRequired`.
- **FR-002**: Building a brief MUST stay open to guests: every step, the sentence, the matches preview
  and the validation messages work without an account.
- **FR-003**: A guest's complete brief MUST be validated with today's rules before sign-in is asked
  for; an invalid brief shows today's messages and MUST NOT lead to sign-in.
- **FR-004**: On the website, the primary action of a guest's valid brief MUST keep the brief on the
  visitor's device for one hour and open the sign-in screen; it MUST work without JavaScript.
- **FR-005**: The sign-in screen reached from a brief MUST say that signing in sends the brief, show
  the brief's sentence, and offer a way back to the brief.
- **FR-006**: After a successful code on that path, the kept brief MUST be recorded once, linked to
  the member, with its creator, creator pick, source page and language, and the person MUST continue
  where a member's brief continues today (step 2, the details step for a one-type creator pick, or
  WhatsApp with Quick Match off).
- **FR-007**: A new number that signs in from a brief MUST become a client account without the
  client-or-creator question; sign-in that does not come from a brief MUST be unchanged (009).
- **FR-008**: Returning to the brief's page while a brief is kept MUST show the brief with every
  answer given; after the brief is sent, or after an hour, it MUST no longer be kept.
- **FR-009**: When a kept brief cannot be recorded after sign-in, nothing MUST be recorded and the
  person MUST be back on the brief's page with their answers and today's message for that problem.
- **FR-010**: Signing in any other way MUST NOT send a kept brief.
- **FR-011**: In the app, the primary action of a signed-out person's complete brief MUST open the
  sign-in screens with a line saying signing in sends the brief; after sign-in the brief MUST be sent
  automatically and continue as today; leaving sign-in MUST keep the brief.
- **FR-012**: The app MUST know before the primary action whether the requirement is on, so a guest is
  sent to sign in without first being refused.
- **FR-013**: Guests MUST see, under a complete brief's primary action, one short line saying the next
  step asks for their mobile number (website and app); members MUST NOT see it.
- **FR-014**: "Message us on WhatsApp instead" and the app's book-a-creator WhatsApp hand-off MUST
  stay available to guests with no sign-in and record nothing.
- **FR-015**: The content area MUST offer the switch "Briefs need sign-in" in the site settings, on by
  default; with it off, every channel MUST behave as before this feature.
- **FR-016**: Every new message and label MUST exist in English and Arabic; all screens meet the
  existing bar (360–1440 px, RTL, light and dark, keyboard and screen reader, 44 px targets).
- **FR-017**: The kept brief MUST hold only the brief's answers, the creator code, the creator pick,
  the source page and the language; it MUST NOT hold a number, a code or a session, and the server MUST
  re-check everything when it is sent.

#### Amendment 2026-11-15: sign in to accept

- **FR-018**: "Briefs need sign-in" MUST be off by default (a missing value counts as off) and the
  live site's value MUST be turned off by a migration; FR-001 to FR-013 apply only while it is on.
- **FR-019**: With the switch off, a guest's brief MUST be recorded at once and continue to step 2
  (website and app) with no sign-in screen and no sign-in line, as before this feature.
- **FR-020**: The website's step 3 MUST stay open to guests (name, WhatsApp number, date, add-ons,
  promo) and issue the quotation with no sign-in; the booking has no member until it is accepted.
- **FR-021**: Accepting a quotation MUST require a signed-in member on every channel; a request
  without one MUST change nothing and be refused with `booking.errors.signInRequired` (`401` problem
  on `POST /api/mobile/v1/quotations/{ref}/{key}/accept`, whose declared authentication stays
  `optional`).
- **FR-022**: When a signed-in member accepts through the private link a booking with no member, the
  booking, and its brief when that has no member, MUST become theirs in the same step; a booking that
  belongs to another member MUST NOT be accepted (`booking.errors.otherAccount`, `409` on the API).
- **FR-023**: On the website, Accept for a guest MUST lead to `/login?next=/q/{ref}/{key}&for=accept`
  (locale-prefixed), with JavaScript or without; that sign-in screen MUST say signing in accepts the
  quotation, and a new number MUST become a client without the client-or-creator question.
- **FR-024**: After that sign-in the person MUST land on the same quotation with Accept as its one
  action; one tap MUST accept it. Accepting MUST NOT happen without that tap.
- **FR-025**: On the website a guest MUST see one short line under Accept saying the next step sends a
  code to their mobile number; members MUST NOT see it.
- **FR-026**: In the app, a `401 booking.errors.signInRequired` answer to Accept MUST open the sign-in
  screens (`?for=accept`, with a line saying signing in accepts the quotation, a new number becomes a
  client) and return to the quotation afterwards; it MUST NOT show as an error.
- **FR-027**: The default content MUST NOT say that sending a brief needs sign-in; it says that no
  account is needed to brief and see who is free, and that accepting a quotation sends a code to the
  mobile number. Every new message exists in English and Arabic.

### Key Entities

- **Kept brief**: the answers of a guest's validated brief, its creator code and pick, source page,
  language, sentence and when it was kept; lives on the visitor's device for one hour (website) or in
  the app's memory while it runs; never a server record.
- **Brief** (existing, 001): now always linked to its member while the switch is on.
- **Site settings** (existing): gains the switch "Briefs need sign-in" (off by default since the 2026-11-15 amendment).
- **Booking** (existing, 003): `member` is set when a signed-in member accepts an unowned booking (amendment).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the switch on, 100 % of briefs recorded on any channel belong to a member.
- **SC-002**: A guest with a returning number goes from tapping the primary action to Quick Match step
  2 with one number entry and one code, re-typing nothing of the brief.
- **SC-003**: In every tested way of leaving sign-in early (back, change, wrong code, expired code,
  closing and reopening the website tab within an hour) the brief's answers are still there.
- **SC-004**: Signed-in members reach step 2 from the primary action with no extra screen (unchanged
  from today).
- **SC-005**: Turning the switch off restores guest briefs on the website and in the app with no
  release.
- **SC-006**: Every acceptance scenario has an automated test named with its `BS-` id.

- **SC-007** (amendment): with default settings, a guest reaches step 2 from the primary action with
  no sign-in screen, on the website and in the app.
- **SC-008** (amendment): 100 % of accepted bookings belong to a member; a guest who taps Accept goes
  from the quotation back to it with one number entry and one code, and accepts with one more tap.

## Assumptions

- Sign-in by number and code (009) is the only sign-in for clients; no email path is added.
- One hour is long enough to receive and enter a code (codes live ten minutes) and short enough that a
  stale brief is not sent unexpectedly.
- The home page stays static for speed: whether the visitor is signed in is learned in the browser, as
  the header already does, so the guest line (FR-013) may appear a moment after the page.
- Amendment: the live site's hero chip ("Sign in with your number"), the "Why book this way" item and the
  FAQ "Do I need an account?" were written for the brief gate; the default content is updated (chip "No
  account to brief", item "Brief first, account later", FAQ answer about accepting) and the owner edits the
  live copy in the content area (seed is never run against production).
- CMS copy that promises "No account needed" (the hero trust chip and the "Why book this way" item in
  the default content) is content: the default content is updated, and the owner edits the live site's
  copy in the content area.
- Quick Match steps 2 and 3 are unchanged (the amendment changes only accepting); prefilling step 3's name and number from the member is a
  possible follow-up, not part of this feature.
