# Feature Specification: Mobile Number Sign-In with a One-Time Code

**Feature Branch**: `006-otp-signin` (spec directory; work happens on the current worktree branch)

**Created**: 2026-11-09

**Status**: Draft, clarified 2026-11-09 (decisions taken from the owner's redesign decision of 2026-11-09 and the design handoff in `specs/design-system/README.md`; the choice of a code-delivery provider is deliberately left to planning)

**Input**: User description: "Mobile-number + one-time-code sign-in: a UAE mobile number (+971 default, other country codes reachable) plus a 6-digit one-time code delivered by SMS or WhatsApp (channel chosen by the user) becomes the primary way to log in and register, as one flow; the system decides login vs. register from the number. First visit asks role ("I need a professional" / "I'm a professional") and name; returning members skip it. Code expiry, resend countdown, wrong/expired/too-many-attempts handling and rate limits. Email/password remains only as an editor fallback behind a quiet footer link. Both languages (phone and code fields stay LTR with Western digits), accessibility (one-time-code autofill, 44px targets, no colour-only state), privacy (number never in a URL, never shown publicly), migration of existing email/password accounts. OTP provider choice is a planning item, not decided here."

**Supersedes**: for members, the email-and-password account requirements of feature 001 (FR-019 to FR-023 of `specs/001-landing-auth-cms/spec.md`, US4). Those requirements continue to apply to the editor fallback described in User Story 5. The roadmap row "007 Phone / email one-time-code and Google sign-in" is replaced by this feature; email one-time codes and "Continue with Google" are not in scope.

## Clarifications

### Session 2026-11-09

Answers come from the owner's decision of 2026-11-09 (recorded in the design handoff) unless marked *default*, in which case the answer is a reasonable default chosen for this spec and listed again under Assumptions for the owner to confirm or change.

- Q: Is this one flow or two (log in / register)? → A: One flow. The person enters a mobile number and receives a code; after the code is verified the system either signs them into the account that owns that number or, if no account owns it, asks for role and name once and creates the account. The words "register" and "log in" never appear as separate choices.
- Q: What happens to email and password? → A: They remain only as a fallback behind a quiet "Editor sign-in" link in the footer, for admins and editors and for existing member accounts that still have a password. No password is ever asked for or created in the mobile flow; accounts created by mobile number have no password.
- Q: What becomes of existing member accounts (email + password, optional unverified phone)? → A (*default*): They keep working through the fallback link. On their first fallback sign-in after this feature ships, a member is asked once to add and verify a mobile number (a number already on file is offered pre-filled but is still verified by code). Once verified, the number is how that member signs in. A number stored before this feature is never treated as verified and never grants access on its own: a mobile sign-in with such a number creates a new account. Admins can set or correct an account's verified number in the content area; merging two accounts is out of scope.
- Q: Which numbers are accepted? → A: United Arab Emirates is the default country code (+971) and UAE mobile numbers are the primary case; other country codes are reachable from a list (UAE first) and are accepted by default. An admin can restrict the accepted country codes in settings (*default*).
- Q: Who chooses the delivery channel? → A: The person does, on the number screen: SMS is the default and "Prefer WhatsApp?" switches to WhatsApp. The device remembers the last choice (*default*).
- Q: What are the code rules? → A (*default*, informed by the design handoff's messages "2 tries left", "Try again in 15 minutes", a countdown shown as "0:42"): six Western digits; valid for 5 minutes; single use; at most 3 attempts per code, after which the number is locked for 15 minutes; resend possible after 60 seconds; at most 3 codes per number in any 15 minutes and 10 code requests per device in any hour; all of these are settings an admin can change without a deployment.
- Q: Does a professional choose their profession(s) in this flow? → A (*default*): No. The first-visit step asks only role and name (one primary action per screen); a professional chooses professions in the existing provider onboarding (feature 002) that they land on next. This amends feature 001 FR-019, which asked for the profession at registration.
- Q: Which provider delivers the SMS and WhatsApp messages? → A: Not decided in this spec. It is a planning decision, to be recorded in the plan's Complexity Tracking table with the alternatives rejected, as the constitution requires for any new service.
- Q: What is the daily sending cap at launch? → A (*default*, clarify pass): 500 codes per day across all channels, changeable in settings; when reached, code sign-in pauses until the next day and the owner is told.
- Q: What happens when a mobile number is recycled by the operator and its new holder signs in? → A (*default*, clarify pass): if the account owning the number has not signed in for 12 months, the code screen is followed by "Is this you, {first name}?"; "No" detaches the number from the old account (kept for admin review) and creates a new account; "Yes" signs in as before. Accounts used within 12 months are opened directly.
- Q: Do briefs and bookings now require an account? → A: No. The brief and the booking details step stay account-free (constitution Principle IX); signing in is optional and only pre-fills the number and lists past bookings.
- Q: Which words name the two roles? → A: "client" (feature 001's "seeker") and "professional" (feature 001/002's "provider", shown publicly as "creator"); the row labels themselves come from the active audience list.
- Q: What happens if "Send code" is tapped twice while a send is in progress? → A (*default*, clarify pass): the action shows a pending state and a second tap sends nothing; one code request is counted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in or join with a mobile number (Priority: P1)

A visitor, usually on a phone, taps "Sign in", types their mobile number
(+971 preset), taps "Send code", types or autofills the six-digit code and
is signed in. If the number is new to the site they answer two questions
once (who they are and their name, see User Story 4). The same two screens
serve first-time and returning members; nobody is asked whether they
already have an account, and nobody is asked for a password.

**Why this priority**: This is the owner's redesign decision and the
entrance to every signed-in surface (account, bookings, availability,
creator profile editor). Without it no other story in this feature exists.

**Independent Test**: With code delivery in a test mode that exposes the
code, sign in with a new UAE number (code → role → name → account page),
sign out, sign in again with the same number (code → account page), and
repeat on the Arabic site at 360 px in dark theme.

**Acceptance Scenarios**:

1. **Given** a visitor on the sign-in screen, **When** they enter a valid
   UAE mobile number and tap "Send code", **Then** a code is sent by the
   chosen channel and the next screen shows the number they entered with
   a "Change number" action, a six-digit code field with focus, the
   channel used ("Sent by SMS" or "Sent on WhatsApp") and a resend
   countdown; the number is not part of the page address.
2. **Given** the code screen for a number that no account owns, **When** the
   visitor enters the correct code, **Then** they see the first-visit
   step (User Story 4) and, after completing it, are signed in and land on
   their account page.
3. **Given** the code screen for a number that an account owns, **When**
   the member enters the correct code, **Then** they are signed in at once
   with no further questions and land on their account page, or on the
   page they were trying to reach when sign-in was requested.
4. **Given** the number screen, **When** the visitor enters something that
   is not a valid mobile number for the selected country (too short, too
   long, a landline prefix, letters), **Then** the field shows "That number
   doesn't look right" without sending anything, and the message is
   announced to assistive technology.
5. **Given** the number screen, **When** the visitor taps the country
   segment, **Then** a list of country codes opens with the UAE first and
   the rest searchable by country name; choosing one changes the prefix and
   the expected format, and the number field keeps what was typed.
6. **Given** the code screen, **When** the visitor taps "Change number",
   **Then** they return to the number screen with their number still
   editable, and the code already sent can no longer be used.
7. **Given** the site header, the account menu and the old registration and
   login addresses, **When** any of them is used, **Then** they all lead to
   the same mobile sign-in flow; no screen in the flow contains a password
   field.
8. **Given** an unauthenticated visitor opens a protected page (account,
   bookings, availability, profile editor), **When** they complete the
   sign-in, **Then** they return to that page.
9. **Given** a signed-in member opens the sign-in address, **When** the page
   loads, **Then** they are taken to their account page instead.
10. **Given** the Arabic site, **When** the visitor uses the flow, **Then**
    every label, message and button is Arabic and laid out right-to-left,
    while the number field and the code field read left-to-right with
    Western digits and the "+971" prefix stays on the start side of the
    number; nothing overflows at 360 px.
11. **Given** a keyboard or screen-reader user, **When** they use the flow,
    **Then** every control is reachable in order, labelled, has a visible
    focus state, and the code can be typed into one field as well as pasted
    or autofilled from the received message; no state (error, success,
    disabled, active box) is conveyed by colour alone.
12. **Given** a phone that offers the received code as a keyboard
    suggestion, **When** the visitor accepts it, **Then** the six boxes
    fill and the code is submitted without a further tap.
13. **Given** scripting is unavailable or has not loaded, **When** the
    visitor uses the flow, **Then** it still completes with a plain field
    for the number and a plain field for the code.

---

### User Story 2 - Codes that expire, can be resent and resist guessing (Priority: P1)

Codes are short-lived and single use; a wrong code says how many tries
remain; an expired code is replaced; a member who forgot to look at their
phone can ask for the code again after a short wait; a number or a device
that asks for too many codes, or guesses too often, is told to wait, with
the time stated plainly.

**Why this priority**: A six-digit code is only safe when guessing and
flooding are bounded; the same limits control the cost of sending
messages. Shipping Story 1 without this story would be insecure and open
to abuse.

**Independent Test**: With default limits, enter a wrong code three times
(1 → "2 tries left", 2 → "1 try left", 3 → locked for 15 minutes, correct
code refused), wait out a code's lifetime and submit it (expired, new code
sent), request codes until the per-number limit refuses, and confirm every
limit can be changed in the content area and takes effect without a
deployment.

**Acceptance Scenarios**:

1. **Given** the code screen, **When** the visitor enters a wrong code,
   **Then** they see "That code isn't right. 2 tries left" (then "1 try
   left"), the code field is cleared and focused, and the code already sent
   remains valid.
2. **Given** two wrong attempts on the current code, **When** a third wrong
   code is entered, **Then** the number is locked for 15 minutes, the
   message says so with the waiting time, and during the lock neither a
   correct code nor a new code request is accepted for that number.
3. **Given** a code older than its lifetime (5 minutes), **When** it is
   entered, **Then** the message says the code expired and, if the resend
   allowance permits, that a new one was sent (the countdown restarts); if
   the allowance is exhausted, the message says how long to wait instead.
4. **Given** the code screen, **When** it opens, **Then** "Resend code in
   0:59" counts down to zero and becomes a "Resend code" action; **When**
   the visitor taps it, **Then** a new code is sent by the same channel, the
   previous code stops working, the countdown restarts and the attempt
   count for the new code starts at zero.
5. **Given** a correct code, **When** it is entered a second time (for
   example in another tab), **Then** it is refused as already used.
6. **Given** a number that has received 3 codes within 15 minutes, **When**
   another code is requested for it (by any device), **Then** it is refused
   with "Too many codes sent. Try again in 15 minutes" and nothing is sent.
7. **Given** a device or visitor that has requested 10 codes within an
   hour across any numbers, **When** it requests another, **Then** it is
   refused with the waiting time regardless of the number entered.
8. **Given** an admin changes any limit (code lifetime, attempts per code,
   lock duration, resend wait, codes per number per window, requests per
   device per window, daily sending cap) in the content area, **When** the
   next code is requested, **Then** the new values apply with no deployment.
9. **Given** a locked number, **When** an admin clears the lock in the
   content area, **Then** the member can request a code immediately, and
   the clearing is recorded with who did it and when.
10. **Given** the daily sending cap has been reached, **When** a visitor
    requests a code, **Then** they see that sign-in by code is briefly
    unavailable, with the WhatsApp contact as the way to reach a person,
    and the owner is able to see that the cap was hit.
11. **Given** any outcome above, **Then** the message is shown as text next
    to the control it concerns, not only by colour, and is announced to
    assistive technology.

---

### User Story 3 - Choose SMS or WhatsApp (Priority: P1)

Before sending, the visitor sees "We'll send a 6-digit code by SMS. Prefer
WhatsApp?" and can switch. The code screen names the channel used. If one
channel fails to deliver, the visitor is offered the other.

**Why this priority**: Many UAE visitors live in WhatsApp and some numbers
(or roaming devices) receive SMS late or not at all; the owner chose a
WhatsApp-first product, so the channel must be the visitor's choice from
day one.

**Independent Test**: Request a code by SMS and by WhatsApp for the same
number in a test mode; the code screen names the right channel each time;
switch channels and confirm the device remembers the last choice; simulate
a delivery failure and confirm the other channel is offered.

**Acceptance Scenarios**:

1. **Given** the number screen, **When** it opens, **Then** SMS is the
   selected channel and a quiet "Prefer WhatsApp?" action is shown; **When**
   tapped, **Then** the line reads "We'll send a 6-digit code on WhatsApp.
   Prefer SMS?" and the code is sent on WhatsApp.
2. **Given** a code sent on one channel, **When** the code screen shows,
   **Then** it says "Sent by SMS" or "Sent on WhatsApp" and the resend uses
   the same channel unless the visitor changes it.
3. **Given** the delivery service reports that the message could not be
   delivered on the chosen channel, **When** the visitor is on the code
   screen, **Then** they see that the code could not be sent and are offered
   the other channel; the failed send counts towards the sending limits.
4. **Given** the visitor chose WhatsApp last time on this device, **When**
   they open the number screen again, **Then** WhatsApp is preselected.
5. **Given** the message templates in the content area, **When** a code is
   sent, **Then** the message is in the visitor's language, contains the
   brand name, the code and how long it is valid, contains no link that
   signs the person in, and an editor can change the wording without a
   deployment.

---

### User Story 4 - First visit: who you are and your name (Priority: P1)

The first time a number is verified, one more screen asks "I need a
photographer or videographer" or "I'm a photographer or videographer"
(labels built from the active audience list in the content area), a
name, and states that continuing accepts the Terms and Privacy Policy
(Professional Terms as well for a professional). "Done" creates the
account. Returning members never see this screen.

**Why this priority**: Without it, a new visitor cannot become a member,
so Story 1 only serves existing accounts.

**Independent Test**: Verify a new number, choose the client row, enter a
name, tap Done: an account exists with that role, name and recorded
acceptances; repeat with the professional row and confirm the next screen
is the provider onboarding; rename an audience in the content area and
confirm the row label changes.

**Acceptance Scenarios**:

1. **Given** a newly verified number, **When** the first-visit screen
   shows, **Then** it offers exactly two rows whose labels are composed
   from the active audiences ("I need a photographer or videographer" /
   "I'm a photographer or videographer"), a name field, an acceptance
   statement linking the current Terms and Privacy Policy, and a "Done"
   action; no email or password is asked for.
2. **Given** the client row and a valid name (2–80 characters), **When**
   "Done" is tapped, **Then** an account is created with the verified
   number, the client role and the name, the accepted document versions
   and time are recorded, and the member lands on their account page.
3. **Given** the professional row, **When** "Done" is tapped, **Then** the
   acceptance also covers the Professional Terms, the account is created
   as a professional, and the member lands on the provider onboarding
   where they choose their professions; the account exists even if they
   leave before finishing onboarding.
4. **Given** the active audience list is renamed or extended in the content
   area (for example "teacher" added), **When** the first-visit screen
   shows, **Then** the row labels reflect it with no code change.
5. **Given** an empty or too-short name, **When** "Done" is tapped,
   **Then** the field shows a plain-language message and nothing is
   created.
6. **Given** a visitor closes the first-visit screen without tapping
   "Done", **When** they return later and verify the same number again,
   **Then** they see the first-visit screen again and no account was
   created in between.
7. **Given** an account exists for the number, **When** its owner signs in,
   **Then** the first-visit screen is never shown, and the role cannot be
   changed by re-entering the flow.
8. **Given** any input in the flow, **When** an account is created, **Then**
   it is an ordinary member account; no step can grant editor or admin
   rights.

---

### User Story 5 - Editors and existing accounts keep a way in (Priority: P2)

Editors and admins sign in with email and password behind a quiet
"Editor sign-in" link in the footer, and the content area's own sign-in is
unchanged. Members who registered with email and password before this
feature keep that way in until they verify a mobile number, which they are
asked to do once; from then on the number signs them in.

**Why this priority**: The owner and editors must never be locked out, and
no existing member may lose access, but both groups are small and the
mobile flow (Stories 1–4) delivers the product value.

**Independent Test**: Sign in as an editor through the footer link and open
the content area; sign in as a pre-existing member through the same link,
verify a number when prompted, sign out and sign in again with that number
only; confirm that an account whose unverified phone equals a new sign-in
number is not opened by it.

**Acceptance Scenarios**:

1. **Given** the footer, **When** a visitor looks for it, **Then** an
   "Editor sign-in" link is present but visually quiet (not a primary
   action), and it leads to the email-and-password form; the content area
   sign-in continues to work unchanged.
2. **Given** an admin or editor, **When** they sign in with email and
   password, **Then** they are signed in with their roles and can open the
   content area; they may additionally verify a mobile number and use
   either way in.
3. **Given** a member account created before this feature with a password
   and no verified number, **When** its owner signs in with email and
   password, **Then** they are asked once to add and verify a mobile number
   (pre-filled from the number on file, if any, but still verified by code);
   **When** verified, **Then** that number signs them in from then on and the
   account no longer needs a password.
4. **Given** that same member declines to add a number, **When** they sign
   in with email and password the next time, **Then** they are let in and
   reminded quietly, never blocked.
5. **Given** an account that lists a phone number stored before this
   feature (never verified), **When** someone signs in by code with that
   number, **Then** a new account is created and the old account is not
   opened; the stored, unverified number grants nothing.
6. **Given** a member who can no longer receive codes (lost phone or
   number), **When** they contact the business, **Then** an admin can set
   a new verified number on their account in the content area; the change
   is recorded with who did it and when, and is refused if the number is
   already verified on another account.
7. **Given** the email-and-password form, **When** a wrong password is
   entered five times, **Then** the account locks for a bounded time as
   feature 001 requires; the form never reveals whether an email exists.

---

### User Story 6 - See and change your number, sign out (Priority: P3)

A member sees their verified number on their account page, can change it
by verifying a new one, and can sign out. The number is never shown to
other visitors and never appears in a page address.

**Why this priority**: Needed for a complete account, but rare compared to
signing in.

**Independent Test**: On the account page change the number to a new one
(code to the new number), try a number already used by another account
(refused), sign out, confirm the creator profile pages and all addresses
visited contain no number.

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** they open their account page,
   **Then** their verified number is shown formatted for reading, with a
   "Change number" action.
2. **Given** "Change number", **When** the member enters a new number and
   verifies it with a code, **Then** the account's number is replaced,
   the old number can no longer sign in, and a message is sent to the old
   number saying the number was changed.
3. **Given** a new number already verified on another account, **When**
   the member tries to use it, **Then** the change is refused with a plain
   message and nothing else is revealed about the other account.
4. **Given** a signed-in member, **When** they sign out, **Then** protected
   pages require signing in again and the browser holds nothing that
   signs them back in.
5. **Given** any public page (creator profiles, specialty pages, guides,
   pages), **When** rendered, **Then** no member's mobile number appears;
   the only number shown anywhere publicly is the business WhatsApp number
   from site settings.
6. **Given** any step of the flows in this feature, **When** the page
   address, browser history or server logs are inspected, **Then** they
   contain neither a mobile number nor a code.

---

### User Story 7 - A client finds the bookings they made before signing in (Priority: P3)

A client who briefed or booked through the WhatsApp number flow without
an account (features 001 and 003) and later signs in with that same
number sees those briefs, quotations and bookings on their account page.

**Why this priority**: It is the main reason a client would sign in at all,
but the private links from feature 003 already give them access, so the
site is complete without it.

**Independent Test**: Record a brief and a booking with a WhatsApp contact
number while signed out, sign in by code with that number, open the
account page: both are listed; sign in with a different number: neither
is.

**Acceptance Scenarios**:

1. **Given** briefs, quotations or bookings whose contact number equals a
   member's verified number, **When** the member opens their account page,
   **Then** they are listed there, and their private links keep working.
2. **Given** a signed-in client starts a new brief or booking, **When**
   the details step shows, **Then** the WhatsApp number is pre-filled with
   the verified number and may be changed for that booking only.
3. **Given** a professional's account, **When** this matching is applied,
   **Then** it only ever reveals bookings in which that person is the
   client, never other clients' bookings.

---

### Edge Cases

- The number is entered with spaces, dashes, a leading "0" (050 …), a
  leading "00971" or "+971": it is accepted and normalised to one
  international form; two spellings of the same number are the same
  account.
- The visitor switches language or theme mid-flow: the step, the number
  and the countdown are kept.
- The visitor's device autofills the code into the first box only, or
  pastes a code with spaces: the six digits are taken in order.
- Arabic-Indic digits are typed into the number or code field: they are
  accepted and shown as Western digits.
- Two tabs request codes for the same number: the latest code is the only
  valid one; the per-number limit counts both requests.
- "Send code" or "Resend code" is tapped twice while a send is in progress:
  the action shows a pending state, the second tap sends nothing and one
  request is counted.
- A mobile number is recycled by the operator and its new holder signs in
  while the old account has been unused for 12 months: the "Is this you?"
  step (FR-019) separates the two people; the old account loses the
  number but keeps its data for an admin to review.
- The old account's holder returns after their number was detached: they
  reach the business through WhatsApp and an admin sets their new verified
  number (User Story 5, scenario 6).
- The code is verified but the account cannot be created (a store failure):
  the visitor sees a plain retry message; no half-created account remains.
- A member's session expires on a protected page: the next action returns
  them to the sign-in and back afterwards (feature 001 behaviour).
- The delivery service is unreachable: the visitor is told the code could
  not be sent right now and offered the other channel and the WhatsApp
  contact; the failure is recorded for the owner.
- A country code is restricted by an admin after a member registered with
  it: that member can still sign in; new sign-ups with it are refused with
  a plain message.
- An admin disables an audience chosen by existing accounts: those
  accounts are unaffected (feature 001 behaviour); the first-visit row
  labels only list active audiences.
- A professional's account is suspended by an admin: the code still
  verifies but the account page says the account is suspended and how to
  reach a person.
- Very long names or Arabic names with diacritics: accepted within the
  length limit and shown unchanged.
- Reduced motion is requested: the country list, the box focus and the
  countdown appear without animation.

## Requirements *(mandatory)*

### Functional Requirements

**The flow**

- **FR-001**: The system MUST offer one sign-in flow for all members that
  starts with a mobile number and a delivered six-digit code, and MUST
  decide from the verified number whether to open the existing account or
  create a new one; no screen in the flow asks whether the person already
  has an account or asks for a password.
- **FR-002**: The number screen MUST preset the UAE country code (+971),
  MUST make every other country code reachable from a list ordered with
  the UAE first and searchable by country name, MUST accept local and
  international spellings of the same number and store one normalised
  international form, and MUST refuse numbers that are not valid mobile
  numbers for the chosen country before anything is sent.
- **FR-003**: Admins MUST be able to restrict the accepted country codes in
  settings without a deployment; the default accepts all.
- **FR-004**: Every entry point that previously led to login or
  registration (header, account menu, protected-page redirects, old
  addresses) MUST lead to this flow, and a successful sign-in MUST return
  the member to the page they were trying to reach, or to their account
  page.
- **FR-005**: The flow MUST work without scripting as a sequence of plain
  forms, and with scripting MUST enhance the code entry into six boxes
  driven by one real field so paste and device autofill work.

**Codes and limits**

- **FR-006**: Codes MUST be six Western digits, generated unpredictably,
  valid for a configurable lifetime (default 5 minutes), single use, and
  invalidated by a resend, by "Change number" and by a lock.
- **FR-007**: The system MUST allow a configurable number of attempts per
  code (default 3), tell the person how many tries remain after each wrong
  attempt, and after the last wrong attempt lock the number for a
  configurable time (default 15 minutes) during which neither code
  verification nor code requests are accepted for it.
- **FR-008**: Resending MUST be possible only after a configurable wait
  shown as a countdown (default 60 seconds); submitting an expired code
  MUST explain that it expired and send a new one when the sending limits
  allow, otherwise say how long to wait.
- **FR-009**: The system MUST limit code requests per number in a window
  (default 3 per 15 minutes), per device or visitor in a window (default 10
  per hour, across all numbers) and in total per day (default 500),
  refusing further requests with the waiting time; refusals MUST not
  reveal whether a number has an account; a request already in progress
  MUST NOT be repeated by a second tap.
- **FR-010**: All limits in FR-006 to FR-009 MUST be settings in the content
  area with the defaults above, applied to the next request without a
  deployment; admins MUST be able to clear a lock early, and such changes
  MUST be recorded with who made them and when.

**Delivery**

- **FR-011**: The person MUST be able to choose SMS (default) or WhatsApp
  for each code request before it is sent; the code screen MUST name the
  channel used; the device MUST remember the last chosen channel.
- **FR-012**: When delivery on the chosen channel fails or the delivery
  service is unavailable, the person MUST be told and offered the other
  channel and the business WhatsApp contact; failed sends count towards
  the sending limits.
- **FR-013**: The text of the SMS and WhatsApp messages MUST be managed in
  the content area per language, MUST include the brand name, the code and
  its validity, and MUST NOT include a link that signs the person in.
- **FR-014**: Delivery MUST go through one replaceable delivery capability
  so that the provider can change without changing the flow; the choice of
  provider and its test mode are planning decisions recorded with a
  Complexity Tracking justification.

**First visit and accounts**

- **FR-015**: The first time a number is verified, and only then, the system
  MUST ask for the role (client or professional, with labels composed from
  the active audience list in the content area), a name of 2–80
  characters, and acceptance of the applicable legal documents (feature
  005: Terms and Privacy Policy, plus Professional Terms for a
  professional), recording the accepted versions and time; it MUST NOT ask
  for an email or a password.
- **FR-016**: An account MUST be created only when the first-visit step is
  completed; a verified number without a completed step MUST leave no
  account behind.
- **FR-017**: A professional MUST be taken to the provider onboarding
  (feature 002) after the first-visit step, where professions are chosen;
  the professions requirement of feature 001 FR-019 moves there.
- **FR-018**: A verified mobile number MUST belong to at most one account;
  the role chosen at first visit MUST NOT be changeable by re-entering the
  flow; no step of the flow MUST be able to grant editor or admin rights.
- **FR-019**: When the account owning a verified number has not signed in
  for a configurable period (default 12 months), a code sign-in with that
  number MUST first ask "Is this you, {first name}?" showing nothing else
  about the account; "No" MUST detach the number from that account (kept
  for admin review, with the event recorded) and continue as a first visit;
  "Yes" MUST sign in as usual.
- **FR-020**: Members MUST be able to see their verified number on their
  account page, change it by verifying a new number (refused when that
  number is verified on another account, with a notice sent to the old
  number), and sign out; sessions MUST remain bounded as in feature 001.

**Fallback and existing accounts**

- **FR-021**: Email-and-password sign-in MUST remain available only behind a
  visually quiet "Editor sign-in" footer link and in the content area's own
  sign-in; it MUST keep feature 001's lockout and non-disclosure behaviour.
- **FR-022**: Admins and editors MUST keep their email-and-password access
  unchanged and MAY additionally verify a mobile number.
- **FR-023**: A member account that has a password and no verified number
  MUST be asked once, on its next email-and-password sign-in, to add and
  verify a mobile number (pre-filled from a stored number, still verified by
  code); it MUST NOT be blocked for declining; once verified, the number
  MUST sign that member in and the password MUST no longer be required.
- **FR-024**: A number stored on an account before this feature MUST be
  treated as unverified: it MUST NOT be used to open that account by code,
  and a code sign-in with such a number MUST create a separate account.
- **FR-025**: Admins MUST be able to set, correct or clear an account's
  verified number in the content area; such changes MUST be recorded with
  who made them and when and MUST be refused when the number is verified
  on another account. Merging accounts is out of scope.
- **FR-026**: After sign-in, briefs, quotations and bookings whose contact
  number equals the member's verified number MUST be listed on the
  member's account page, and new bookings MUST pre-fill that number; the
  listing MUST only ever show records in which the member is the client.

**Privacy and security**

- **FR-027**: Mobile numbers and codes MUST never appear in a page address,
  query string, browser history entry, log line or error report, and a
  member's number MUST never be shown on any public page or to any other
  member.
- **FR-028**: Codes MUST be stored only in a form that cannot be read back,
  MUST never be logged or returned by any interface outside the delivery
  message, and MUST be discarded when used, expired or invalidated.
- **FR-029**: The system MUST keep, for the owner, a record of each code
  request and verification outcome (number, channel, time, outcome,
  device or visitor key) for a bounded period (default 30 days) and
  without the code; admins MUST be able to see an account's recent sign-in
  events and locks.
- **FR-030**: Sign-in success MUST issue a session with the same security
  properties as feature 001 (secure, same-site, not readable by scripts,
  bounded lifetime), and the member's number MUST be shared with the
  delivery service only for sending the message.

**Language, accessibility, design**

- **FR-031**: Every screen of this feature MUST be available in English and
  Arabic, laid out right-to-left in Arabic, with the number and code fields
  always left-to-right in Western digits (Arabic-Indic digits typed are
  accepted and shown as Western digits); all interface strings MUST live in
  the translation files and all CMS text MUST be localised.
- **FR-032**: Every control MUST have a touch target of at least 44 px, a
  visible focus state and a label; messages MUST be announced to assistive
  technology and never conveyed by colour alone; the received code MUST be
  offered by devices as a one-time-code suggestion and accepted when
  pasted; reduced motion MUST be respected.
- **FR-033**: The screens MUST follow the recorded visual direction ("The
  Brief Bar", the `PhoneOtp` component in the design system handoff and
  screens 9a and 9b of the design canvas), use design tokens with a light
  and a dark theme and no flash of the wrong theme, and meet the
  constitution's performance budgets for auth pages.

**Operations**

- **FR-034**: The owner MUST be able to see delivery failures, the daily
  sending count against the cap, and lock events, and MUST be able to pause
  code sending entirely from settings, in which case visitors see that
  sign-in by code is briefly unavailable and how to reach a person.

### Key Entities

- **Account**: a member, editor or admin; now identified by a verified
  mobile number (unique) with an optional email; a password exists only on
  accounts created before this feature or on editor and admin accounts;
  role (client or professional), name, roles, accepted legal versions.
- **Verified Number**: country code, national number, normalised
  international form, when it was verified and by whom (the member by code,
  or an admin).
- **Code Request**: the number, channel, time sent, lifetime, attempts
  used, state (pending, used, expired, replaced, locked), device or
  visitor key; never the code in readable form.
- **Lock**: a number or device key, reason, when it ends, who cleared it.
- **Sign-In Settings**: code lifetime, attempts per code, lock duration,
  resend wait, codes per number per window, requests per device per window,
  daily cap, dormant-account period, accepted country codes, sending
  paused.
- **Message Template**: per channel and language; brand name, code and
  validity placeholders.
- **Sign-In Event**: request, verification, failure, lock, admin change;
  retained for a bounded period, without codes.
- **Acceptance Record** (feature 005): account, document, version, time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning member on a phone is signed in within 20 seconds
  of tapping "Sign in" using two screens; a new member completes sign-in
  and the first-visit step within 60 seconds using three screens.
- **SC-002**: At least 95% of codes are delivered within 30 seconds on the
  chosen channel, and every delivery failure is visible to the owner.
- **SC-003**: 100% of code requests beyond the per-number, per-device or
  daily limits are refused, and 100% of codes stop working after use,
  expiry, resend, "Change number" or lock.
- **SC-004**: Admins and editors sign in exactly as before: zero change to
  their steps, and no existing member account loses access.
- **SC-005**: No mobile number or code appears in any page address, log or
  public page in the automated checks (zero occurrences).
- **SC-006**: The sign-in screens score ≥ 90 for performance and ≥ 95 for
  accessibility on a mid-range mobile device over simulated 4G, in both
  languages and both themes.
- **SC-007**: Every limit and message template can be changed by an admin
  and takes effect within 60 seconds without a deployment.
- **SC-008**: 100% of acceptance scenarios are covered by automated tests
  named with their scenario ids (`PO-`).

## Assumptions

- The redesign decision of 2026-11-09 stands: mobile number plus code is
  the primary sign-in, email and password are an editor fallback.
- Defaults to confirm with the owner (each is a setting, so a change later
  costs no deployment): code valid 5 minutes; 3 attempts per code; lock 15
  minutes; resend after 60 seconds; 3 codes per number per 15 minutes; 10
  requests per device per hour; 500 codes per day; an account is dormant
  after 12 months without a sign-in; events kept 30 days; all country codes
  accepted; SMS is the default channel.
- Terminology: "client" is feature 001's "seeker"; "professional" is
  feature 001/002's "provider", shown publicly as "creator". The brief
  builder and the booking details step stay account-free; signing in is
  never required to brief or book.
- Choosing WhatsApp as the channel is the person's consent to receive the
  code on WhatsApp; no other messages are sent on that basis. Sender
  identities, message-template approval and any UAE telecom registration
  for SMS or WhatsApp business messaging are handled in planning with the
  provider choice.
- Existing accounts are few (the features that create them are not yet
  merged), so a one-time prompt to verify a number on the next
  email-and-password sign-in is enough; no bulk migration, no merging of
  duplicate accounts, no removal of passwords from editor accounts.
- Email one-time codes, "Continue with Google", passkeys and voice calls
  are out of scope; the roadmap row 007 that listed them is replaced by
  this feature. Automatic outbound notifications beyond the sign-in code
  and the "number changed" notice remain feature 008.
- The choice of the SMS and WhatsApp delivery provider (and its sandbox or
  test mode so tests never send real messages), the cost per message and
  the sender identity are planning decisions, recorded in the plan's
  Complexity Tracking table with the alternatives rejected. A WhatsApp
  business sender is assumed to be obtainable for the business number
  already managed in site settings; if it is not, SMS ships first and
  WhatsApp delivery is enabled by configuration later.
- The professions a professional offers are chosen in the existing
  provider onboarding (feature 002), not at first visit; feature 001 FR-019
  is amended accordingly.
- A device or visitor key for the per-device limit is derived without
  identifying the person and is not shared with third parties.
- The visual direction is inherited from "The Brief Bar" and the design
  system handoff (`specs/design-system/README.md`: the `PhoneOtp` component
  and canvas screens 9a/9b); its surface brief under `.impeccable/surfaces/`
  is written in the plan step.
- Test ids use the prefix `PO-` (`PO-US1-S1`, `PO-FR-009`), following the
  `CP-`, `MP-` and `QM-` convention.
