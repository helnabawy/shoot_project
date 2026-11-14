# Feature Specification: Sign in with a mobile number and a one-time code

**Feature Branch**: `009-otp-sign-in`

**Created**: 2026-11-11

**Status**: Draft

**Input**: User description: "Feature 009 "otp-sign-in" (test-id prefix OT-). Primary sign-in is a UAE
mobile number plus a six-digit one-time code, sent by SMS or WhatsApp, chosen with a segmented
control; one flow serves both login and register; email and password stay only as an editor
fallback. The standalone sign-in (screens 20–22) is reached from the header account icon and is the
only place the role question is asked (screen 23, Join as a creator). The same service serves the
after-brief sign-in (screens 10–11, built in 012). Backend on the web app under the versioned mobile
API: request a code, verify it (returns a token and its expiry), refresh, log out, read the signed-in
member. Pure rules for the code; challenges stored without the number or the code in readable form;
rate limits per number and per address; a pluggable message provider with a development provider
refused in production and one real SMS/WhatsApp vendor chosen in research. The app keeps the session
in the platform's secure store, refreshes it, signs out on rejection, guards account pages, and offers
one-time-code autofill. The website's own sign-in switching to codes is a separate, lower-priority
story. Never log numbers or codes; constant-time comparison; generic errors that do not reveal
whether a number has an account; lockout after too many attempts; creators never see a client's
number. Depends on 007 and 008. Out of scope: Google and Apple sign-in (017), push notifications
(018)."

Test-id prefix for this feature: `OT-` (for example `OT-US1-S4`).

Design source: the canvas boards in `specs/design-system/canvas/` (index `manifest.json`): screens
20 (Sign in · number), 21 (Sign in · code), 22 (Sign in · wrong code) and 23 (Join as a creator) are
built here. Screens 10 and 11 (your number and the code at the end of the brief) are built in feature
012 on the service and building blocks this feature provides. Screen numbers below are canvas
numbers. Board text that names a profession is placeholder content: the app shows the professions
the site currently offers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with my number and a code (Priority: P1)

A person taps the account icon in the app's header. They type their UAE mobile number, choose
whether the code comes by SMS or WhatsApp, and press "Send code" (screen 20). A six-digit code
arrives; the phone offers to fill it in, or they type it (screen 21). If the number is new, the
same step creates their account: they are asked only what they need ("I need a …" or "I'm a …",
with "I need a …" chosen), and nothing else. If the number is known, they go straight in. A wrong
code says so plainly and lets them try again (screen 22); a code that is too old, or that has been
tried too often, asks for a new one; "Send it on WhatsApp" (or by SMS) sends a new code the other
way. There is no password and no email.

**Why this priority**: The owner decided the number is the account (design system "What changed").
Every account feature in the app (012 bookings, 013 client account, 014 creator account) needs a
signed-in member, so nothing after this works without it.

**Independent Test**: In a development build against a development server, sign in with a new number
by SMS, read the code from the development message channel, and land signed in; sign out; sign in
again with the same number by WhatsApp and land in the same account.

**Acceptance Scenarios**:

1. **Given** the sign-in screen, **When** the person enters a valid UAE mobile number, keeps SMS and
   presses "Send code", **Then** a code is sent by SMS, and the code screen shows the number, the
   channel ("Sent by SMS to …"), "Change number", and "Resend code in 1:00" counting down.
2. **Given** a code was sent to a number that has no account, **When** the person enters the
   correct code with "I need a …" chosen and presses "Continue", **Then** an account is created for
   that number as a client, acceptance of the current Terms and Privacy Policy is recorded, and the
   person is signed in and taken to where they were going (or home).
3. **Given** a code was sent to a number that already has an account, **When** the person enters the
   correct code, **Then** they are signed in to that same account straight away: no role question,
   no further step, and nothing about the account changes.
4. **Given** the code screen, **When** the person enters six digits that are not the code, **Then**
   the cells show the error state, "That code isn't right. Check the text we sent and type it
   again." is announced, the primary action reads "Try again" (clearing the cells), and the screen
   matches board 22.
