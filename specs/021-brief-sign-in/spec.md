# Feature Specification: Sign in to send a brief

**Feature Branch**: `021-brief-sign-in` (worktree branch `claude/021-brief-sign-in-11a95e`)

**Created**: 2026-11-14

**Status**: Draft, decisions taken on the owner's behalf are listed under Clarifications for the owner to confirm

**Input**: User description: "add new feature for guests to allow send brief but before submitting the system should make the user sign in or register to submit the brief"

Test-id prefix for this feature: `BS-` (for example `BS-US1-S2`).

## Clarifications

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

This feature inserts sign-in between steps 1 and 2 for guests only.

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

### Edge Cases

- A guest who builds a brief in two tabs: the last one sent is the one kept; sign-in sends that one.
- A guest who signs in from the header instead of the brief's action, with a kept brief: the brief is
  not sent on their behalf (they did not ask to send it); it is still on the page for them to send
  with one tap.
- A person who enters a wrong code or asks for a new one: the brief stays kept; nothing is sent until
  sign-in succeeds.
- The same brief sent twice within a minute (double tap after sign-in, back and forward): recorded
  once, as today's duplicate rule.
- The hourly brief allowance applies per member and device as today; over it, the person is back on
  the brief with today's "too many briefs" message and the brief still filled in.
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

### Key Entities

- **Kept brief**: the answers of a guest's validated brief, its creator code and pick, source page,
  language, sentence and when it was kept; lives on the visitor's device for one hour (website) or in
  the app's memory while it runs; never a server record.
- **Brief** (existing, 001): now always linked to its member while the switch is on.
- **Site settings** (existing): gains the switch "Briefs need sign-in".

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

## Assumptions

- Sign-in by number and code (009) is the only sign-in for clients; no email path is added.
- One hour is long enough to receive and enter a code (codes live ten minutes) and short enough that a
  stale brief is not sent unexpectedly.
- The home page stays static for speed: whether the visitor is signed in is learned in the browser, as
  the header already does, so the guest line (FR-013) may appear a moment after the page.
- CMS copy that promises "No account needed" (the hero trust chip and the "Why book this way" item in
  the default content) is content: the default content is updated, and the owner edits the live site's
  copy in the content area.
- Quick Match steps 2 onwards are unchanged; prefilling step 3's name and number from the member is a
  possible follow-up, not part of this feature.