5. **Given** a code has been entered wrongly 5 times, **When** the person tries a sixth time, even
   with the right code, **Then** it is refused, and they are told to ask for a new code.
6. **Given** a code was sent more than 5 minutes ago, **When** the person enters it, **Then** it is
   refused as expired and they are offered a new code.
7. **Given** a code was just sent, **When** less than 60 seconds have passed, **Then** no new code
   can be requested and the countdown shows the wait; **When** the countdown ends and the person
   asks again, **Then** a new code is sent and the previous code stops working.
8. **Given** a code was sent by SMS, **When** the person chooses "send it on WhatsApp" after the
   countdown, **Then** a new code is sent by WhatsApp and the screen says "Sent by WhatsApp to …"
   (and the other way round, the link offers SMS).
9. **Given** the sign-in screen, **When** the person enters a number that is not a UAE mobile number,
   **Then** the field explains the expected format and nothing is sent.
10. **Given** the code screen and a code arriving by SMS, **When** the person focuses the code
    cells, **Then** the phone's keyboard offers to fill in the code, and accepting it fills all six
    cells.

---

### User Story 2 - A code that only the number's owner can use (Priority: P1)

The owner, and every member, can trust that a one-time code signs in only the person who holds the
phone. Nobody can learn from the sign-in screens whether a number has an account; nobody can guess
codes faster than the limits allow; nobody can lock a member out by guessing; a number and a code
never appear in logs or stored data in readable form; editors and admins keep their own sign-in;
and a creator never sees a client's number ("Omar sees your name, never your number", board 10).

**Why this priority**: A sign-in that leaks who is a member, or that can be brute-forced, is a breach
(Principle VII). It ships with the sign-in itself, never after it.

**Independent Test**: Request codes for a number with and without an account and compare the
answers; exceed the per-number limit; inspect the stored challenge and the server log after a
sign-in; try to sign in with a code to an editor's number.

**Acceptance Scenarios**:

1. **Given** one number with an account and one without, **When** a code is requested for each,
   **Then** both answers are identical in status and shape, and neither says whether an account
   exists.
2. **Given** a number that has had 5 codes requested in the last hour, **When** a sixth is
   requested, **Then** it is refused with the time to wait; **And** the same holds for more than 20
   requests from one network address, or 10 from one app install, in an hour.
3. **Given** a code was sent, **When** the stored record of it is read, **Then** it contains neither
   the number nor the code in readable form, only keyed fingerprints, and the check of a typed code
   takes the same time whether the code is right or wrong.
4. **Given** a sign-in by code from request to sign-out, **When** the server's log output is read,
   **Then** it contains no phone number and no code.
5. **Given** the server is configured for production, **When** it is set to use the development
   message channel, **Then** it refuses to start and says why.
6. **Given** an account that has the admin or editor role, **When** someone signs in to its number
   with a correct code, **Then** sign-in is refused and they are pointed to email sign-in.
7. **Given** an account created by code, **When** someone tries to sign in to it with the number and
   any password, **Then** it is refused, and those attempts never stop the owner signing in by code.
8. **Given** a client with a number, **When** any creator-facing or public answer about their
   bookings or briefs is read, **Then** it never includes the client's number; only the member (and
   the site's admins) can read it.
9. **Given** a signed-in member, **When** they try to change the number their account signs in with
   through any profile or account endpoint, **Then** the change is refused.

---

### User Story 3 - Stay signed in, and sign out for real (Priority: P1)

Once signed in, the person stays signed in when they close and reopen the app, without being asked
again while they use it at least once a week. Their session is kept in the phone's secure storage,
never in plain files. When they sign out, the session ends on the server too, so a copied token is
useless. If the server rejects the session, the app signs them out quietly and, on an account page,
takes them to sign in and back. Reinstalling the app starts signed out. Account pages ask the person
to sign in first and bring them back afterwards.

**Why this priority**: Without a lasting, revocable session, every later account feature either asks
for a code on every launch or keeps a session that cannot be ended.

**Independent Test**: Sign in, kill and reopen the app (still signed in); move the clock to two days
before expiry (refreshed); sign out and replay the old token against the server (rejected); reinstall
(signed out); open an account link while signed out (sign-in, then back).

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** the app is closed and reopened, **Then** they are still
   signed in, and the first screen never flashes the signed-out state.
2. **Given** a session with less than 2 days left, **When** the app makes its next request, **Then**
   the session is renewed in the background for another 7 days and the request succeeds.
3. **Given** a signed-in member, **When** they sign out, **Then** the session ends on the server,
   and any request made later with the old token is refused as signed out.
4. **Given** the server refuses the app's session, **When** the app receives that answer, **Then**
   it forgets the session, shows the signed-out state, and, if the person is on an account page,
   opens sign-in with a way back to that page.
5. **Given** the app was deleted and installed again, **When** it starts for the first time, **Then**
   any session left in the phone's secure storage is wiped and the person is signed out.
6. **Given** a signed-out person, **When** they open an account link (`/account/…`), **Then** sign-in
   opens, and after signing in they arrive at that link.
7. **Given** a sign-in link whose "return to" target is another website or a path the app does not
   know, **When** the person signs in, **Then** the target is ignored and they arrive home.
8. **Given** a session issued after a code, **When** it is used with any part of the site that
   recognises signed-in members, **Then** it identifies the member exactly as a session from email
   sign-in does; **and when** the member signs out, **Then** it identifies no one.

---

### User Story 4 - Join as a creator (Priority: P2)

A photographer (or any professional the site offers) joins from the menu's "Join as a creator", or
by choosing "I'm a …" on the code screen. Screen 23 asks which professional they are (from the
professions the site offers, plus "Both" or "All" when there are several), their number, and their
acceptance of the Terms, the Professional Terms and the Privacy Policy. One code later they have a
creator account and go on to build their profile (feature 014). Someone whose number already has
an account is simply signed in.

**Why this priority**: Creators are the supply side, but there are far fewer of them than clients,
and the website still registers creators until User Story 5 ships; the client sign-in comes first.

**Independent Test**: From the menu, join as a creator with a new number, choosing two professions;
confirm a creator account with both professions and three recorded acceptances.

**Acceptance Scenarios**:

1. **Given** screen 23 from the menu, **When** the person chooses a profession, enters a new number,
   accepts the terms and sends the code, **Then** the code screen opens without the role question,
   and the correct code creates a creator account with that profession, records acceptance of the
   current Terms, Professional Terms and Privacy Policy, and signs them in.
2. **Given** the code screen of the standalone sign-in, **When** the person chooses "I'm a …",
   enters the code and presses "Continue", **Then** screen 23 opens with their number filled in and
   the code kept, and completing it creates the creator account without sending another code.
3. **Given** the site offers several professions, **When** screen 23 or the role question is shown,
   **Then** the choices are the active professions in their set order, plus "Both" (two) or "All"
   (three or more), in the person's language; a profession switched off by an editor no longer
   appears.
4. **Given** screen 23, **When** the person sends the code without accepting the terms, **Then**
   nothing is sent and the checkbox explains what is needed.
5. **Given** a number that already has an account, **When** its owner completes Join as a creator,
   **Then** they are signed in to their existing account, which is not changed.
6. **Given** a profession was switched off between choosing it and entering the code, **When** the
   code is verified, **Then** the account is not created, the code is not used up, and the person is
   asked to choose again.

---

### User Story 5 - The website signs in the same way (Priority: P3)

> **Update 2026-11-13** (commit 3ef282c): email sign-in is removed from the website and the app.
> Members sign in only by mobile number and code; editors and admins sign in at `/admin`. A returning
> number goes straight in after the code; only a new number is asked whether they are a client or a
> creator. Text below that mentions `/login/email` or "Sign in with email" is kept for history.

The website's "Log in" becomes the same number-and-code flow, in the site's own design, with the
session kept in the same secure browser cookie as today. "Register" becomes Join as a creator by
code; clients simply sign in. Email and password stay for editors and existing email members on a
separate page ("Editor? Sign in with email"), with today's lockout. Logging out on the website ends
the session on the server. A member who has an email account can add their mobile number to it by
entering a code, after which the number signs in to the same account.

**Why this priority**: The app is the priority surface; the website works today with email and
password, so switching it is valuable but not urgent.

**Independent Test**: On the website, sign in with a number and a code, see the account in the
header, log out and confirm the old session cookie no longer works; sign in by email as an editor;
add a number to an email account and sign in with it.

**Acceptance Scenarios**:

1. **Given** the website's log-in page, **When** a person enters their number, a channel and then
   the correct code, **Then** they are signed in with the site's secure, HTTP-only session cookie
   and the header shows their account.
2. **Given** the email sign-in page, **When** an editor signs in with email and password, **Then**
   it works as before, including the lock after 5 wrong passwords.
3. **Given** a member signed in on the website, **When** they log out, **Then** the session ends on
   the server and the old cookie value no longer signs anyone in.
4. **Given** the website's register page, **When** a visitor opens it, **Then** it offers Join as a
   creator by code, and no page offers creating an account with email and password.
5. **Given** a member signed in with email whose account has no sign-in number, **When** they add
   their number from their account page and enter the correct code, **Then** the number is attached
   to their account, and the next sign-in with that number opens the same account.
6. **Given** a number that already signs in to another account, **When** a member tries to add it to
   theirs, **Then** it is refused after the correct code and nothing changes.

---

### Edge Cases

- A person changes the number on the code screen: the previous code stops working when the new one
  is sent, and the cooldown applies per number, not per device.
- The app is closed between sending and entering the code: on reopening, sign-in starts again at the
  number; the code is not kept anywhere but memory.
- WhatsApp cannot deliver to the number (no WhatsApp account): the answer says the code could not be
  sent and offers SMS; it never says whether the number has an account here.
- The message provider is down: the person is told the code could not be sent and to try again or
  use the other channel; no attempt is counted against the code.
- Two devices verify the same code at the same moment: exactly one succeeds; the other is told the
  code was already used.
- Two first sign-ins for the same new number at the same moment: one account is created, and both
  devices end up in it.
- A member's number was typed in a booking or profile before this feature: it is contact
  information only and never links to, or signs in to, any account (only a code-verified number
  does).
- An existing email member signs in by code in the app with a number never attached to their
  account: a new, separate account is created; joining the two is done on the website (User Story 5,
  scenario 5).
- A returning person never sees the role question: the code screen first verifies the code alone, and
  only a number with no account then shows "I need a …" / "I'm a …" with the code kept (the answer
  depends on the account only after the code is proven, FR-031). Choosing "I'm a …" there opens
  screen 23 as before.
- An account created by code has no name yet: the app and the website show "Your account" until the
  person gives one (name is asked after the brief in 012 and in Finish your account in 013).
- The device clock is wrong: the countdown runs from the server's "resend at" and "expires at"
  answer, relative to the moment it arrived, not from device time.
- No network at launch with a stored session: the person is shown as signed in from the stored
  session; account data loads when the network returns.
- Arabic: numbers stay left to right inside Arabic text, the code cells fill left to right, and the
  countdown uses the locale's digits.
- Largest text size: the code cells keep six on one row and grow taller; nothing is cut off.

## Requirements *(mandatory)*

### Functional Requirements

**The code**

- **FR-001**: The system MUST accept only UAE mobile numbers (country code +971, a mobile range
  starting with 5, nine digits after the country code), normalised to one international form
  whatever spacing or prefix (`0`, `00971`, `+971`) the person types.
- **FR-002**: A code MUST be six digits, generated unpredictably, valid for 5 minutes, usable once,
  and refused after 5 wrong attempts; a refused code can never be used again.
- **FR-003**: Requesting a new code for a number MUST make every earlier code for that number
  unusable; a new code MUST NOT be sent within 60 seconds of the previous one for the same number.
- **FR-004**: The person MUST be able to choose SMS or WhatsApp for each code, SMS chosen first, and
  switch channel when asking again.
- **FR-005**: The system MUST store a code only as a keyed fingerprint (never the code), identify the
  number only by a keyed fingerprint in the code record, and compare a typed code in constant time.

**Accounts**

- **FR-010**: A correct code MUST sign the person in to the account that signs in with that number,
  or create one if none exists; one flow serves both.
- **FR-011**: A new account MUST be a client account unless the person chose to join as a creator;
  a creator account MUST name one to four active professions, and creating it MUST record acceptance
  of the current Terms, Professional Terms and Privacy Policy; a client account MUST record the
  Terms and Privacy Policy (accepted by continuing, as screen 20 states).
- **FR-012**: Choices made for a new account (role, professions, name) MUST be ignored when the
  number already has an account; that account is never changed by signing in. On the standalone
  sign-in (app and website) the role question MUST be shown only after a correct code proved that the
  number has no account; a number with an account MUST be signed in directly after its code
  (`askIfNew` on verify answers `409 auth.errors.signupRequired` and keeps the challenge live, without
  counting the attempt).
- **FR-013**: Only a number proven with a code MAY sign in to an account; numbers typed elsewhere
  (bookings, profiles) MUST never be used to find or join accounts.
- **FR-014**: A name MUST be optional for accounts created by code; when given (first time only) it
  is saved with the new account.
- **FR-015**: Accounts with the admin or editor role MUST NOT sign in by code; email and password
  remain their way in, with today's lock after 5 failed attempts.
- **FR-016**: Accounts created by code MUST NOT be reachable by password sign-in, and failed password
  attempts MUST never block sign-in by code.
- **FR-017**: The number an account signs in with MUST be set only by a verified code, never edited
  through a profile, account or admin form.

**Sessions**

- **FR-020**: A correct code MUST give the device a session that lasts 7 days, plus the time it ends.
- **FR-021**: A live session MUST be renewable for another 7 days; the app MUST renew it when less
  than 2 days remain.
- **FR-022**: Signing out MUST end the session on the server so the old token no longer works.
- **FR-023**: The app MUST keep the session only in the platform's secure storage, MUST wipe that
  storage on the first launch after installation, and MUST forget the session when the server
  refuses it.
- **FR-024**: Sessions issued after a code MUST be recognised everywhere the site recognises a
  signed-in member, exactly like sessions from email sign-in.
- **FR-025**: The signed-in member MUST be able to read their own account (name, number, account
  type, professions, language); nobody else but the site's admins may read a member's number.

**Protection**

- **FR-030**: Requests for a code MUST be limited to 5 per number, 20 per network address and 10 per
  app install per hour; code checks to 30 per network address per hour; a refusal MUST say how long
  to wait.
- **FR-031**: Every answer to a code request MUST be the same whether or not the number has an
  account; error answers MUST use generic codes that never reveal whether an account exists.
- **FR-032**: Phone numbers and codes MUST never be written to logs, error reports or analytics, on
  the server or in the app.
- **FR-033**: Creator-facing and public answers MUST never include a client's number.
- **FR-034**: Expired and used code records MUST be deleted within 24 hours.

**Messages**

- **FR-040**: Codes MUST be sent through a replaceable message provider; a development provider that
  delivers to a local file MUST be available for development and automated tests, and MUST be
  refused when the server is configured for production.
- **FR-041**: One real SMS and WhatsApp provider serving the UAE MUST be integrated (registered
  sender name for SMS, an approved WhatsApp authentication template), chosen in research and
  approved by the owner.
- **FR-042**: The SMS MUST be written in the person's language and formatted so the phone can offer
  the code for autofill to this app and website only.

**App screens**

- **FR-050**: The app MUST build screens 20, 21, 22 and 23 to their boards, in English and Arabic,
  light and dark, from the shared building blocks, and they MUST pass the design-fidelity check.
- **FR-051**: The standalone sign-in MUST be reached from the header account icon; it is the only
  place the role question ("I need a …" / "I'm a …") and Join as a creator are offered.
- **FR-052**: The professions in the role question and in Join as a creator MUST come from the site's
  active professions, never from the app's own text.
- **FR-053**: The code input MUST support one-time-code autofill on iOS and Android.
- **FR-054**: Account pages (`/account/…`) MUST require a session; a signed-out person MUST be sent to
  sign-in and returned to the page afterwards, only for paths inside the app.
- **FR-055**: "Editor? Sign in with email" MUST open the website's email sign-in page.
- **FR-056**: The request, verify and session services MUST be usable by the after-brief sign-in
  (screens 10 and 11, feature 012) without change: optional name on verify, and no role question.

**Website** (User Story 5)

- **FR-060**: The website's log-in MUST use the number-and-code flow and set the existing secure,
  HTTP-only session cookie from the same session.
- **FR-061**: Email and password sign-in MUST stay available on its own page for editors and existing
  email members; creating accounts with email and password MUST stop.
- **FR-062**: Logging out on the website MUST end the session on the server.
- **FR-063**: A member signed in by email MUST be able to attach a number to their account by code,
  unless that number already signs in to another account.

### Key Entities

- **Sign-in number**: a verified UAE mobile number in international form; at most one account signs
  in with it; set only by a correct code.
- **Code challenge**: one code sent to one number by one channel: keyed fingerprints of the number
  and code, channel, attempts, when it was sent, when it expires, when it was used or replaced.
- **Session**: a sign-in on one device: identifier, start, end; ended by sign-out or expiry.
- **Account**: the member; signs in by number, or by email for editors and existing email members;
  has a role (client or creator), professions for creators, an optional name, and legal acceptances.
- **Message provider**: something that delivers a code by SMS or WhatsApp; development or real.
- **Allowance**: a count of requests per number, address or install in the current hour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning member signs in, from tapping the account icon to being signed in, in under
  45 seconds when the code arrives within 10 seconds.
- **SC-002**: 95 % of codes sent through the real provider arrive within 15 seconds, measured from the
  provider's delivery reports during the first month.
- **SC-003**: 0 phone numbers and 0 codes found in server and app logs across the full automated
  suite.
- **SC-004**: Answers to code requests for numbers with and without accounts are identical in 100 %
  of automated comparisons.
- **SC-005**: A guesser limited by the rules can try at most 25 codes per number per hour (a chance
  below 1 in 40,000 of finding a code in an hour).
- **SC-006**: Screens 20–23 pass the design-fidelity check in all four variants, with every key
  element within 1 px.
- **SC-007**: A member who uses the app at least once a week is never asked for a code again.
- **SC-008**: Every acceptance scenario `OT-US1-S1` … `OT-US5-S6` has an automated test named with
  its id.

## Assumptions

- Features 007 (building blocks, routing, fidelity check) and 008 (the versioned mobile API: request
  handling, error format, install id, the site data with active professions) land first.
- Only UAE mobile numbers are accepted for now; other countries are a later change to one rule.
- Sessions last 7 days, the site's current session length, for the app and the website alike.
- The role question defaults to "I need a …", because most people signing in are clients.
- Agreeing to the Terms and Privacy Policy by continuing (screen 20's line) is the acceptance for
  client accounts; creators tick a box (screen 23), as today's website registration requires.
- The development message channel writes codes to a local file read by developers and tests; it is
  a message channel, not a log.
- The real provider's sender name registration and WhatsApp template approval take several weeks;
  the app and website ship behind the development channel in test environments until they are done.
- Linking an email account to a number happens on the website (User Story 5); the app does not merge
  accounts.
- Google and Apple sign-in (017) and push notifications (018) are out of scope.
- This feature supersedes the website's email registration and makes email sign-in a fallback
  (feature 001, FR-019 to FR-022); feature 001's spec is amended when User Story 5 is implemented.
