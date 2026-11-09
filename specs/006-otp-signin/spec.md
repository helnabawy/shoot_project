# Feature Specification: Mobile Number Sign-In with a One-Time Code

**Feature Branch**: `006-otp-signin` (spec directory; work happens on the current worktree branch)

**Created**: 2026-11-09

**Status**: Draft, clarified 2026-11-09 (decisions taken from the owner's redesign decisions of 2026-11-09 and the design handoff in `specs/design-system/README.md`; the choice of a code-delivery provider is deliberately left to planning)

**Amended**: 2026-11-09 (same day) — owner decision: sign-in happens at the **end of the brief flow**, never as a gate before it (User Story 1); the standalone sign-in stays for the header's account icon and for professionals and is the only place the role question is asked (User Stories 4 and 5); the first-visit experience (splash and three learning steps, User Story 6) and the one-time "Finish your account" checklist (User Story 7) are in scope.

**Input**: User description: "Mobile-number + one-time-code sign-in: a UAE mobile number (+971 default, other country codes reachable) plus a 6-digit one-time code delivered by SMS or WhatsApp (channel chosen by the user) becomes the primary way to log in and register, as one flow; the system decides login vs. register from the number. First visit asks role ("I need a professional" / "I'm a professional") and name; returning members skip it. Code expiry, resend countdown, wrong/expired/too-many-attempts handling and rate limits. Email/password remains only as an editor fallback behind a quiet footer link. Both languages (phone and code fields stay LTR with Western digits), accessibility (one-time-code autofill, 44px targets, no colour-only state), privacy (number never in a URL, never shown publicly), migration of existing email/password accounts. OTP provider choice is a planning item, not decided here." Second message, same day: "Sign-in happens at the END of the brief flow, never as a gate before it. 1 brief → 2 choose a creator → 3 details (no phone field any more) → 3b mobile number (booking summary above the field, SMS or WhatsApp) → 3c six-digit code, plus a first-name field on a first visit only → the code signs the person in, saves the booking to the account and opens WhatsApp with the brief prefilled. Returning numbers skip the name. The standalone sign-in stays and is the only place the role question is asked; inside the brief flow the role is inferred as client. No login wall on the landing page, directory or profiles; the number is never asked twice. Also in scope: a splash, three skippable learning steps shown once per device (CMS content), and a one-time 'finish your account' checklist after the first booking (number ✓, name ✓, optional email for quotes/receipts, language and theme) where nothing beyond number and name is mandatory."

**Supersedes / amends**: for members, the email-and-password account requirements of feature 001 (FR-019 to FR-023 of `specs/001-landing-auth-cms/spec.md`, US4); those requirements continue to apply to the editor fallback (User Story 8). Feature 003 User Story 2 ("Leave details and receive a quotation"): step 3 no longer asks for a name or a WhatsApp number; the number is verified in step 3b and the name asked once in step 3c, and the quotation and booking are saved to the account that the verified number identifies (the private link of feature 003 keeps working for sharing). The roadmap row "007 Phone / email one-time-code and Google sign-in" is replaced by this feature; email one-time codes and "Continue with Google" are not in scope.

## Clarifications

### Session 2026-11-09

Answers come from the owner's decisions of 2026-11-09 (recorded in the design handoff) unless marked *default*, in which case the answer is a reasonable default chosen for this spec and listed again under Assumptions for the owner to confirm or change.

- Q: Is this one flow or two (log in / register)? → A: One flow. The person enters a mobile number and receives a code; after the code is verified the system either signs them into the account that owns that number or, if no account owns it, asks for a name (and, outside the brief flow, the role) once and creates the account. The words "register" and "log in" never appear as separate choices.
- Q: Where does sign-in happen for a client? → A: At the end of the brief flow, never before it: brief → choose a creator → details → your number (3b) → the code (3c) → WhatsApp opens and the booking is saved to the account. There is no login wall on the landing page, the directory, profiles or the brief. The standalone sign-in remains for the header's account icon (returning clients checking a booking) and for professionals.
- Q: Where is the role asked? → A: Only in the standalone sign-in, which has no brief to infer it from. Inside the brief flow the role is inferred as client, and a first visit asks only for a name.
- Q: Do briefs and bookings require an account? → A: The brief, the creator choice and the details step need no account and ask for nothing personal. Saving a booking requires verifying the mobile number (which feature 003 already asked for, unverified); that verification *is* the sign-in, so the booking is saved to an account without a separate registration. The number is never asked twice: a signed-in member goes from details straight to the booking being saved.
- Q: What is the first-visit experience? → A: A splash on the very first paint of a device (never shown twice), then three skippable learning steps built from the site's own components (say it in one line; see the price and who's free; your number is your account), shown once per device, reachable again from the footer, then the landing page with the Brief Bar. Copy is content-managed per language.
- Q: What is asked after the first booking? → A: A one-time "Finish your account" checklist on the account page: mobile verified ✓, name ✓, email for quotes and receipts, language and theme, with a progress indicator, one primary action for the next missing item and "Later"; nothing beyond the number and the name is mandatory.
- Q: What happens to email and password? → A: They remain only as a fallback behind a quiet "Editor sign-in" link in the footer, for admins and editors and for existing member accounts that still have a password. No password is ever asked for or created in the mobile flows; accounts created by mobile number have no password.
- Q: What becomes of existing member accounts (email + password, optional unverified phone)? → A (*default*): They keep working through the fallback link. On their first fallback sign-in after this feature ships, a member is asked once to add and verify a mobile number (a number already on file is offered pre-filled but is still verified by code). Once verified, the number is how that member signs in. A number stored before this feature is never treated as verified and never grants access on its own: a mobile sign-in with such a number creates a new account. Admins can set or correct an account's verified number in the content area; merging two accounts is out of scope.
- Q: Which numbers are accepted? → A: United Arab Emirates is the default country code (+971) and UAE mobile numbers are the primary case; other country codes are reachable from a list (UAE first) and are accepted by default. An admin can restrict the accepted country codes in settings (*default*).
- Q: Who chooses the delivery channel? → A: The person does, on the number screen: SMS is the default and "Prefer WhatsApp?" switches to WhatsApp. The device remembers the last choice (*default*).
- Q: What are the code rules? → A (*default*, informed by the design handoff's messages "2 tries left", "Try again in 15 minutes", a countdown shown as "0:42"): six Western digits; valid for 5 minutes; single use; at most 3 attempts per code, after which the number is locked for 15 minutes; resend possible after 60 seconds; at most 3 codes per number in any 15 minutes and 10 code requests per device in any hour; all of these are settings an admin can change without a deployment.
- Q: Does a professional choose their profession(s) in the sign-in flow? → A (*default*): No. The first-visit step asks only role and name (one primary action per screen); a professional chooses professions in the existing provider onboarding (feature 002) that they land on next. This amends feature 001 FR-019, which asked for the profession at registration.
- Q: Which provider delivers the SMS and WhatsApp messages? → A: Not decided in this spec. It is a planning decision, to be recorded in the plan's Complexity Tracking table with the alternatives rejected, as the constitution requires for any new service.
- Q: What is the daily sending cap at launch? → A (*default*, clarify pass): 500 codes per day across all channels, changeable in settings; when reached, code sign-in pauses until the next day and the owner is told; the brief still hands off to WhatsApp without saving the booking to an account.
- Q: What happens when a mobile number is recycled by the operator and its new holder signs in? → A (*default*, clarify pass): if the account owning the number has not signed in for 12 months, the code screen is followed by "Is this you, {first name}?"; "No" detaches the number from the old account (kept for admin review) and continues as a first visit; "Yes" signs in as before. Accounts used within 12 months are opened directly.
- Q: Which words name the two roles? → A: "client" (feature 001's "seeker") and "professional" (feature 001/002's "provider", shown publicly as "creator"); the row labels themselves come from the active audience list.
- Q: What happens if "Send code" is tapped twice while a send is in progress? → A (*default*, clarify pass): the action shows a pending state and a second tap sends nothing; one code request is counted.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in at the end of the brief and save the booking (Priority: P1)

A client writes the brief, picks a creator and fills in the details (date,
start, duration, venue, notes) without being asked anything personal.
Then, with the booking summary (the sentence, the creator, the price)
shown above it, they enter their mobile number, receive a six-digit code
by SMS or WhatsApp, type or autofill it and, on a first visit only, say
what to call them. The code signs them in, the booking is saved to their
account, and the one action left is "Open WhatsApp" with the brief
prefilled. A returning number is recognised, the name is skipped and the
booking is simply attached. A member who is already signed in is never
asked for the number again.

**Why this priority**: This is the owner's decision on where sign-in
lives and the main path by which a client becomes a member. It replaces
the unverified "name and WhatsApp number" step of feature 003 and gives
the client a reason to have an account: their booking is kept.

**Independent Test**: With code delivery in a test mode that exposes the
code, complete a brief on a phone as a new visitor (brief → creator →
details → number → code → name → "Open WhatsApp"): a client account
exists, the booking and quotation are in it, WhatsApp opens with the brief
prefilled. Repeat with the same number: no name asked, the second booking
is attached. Repeat signed in: no number or code asked at all.

**Acceptance Scenarios**:

1. **Given** the details step (3) of the brief flow, **When** it shows,
   **Then** it asks only for date, start, duration, venue and notes, its
   primary action is "Continue" with the price, and no field asks for a
   name, phone number or email.
2. **Given** a visitor who is not signed in taps "Continue" on the details
   step, **When** step 3b shows, **Then** the booking summary (sentence,
   creator, price) is shown above the number field, the line under the
   field says what the number is for (the code signs them in, saves this
   booking to their account and opens the chat), SMS is preselected with
   "Prefer WhatsApp?" available, and the primary action is "Send code".
3. **Given** a valid number and "Send code", **When** step 3c shows,
   **Then** it shows the number with "Change number", the code field with
   focus, the channel used and the resend countdown; **When** the number is
   new to the site, **Then** a name field ("What should {creator's first
   name} call you?") and the acceptance statement linking the Terms and
   Privacy Policy are shown as well; **When** the number belongs to an
   account, **Then** neither is shown.
4. **Given** a correct code (and, on a first visit, a name), **When**
   submitted, **Then** a client account is created or the existing one
   opened, the booking and its quotation are saved to that account, a
   success message says the booking is saved, and the only action shown is
   "Open WhatsApp"; the role is never asked.
5. **Given** "Open WhatsApp", **When** tapped, **Then** the business
   WhatsApp chat opens with the brief and the booking reference prefilled,
   exactly as feature 001 and 003 describe, and the person remains signed
   in on the site.
6. **Given** a signed-in member taps "Continue" on the details step,
   **When** the next screen shows, **Then** it is the saved-booking
   confirmation with "Open WhatsApp": no number and no code are asked.
7. **Given** a signed-in professional makes a booking as a client, **When**
   it is saved, **Then** it is attached to their account as a booking in
   which they are the client; their role is unchanged.
8. **Given** a visitor leaves at step 3b or 3c, **When** they return to the
   brief flow on the same device within the quotation's validity, **Then**
   they resume at 3b with the brief, creator and details kept; nothing was
   saved to any account in between.
9. **Given** code sending is paused or the daily cap is reached, **When**
   the visitor is on step 3b, **Then** they are told that saving to an
   account is briefly unavailable and can still open WhatsApp with the
   brief prefilled; the brief is recorded as a lead as feature 001
   describes, without an account.
10. **Given** the landing page, the creator directory, a creator profile,
    a specialty page or any guide, **When** a visitor who is not signed in
    opens it, **Then** nothing asks them to sign in; sign-in is offered only
    through the header's account icon or at step 3b.
11. **Given** the Arabic site, **When** steps 3b and 3c are used, **Then**
    every label and message is Arabic and right-to-left while the number
    and code fields read left-to-right in Western digits; nothing overflows
    at 360 px.
12. **Given** the quotation page of the saved booking, **When** the member
    opens it later from their account, **Then** it is the same quotation
    (reference, price, validity) that feature 003 describes, and its
    private link still opens it.

---

### User Story 2 - Codes that expire, can be resent and resist guessing (Priority: P1)

Codes are short-lived and single use; a wrong code says how many tries
remain; an expired code is replaced; a member who forgot to look at their
phone can ask for the code again after a short wait; a number or a device
that asks for too many codes, or guesses too often, is told to wait, with
the time stated plainly. The same rules apply at step 3c of the brief flow
and on the standalone sign-in.

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
   correct code nor a new code request is accepted for that number; in the
   brief flow the booking stays unsaved and the visitor can still open
   WhatsApp with the brief prefilled.
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
   device per window, daily sending cap, dormant-account period) in the
   content area, **When** the next code is requested, **Then** the new
   values apply with no deployment.
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

1. **Given** the number screen (step 3b or the standalone sign-in), **When**
   it opens, **Then** SMS is the selected channel and a quiet "Prefer
   WhatsApp?" action is shown; **When** tapped, **Then** the line reads
   "We'll send a 6-digit code on WhatsApp. Prefer SMS?" and the code is sent
   on WhatsApp.
2. **Given** a code sent on one channel, **When** the code screen shows,
   **Then** it says "Sent by SMS" or "Sent on WhatsApp" and the resend uses
   the same channel unless the visitor changes it.
3. **Given** the delivery service reports that the message could not be
   delivered on the chosen channel, **When** the visitor is on the code
   screen, **Then** they see that the code could not be sent and are offered
   the other channel; the failed send counts towards the sending limits.
4. **Given** the visitor chose WhatsApp last time on this device, **When**
   they open a number screen again, **Then** WhatsApp is preselected.
5. **Given** the message templates in the content area, **When** a code is
   sent, **Then** the message is in the visitor's language, contains the
   brand name, the code and how long it is valid, contains no link that
   signs the person in, and an editor can change the wording without a
   deployment.

---

### User Story 4 - Standalone sign-in from the header (Priority: P1)

A returning client who wants to check a booking, or a professional, taps
the account icon in the header, types their mobile number (+971 preset),
taps "Send code", enters the code and is signed in. If the number is new
to the site they answer two questions once (who they are and their name,
User Story 5). Nobody is asked whether they already have an account, and
nobody is asked for a password.

**Why this priority**: Professionals and returning members have no brief
to sign in through; without this story they cannot reach their account,
bookings, availability or profile editor.

**Independent Test**: With code delivery in a test mode that exposes the
code, sign in from the header with a new UAE number (code → role → name →
account page), sign out, sign in again with the same number (code →
account page), and repeat on the Arabic site at 360 px in dark theme.

**Acceptance Scenarios**:

1. **Given** a visitor on the standalone sign-in screen, **When** they
   enter a valid UAE mobile number and tap "Send code", **Then** a code is
   sent by the chosen channel and the next screen shows the number they
   entered with a "Change number" action, a six-digit code field with
   focus, the channel used and a resend countdown; the number is not part
   of the page address.
2. **Given** the code screen for a number that no account owns, **When** the
   visitor enters the correct code, **Then** they see the first-visit
   step (User Story 5) and, after completing it, are signed in and land on
   their account page (a professional lands on the provider onboarding).
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
7. **Given** the header's account icon, the account menu and the old
   registration and login addresses, **When** any of them is used, **Then**
   they all lead to the standalone sign-in; no screen in the flow contains
   a password field.
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
    visitor uses the flow (here or at steps 3b and 3c), **Then** it still
    completes with a plain field for the number and a plain field for the
    code.

---

### User Story 5 - First visit: your name, and who you are (Priority: P1)

The first time a number is verified, the person says what to call them
and accepts the Terms and Privacy Policy. On the standalone sign-in only,
they also choose "I need a photographer or videographer" or "I'm a
photographer or videographer" (labels built from the active audience list
in the content area; a professional also accepts the Professional Terms).
In the brief flow the role is inferred as client and only the name is
asked. Returning numbers never see this step.

**Why this priority**: Without it, a new number cannot become an account,
so Stories 1 and 4 only serve existing members.

**Independent Test**: Verify a new number from the header, choose the
client row, enter a name, tap Done: an account exists with that role, name
and recorded acceptances; repeat with the professional row and confirm the
next screen is the provider onboarding; verify a new number at step 3c of
the brief flow: only the name is asked and the account is a client; rename
an audience in the content area and confirm the row label changes.

**Acceptance Scenarios**:

1. **Given** a newly verified number on the standalone sign-in, **When**
   the first-visit screen shows, **Then** it offers exactly two rows whose
   labels are composed from the active audiences, a name field, an
   acceptance statement linking the current Terms and Privacy Policy, and a
   "Done" action; no email or password is asked for.
2. **Given** the client row and a valid name (2–80 characters), **When**
   "Done" is tapped, **Then** an account is created with the verified
   number, the client role and the name, the accepted document versions
   and time are recorded, and the member lands on their account page.
3. **Given** the professional row, **When** "Done" is tapped, **Then** the
   acceptance also covers the Professional Terms, the account is created
   as a professional, and the member lands on the provider onboarding
   where they choose their professions; the account exists even if they
   leave before finishing onboarding.
4. **Given** a newly verified number at step 3c of the brief flow, **When**
   the code and name are submitted, **Then** the account is created as a
   client with the name and the recorded acceptances, and no role question
   is shown.
5. **Given** the active audience list is renamed or extended in the content
   area (for example "teacher" added), **When** the first-visit screen
   shows, **Then** the row labels reflect it with no code change.
6. **Given** an empty or too-short name, **When** submitted, **Then** the
   field shows a plain-language message and nothing is created.
7. **Given** a visitor closes the first-visit screen without completing it,
   **When** they return later and verify the same number again, **Then**
   they see the first-visit step again and no account was created in
   between.
8. **Given** an account exists for the number, **When** its owner signs in
   anywhere, **Then** the first-visit step is never shown, and the role
   cannot be changed by re-entering either flow.
9. **Given** any input in either flow, **When** an account is created,
   **Then** it is an ordinary member account; no step can grant editor or
   admin rights.

---

### User Story 6 - The first visit on a device: splash and learning steps (Priority: P2)

The very first time a device opens the site it sees a splash (the
wordmark and the hero line while the site loads, nothing to tap) and then
three short learning steps, each built from the site's own components as
the illustration ("Say it in one line", "See the price and who's free",
"Your number is your account"), each skippable, the last ending in "Start
a brief". A returning device goes straight to the landing page. The steps
can be reopened from the footer ("How it works").

**Why this priority**: It explains the one-sentence brief and the
number-as-account idea before the client meets them, which the owner
chose; but the site is complete and usable without it.

**Independent Test**: Open the site on a fresh device: splash, then step
1 of 3; tap "Next" twice and "Start a brief": the landing page with the
Brief Bar; reload: neither splash nor steps appear; open "How it works"
from the footer: the steps appear again; edit a step's title in the
content area: the change shows within 60 seconds.

**Acceptance Scenarios**:

1. **Given** a device that has never opened the site, **When** the first
   page is requested, **Then** the splash is what is painted first and is
   replaced by the site as soon as it is ready, in under a second on the
   reference device, with nothing to tap; the page still meets the
   performance budgets.
2. **Given** the splash has shown once on a device, **When** the site is
   opened again on that device, **Then** the splash does not show.
3. **Given** a first visit, **When** the splash ends, **Then** the first of
   three learning steps shows: a stage holding a real component as the
   illustration, "1 of 3", a title, one paragraph, progress dots, a primary
   "Next" and a quiet "Skip"; the third step's primary action is "Start a
   brief".
4. **Given** any learning step, **When** "Skip" or the last step's primary
   action is tapped, **Then** the landing page with the Brief Bar shows,
   and the steps do not show again on that device.
5. **Given** the footer, **When** "How it works" is tapped on any device,
   **Then** the three steps are shown again, and leaving them returns to
   where the visitor was.
6. **Given** the steps' titles, paragraphs and order in the content area,
   **When** an editor changes them in either language, **Then** the change
   is live within 60 seconds; the illustrations are the site's own
   components, never pictures, and the brief-bar illustration uses the
   active audience list.
7. **Given** the Arabic site, a 360 px phone, dark theme or reduced motion,
   **When** the splash and steps show, **Then** they are right-to-left,
   nothing overflows, colours follow the theme, and the splash's dots and
   the step transitions do not animate.
8. **Given** a visitor arriving at a deep address (a creator profile, a
   guide, an intent page, a quotation link), **When** it is their first
   visit on that device, **Then** the splash may show but the learning
   steps do not interrupt them; the steps wait for the landing page.

---

### User Story 7 - Finish your account (Priority: P2)

After the first booking, the account page shows "Finish your account"
once: a progress indicator ("2 of 4"), four rows (mobile verified ✓, name
✓, email for quotes and receipts, language and theme) each with a quiet
action, three plain facts about what the account does, one primary action
for the next missing item and "Later". Nothing beyond the number and the
name is required.

**Why this priority**: It completes the account the brief flow created
with the least friction, but every booking already works without it.

**Independent Test**: After a first booking open the account page: the
checklist shows 2 of 4 with "Add email" as the primary action; add an
email: 3 of 4; set language and theme: 4 of 4 and the checklist is gone;
on a second new account tap "Later": the checklist is gone on that device
and the account works unchanged.

**Acceptance Scenarios**:

1. **Given** an account created in the brief flow whose first booking was
   just saved, **When** the member opens their account page, **Then** the
   checklist shows with the number and name ticked, email and
   language-and-theme open, "2 of 4", the facts text from the content area,
   a primary action for the next missing item and a "Later" action.
2. **Given** the checklist, **When** the member adds an email address,
   **Then** it is saved to the account for quotes and receipts, the row
   ticks and the progress reads "3 of 4"; an email already used by another
   account is refused with a plain message that reveals nothing else.
3. **Given** the checklist, **When** the member chooses a language and a
   theme, **Then** the choices are saved to the account and applied on
   every device they sign in on; the row ticks.
4. **Given** all four rows ticked, **When** the account page is opened,
   **Then** the checklist no longer shows anywhere.
5. **Given** "Later", **When** tapped, **Then** the checklist is hidden on
   that device and every account feature works without the missing items;
   it does not block any booking, quotation or sign-in.
6. **Given** the facts and row labels in the content area, **When** an
   editor changes them, **Then** the checklist shows the new text within 60
   seconds in both languages.
7. **Given** an account created from the standalone sign-in, **When** its
   first booking is saved, **Then** the checklist shows then, and not
   before.

---

### User Story 8 - Editors and existing accounts keep a way in (Priority: P2)

Editors and admins sign in with email and password behind a quiet
"Editor sign-in" link in the footer, and the content area's own sign-in is
unchanged. Members who registered with email and password before this
feature keep that way in until they verify a mobile number, which they are
asked to do once; from then on the number signs them in.

**Why this priority**: The owner and editors must never be locked out, and
no existing member may lose access, but both groups are small and the
mobile flows (Stories 1–5) deliver the product value.

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

### User Story 9 - See and change your number, sign out (Priority: P3)

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

### User Story 10 - A client finds the bookings they made before this feature (Priority: P3)

A client who briefed or booked with an unverified WhatsApp number before
this feature shipped (features 001 and 003) and later signs in with that
same number sees those briefs, quotations and bookings on their account
page.

**Why this priority**: Bookings made after this feature are saved to the
account at step 3c, so this only matters for records made before it; the
private links from feature 003 already give access to them.

**Independent Test**: Record a brief and a booking with a WhatsApp contact
number through the pre-feature flow, sign in by code with that number, open
the account page: both are listed; sign in with a different number: neither
is.

**Acceptance Scenarios**:

1. **Given** briefs, quotations or bookings whose contact number equals a
   member's verified number, **When** the member opens their account page,
   **Then** they are listed there, and their private links keep working.
2. **Given** a professional's account, **When** this matching is applied,
   **Then** it only ever reveals bookings in which that person is the
   client, never other clients' bookings.

---

### Edge Cases

- The number is entered with spaces, dashes, a leading "0" (050 …), a
  leading "00971" or "+971": it is accepted and normalised to one
  international form; two spellings of the same number are the same
  account.
- The visitor switches language or theme mid-flow: the step, the number,
  the booking summary and the countdown are kept.
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
  step (FR-020) separates the two people; the old account loses the
  number but keeps its data for an admin to review.
- The old account's holder returns after their number was detached: they
  reach the business through WhatsApp and an admin sets their new verified
  number (User Story 8, scenario 6).
- The code is verified but the account or booking cannot be saved (a store
  failure): the visitor sees a plain retry message; no half-created account
  or booking remains, and the brief stays on the device.
- The quotation expires while the visitor is at step 3b or 3c: on return
  they are offered a fresh quotation from the same brief (feature 003).
- The chosen creator becomes unavailable between step 3 and the code: the
  booking is saved as feature 003 describes ("let us choose" or an admin
  assigns) and the message says so.
- A member's session expires on a protected page: the next action returns
  them to the sign-in and back afterwards (feature 001 behaviour).
- The delivery service is unreachable: the visitor is told the code could
  not be sent right now and offered the other channel and the WhatsApp
  contact; in the brief flow they can still open WhatsApp with the brief
  prefilled; the failure is recorded for the owner.
- A country code is restricted by an admin after a member registered with
  it: that member can still sign in; new sign-ups with it are refused with
  a plain message.
- An admin disables an audience chosen by existing accounts: those
  accounts are unaffected (feature 001 behaviour); the first-visit row
  labels and the learning-step illustration only list active audiences.
- A professional's account is suspended by an admin: the code still
  verifies but the account page says the account is suspended and how to
  reach a person.
- The device blocks or clears its local memory: the splash and learning
  steps may show again; nothing else depends on device memory.
- Very long names or Arabic names with diacritics: accepted within the
  length limit and shown unchanged.
- Reduced motion is requested: the country list, the box focus, the
  splash's dots, the learning-step transitions and the countdown appear
  without animation.

## Requirements *(mandatory)*

### Functional Requirements

**Where sign-in happens**

- **FR-001**: The system MUST offer one sign-in for all members that starts
  with a mobile number and a delivered six-digit code, and MUST decide from
  the verified number whether to open the existing account or create a new
  one; no screen asks whether the person already has an account or asks for
  a password.
- **FR-002**: Sign-in MUST NOT gate any public surface: the landing page,
  the brief, the creator directory, profiles, specialty pages, guides and
  pages MUST be usable without signing in; sign-in MUST be offered only at
  step 3b of the brief flow and through the header's account icon (and the
  addresses that used to lead to login or registration).
- **FR-003**: The brief flow's details step MUST ask only for the booking
  details (date, start, duration, venue, notes), never for a name, number
  or email; for a visitor who is not signed in it MUST be followed by step
  3b (number, with the booking summary and a plain statement of what the
  number is for) and step 3c (code, plus a name and the legal acceptance on
  a first visit only); for a signed-in member it MUST be followed directly
  by the saved-booking confirmation.
- **FR-004**: Verifying the code in the brief flow MUST, in one step, sign
  the person in, create the account as a client when the number is new
  (never asking the role), save the booking and its quotation to that
  account, and present "Open WhatsApp" as the only action, which opens the
  business chat with the brief and booking reference prefilled.
- **FR-005**: The number MUST never be asked twice: once verified on a
  device's session, every later screen (bookings, quotations, account) MUST
  use it, and a signed-in member MUST never see step 3b or 3c.
- **FR-006**: When codes cannot be sent (paused, cap reached, delivery
  unavailable, number locked), the brief flow MUST still let the visitor
  open WhatsApp with the brief prefilled and MUST record the brief as a lead
  as feature 001 describes, without saving a booking to an account.
- **FR-007**: A brief left at step 3b or 3c MUST be kept on the device and
  resumed at 3b on return while the quotation is valid, and MUST leave no
  account or booking behind until the code is verified.

**The number screen**

- **FR-008**: The number screen MUST preset the UAE country code (+971),
  MUST make every other country code reachable from a list ordered with
  the UAE first and searchable by country name, MUST accept local and
  international spellings of the same number and store one normalised
  international form, and MUST refuse numbers that are not valid mobile
  numbers for the chosen country before anything is sent.
- **FR-009**: Admins MUST be able to restrict the accepted country codes in
  settings without a deployment; the default accepts all.
- **FR-010**: Every entry point that previously led to login or
  registration (header account icon, account menu, protected-page
  redirects, old addresses) MUST lead to the standalone sign-in, and a
  successful sign-in MUST return the member to the page they were trying
  to reach, or to their account page.
- **FR-011**: Both sign-in places MUST work without scripting as a sequence
  of plain forms, and with scripting MUST enhance the code entry into six
  boxes driven by one real field so paste and device autofill work.

**Codes and limits**

- **FR-012**: Codes MUST be six Western digits, generated unpredictably,
  valid for a configurable lifetime (default 5 minutes), single use, and
  invalidated by a resend, by "Change number" and by a lock.
- **FR-013**: The system MUST allow a configurable number of attempts per
  code (default 3), tell the person how many tries remain after each wrong
  attempt, and after the last wrong attempt lock the number for a
  configurable time (default 15 minutes) during which neither code
  verification nor code requests are accepted for it.
- **FR-014**: Resending MUST be possible only after a configurable wait
  shown as a countdown (default 60 seconds); submitting an expired code
  MUST explain that it expired and send a new one when the sending limits
  allow, otherwise say how long to wait.
- **FR-015**: The system MUST limit code requests per number in a window
  (default 3 per 15 minutes), per device or visitor in a window (default 10
  per hour, across all numbers) and in total per day (default 500),
  refusing further requests with the waiting time; refusals MUST not
  reveal whether a number has an account; a request already in progress
  MUST NOT be repeated by a second tap.
- **FR-016**: All limits in FR-012 to FR-015 and the dormant-account period
  of FR-020 MUST be settings in the content area with the defaults above,
  applied to the next request without a deployment; admins MUST be able to
  clear a lock early, and such changes MUST be recorded with who made them
  and when.

**Delivery**

- **FR-017**: The person MUST be able to choose SMS (default) or WhatsApp
  for each code request before it is sent; the code screen MUST name the
  channel used; the device MUST remember the last chosen channel.
- **FR-018**: When delivery on the chosen channel fails or the delivery
  service is unavailable, the person MUST be told and offered the other
  channel and the business WhatsApp contact; failed sends count towards
  the sending limits.
- **FR-019**: The text of the SMS and WhatsApp messages MUST be managed in
  the content area per language, MUST include the brand name, the code and
  its validity, and MUST NOT include a link that signs the person in.
  Delivery MUST go through one replaceable delivery capability so that the
  provider can change without changing the flows; the choice of provider
  and its test mode are planning decisions recorded with a Complexity
  Tracking justification.

**First visit of a number and accounts**

- **FR-020**: When the account owning a verified number has not signed in
  for a configurable period (default 12 months), a code sign-in with that
  number MUST first ask "Is this you, {first name}?" showing nothing else
  about the account; "No" MUST detach the number from that account (kept
  for admin review, with the event recorded) and continue as a first visit;
  "Yes" MUST sign in as usual.
- **FR-021**: The first time a number is verified, and only then, the
  system MUST ask for a name of 2–80 characters and acceptance of the
  applicable legal documents (feature 005: Terms and Privacy Policy, plus
  Professional Terms for a professional), recording the accepted versions
  and time; it MUST NOT ask for an email or a password. The role (client or
  professional, with labels composed from the active audience list in the
  content area) MUST be asked only on the standalone sign-in; the brief flow
  MUST infer client.
- **FR-022**: An account MUST be created only when the first-visit step is
  completed; a verified number without a completed step MUST leave no
  account behind.
- **FR-023**: A professional MUST be taken to the provider onboarding
  (feature 002) after the first-visit step, where professions are chosen;
  the professions requirement of feature 001 FR-019 moves there.
- **FR-024**: A verified mobile number MUST belong to at most one account;
  the role chosen at first visit MUST NOT be changeable by re-entering
  either flow; no step of either flow MUST be able to grant editor or admin
  rights.
- **FR-025**: Members MUST be able to see their verified number on their
  account page, change it by verifying a new number (refused when that
  number is verified on another account, with a notice sent to the old
  number), and sign out; sessions MUST remain bounded as in feature 001.

**First visit of a device**

- **FR-026**: On a device's first visit the system MUST paint a splash
  (wordmark, hero line, a quiet loading indicator, nothing to tap) that is
  replaced by the site as soon as it is ready, in under one second on the
  reference device, and MUST never show it again on that device; the splash
  MUST NOT cause the landing page to miss its performance budgets.
- **FR-027**: After the splash, and only on the way to the landing page,
  the system MUST show three learning steps in order, each with a real
  component as its illustration, a position ("1 of 3"), a title, one
  paragraph, progress dots, a primary "Next" (the last: "Start a brief")
  and a quiet "Skip"; skipping or finishing MUST lead to the landing page
  and MUST prevent the steps from showing again on that device.
- **FR-028**: The learning steps' titles, paragraphs and order MUST be
  content managed per language; the illustrations MUST be the site's own
  components built from live content (the active audience list, a creator
  row, the number and code fields), never pictures; the steps MUST be
  reachable again from a footer link ("How it works").
- **FR-029**: Neither the splash nor the learning steps MUST interrupt a
  visitor arriving at a deep address, and neither MUST ever block a
  booking, a quotation link or sign-in.

**Finish your account**

- **FR-030**: After an account's first booking is saved, the account page
  MUST show once a "Finish your account" checklist with a progress
  indicator and four rows (mobile verified, name, email for quotes and
  receipts, language and theme), the completed rows ticked, one primary
  action for the next missing item, a "Later" action and three
  content-managed facts about what the account does.
- **FR-031**: Members MUST be able to add an optional email (unique across
  accounts, refused otherwise with a plain message) and to save a language
  and a theme that apply on every device they sign in on; neither MUST be
  required for any booking, quotation or sign-in.
- **FR-032**: The checklist MUST disappear everywhere once all rows are
  complete and MUST be hidden on a device once "Later" is chosen; its text
  MUST be editable in the content area per language.

**Fallback and existing accounts**

- **FR-033**: Email-and-password sign-in MUST remain available only behind a
  visually quiet "Editor sign-in" footer link and in the content area's own
  sign-in; it MUST keep feature 001's lockout and non-disclosure behaviour.
- **FR-034**: Admins and editors MUST keep their email-and-password access
  unchanged and MAY additionally verify a mobile number.
- **FR-035**: A member account that has a password and no verified number
  MUST be asked once, on its next email-and-password sign-in, to add and
  verify a mobile number (pre-filled from a stored number, still verified by
  code); it MUST NOT be blocked for declining; once verified, the number
  MUST sign that member in and the password MUST no longer be required.
- **FR-036**: A number stored on an account before this feature MUST be
  treated as unverified: it MUST NOT be used to open that account by code,
  and a code sign-in with such a number MUST create a separate account.
- **FR-037**: Admins MUST be able to set, correct or clear an account's
  verified number in the content area; such changes MUST be recorded with
  who made them and when and MUST be refused when the number is verified
  on another account. Merging accounts is out of scope.
- **FR-038**: Briefs, quotations and bookings recorded before this feature
  whose contact number equals a member's verified number MUST be listed on
  the member's account page; the listing MUST only ever show records in
  which the member is the client.

**Privacy and security**

- **FR-039**: Mobile numbers and codes MUST never appear in a page address,
  query string, browser history entry, log line or error report, and a
  member's number MUST never be shown on any public page or to any other
  member.
- **FR-040**: Codes MUST be stored only in a form that cannot be read back,
  MUST never be logged or returned by any interface outside the delivery
  message, and MUST be discarded when used, expired or invalidated.
- **FR-041**: The system MUST keep, for the owner, a record of each code
  request and verification outcome (number, channel, time, outcome,
  device or visitor key) for a bounded period (default 30 days) and
  without the code; admins MUST be able to see an account's recent sign-in
  events and locks.
- **FR-042**: Sign-in success MUST issue a session with the same security
  properties as feature 001 (secure, same-site, not readable by scripts,
  bounded lifetime), and the member's number MUST be shared with the
  delivery service only for sending the message.
- **FR-043**: Device memory used for the splash, the learning steps, the
  checklist dismissal and the preferred channel MUST hold no personal data
  and MUST be dispensable: losing it changes nothing but what is shown
  once.

**Language, accessibility, design**

- **FR-044**: Every screen of this feature MUST be available in English and
  Arabic, laid out right-to-left in Arabic, with the number and code fields
  always left-to-right in Western digits (Arabic-Indic digits typed are
  accepted and shown as Western digits); all interface strings MUST live in
  the translation files and all CMS text MUST be localised.
- **FR-045**: Every control MUST have a touch target of at least 44 px, a
  visible focus state and a label; messages MUST be announced to assistive
  technology and never conveyed by colour alone; the received code MUST be
  offered by devices as a one-time-code suggestion and accepted when
  pasted; reduced motion MUST be respected on the splash, the steps, the
  country list, the boxes and the countdown.
- **FR-046**: The screens MUST follow the recorded visual direction ("The
  Brief Bar", the `PhoneOtp` component and the section "First visit and
  where sign-in happens" of the design system handoff, and canvas screens
  0, 0a–0c, 3b, 3c, 7b, 9a and 9b), use design tokens with a light and a
  dark theme and no flash of the wrong theme, and meet the constitution's
  performance budgets for the landing and auth pages.

**Operations**

- **FR-047**: The owner MUST be able to see delivery failures, the daily
  sending count against the cap, and lock events, and MUST be able to pause
  code sending entirely from settings, in which case visitors see that
  sign-in by code is briefly unavailable and how to reach a person, and the
  brief still hands off to WhatsApp.

### Key Entities

- **Account**: a member, editor or admin; now identified by a verified
  mobile number (unique) with an optional email (unique); a password exists
  only on accounts created before this feature or on editor and admin
  accounts; role (client or professional), name, roles, preferred language
  and theme, accepted legal versions, checklist completion.
- **Verified Number**: country code, national number, normalised
  international form, when it was verified and by whom (the member by code,
  or an admin).
- **Code Request**: the number, channel, time sent, lifetime, attempts
  used, state (pending, used, expired, replaced, locked), device or
  visitor key, and, in the brief flow, the pending booking it will save;
  never the code in readable form.
- **Lock**: a number or device key, reason, when it ends, who cleared it.
- **Sign-In Settings**: code lifetime, attempts per code, lock duration,
  resend wait, codes per number per window, requests per device per window,
  daily cap, dormant-account period, accepted country codes, sending
  paused.
- **Message Template**: per channel and language; brand name, code and
  validity placeholders.
- **Learning Step**: order, localised title and paragraph, which component
  illustrates it; **First-Visit Content**: splash line, "How it works"
  label.
- **Account Checklist Content**: localised row labels, facts and actions.
- **Sign-In Event**: request, verification, failure, lock, admin change,
  number detached; retained for a bounded period, without codes.
- **Booking / Quotation** (feature 003): now linked to the account the
  verified number identifies, in addition to the private link.
- **Acceptance Record** (feature 005): account, document, version, time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time client on a phone goes from "Continue" on the
  details step to "Open WhatsApp" in two screens and under 45 seconds
  (number, then code and name); a returning number needs the same two
  screens and no name; a signed-in member needs none.
- **SC-002**: A returning member on a phone is signed in from the header in
  under 20 seconds using two screens; a new member completes the standalone
  sign-in and the first-visit step within 60 seconds using three screens.
- **SC-003**: At least 95% of codes are delivered within 30 seconds on the
  chosen channel, and every delivery failure is visible to the owner.
- **SC-004**: 100% of code requests beyond the per-number, per-device or
  daily limits are refused, and 100% of codes stop working after use,
  expiry, resend, "Change number" or lock.
- **SC-005**: Zero public surfaces require sign-in; 100% of bookings saved
  after this feature belong to an account, and the number is asked at most
  once per sign-in in every journey the tests cover.
- **SC-006**: Admins and editors sign in exactly as before: zero change to
  their steps, and no existing member account loses access.
- **SC-007**: No mobile number or code appears in any page address, log or
  public page in the automated checks (zero occurrences).
- **SC-008**: The landing page with the splash and the sign-in screens
  score ≥ 90 for performance and ≥ 95 for accessibility on a mid-range
  mobile device over simulated 4G, in both languages and both themes; the
  splash never shows twice on a device.
- **SC-009**: Every limit, message template, learning step and checklist
  text can be changed by an admin and takes effect within 60 seconds
  without a deployment.
- **SC-010**: 100% of acceptance scenarios are covered by automated tests
  named with their scenario ids (`PO-`).

## Assumptions

- The redesign decisions of 2026-11-09 stand: mobile number plus code is
  the primary sign-in, it happens at the end of the brief flow, email and
  password are an editor fallback.
- The constitution's "the brief needs no account" (Principle IX) is read
  as: nothing personal is asked before the person has a booking worth
  saving. Feature 003 already asked for the WhatsApp number at that point;
  this feature verifies it with one code and makes it the account, so the
  client gains an account without a registration step. The brief is still
  handed to WhatsApp, and recorded as a lead, even when a code cannot be
  sent.
- Defaults to confirm with the owner (each is a setting, so a change later
  costs no deployment): code valid 5 minutes; 3 attempts per code; lock 15
  minutes; resend after 60 seconds; 3 codes per number per 15 minutes; 10
  requests per device per hour; 500 codes per day; an account is dormant
  after 12 months without a sign-in; events kept 30 days; all country codes
  accepted; SMS is the default channel; a brief left at step 3b/3c resumes
  while its quotation is valid; the account checklist is hidden per device
  by "Later" and everywhere once complete.
- Terminology: "client" is feature 001's "seeker"; "professional" is
  feature 001/002's "provider", shown publicly as "creator". The name asked
  at step 3c is the same account name as on the standalone sign-in; the
  prompt may use the chosen creator's first name ("What should Omar call
  you?").
- Existing accounts are few (the features that create them are not yet
  merged), so a one-time prompt to verify a number on the next
  email-and-password sign-in is enough; no bulk migration, no merging of
  duplicate accounts, no removal of passwords from editor accounts.
- Email added from the checklist is stored for quotes and receipts; sending
  them by email is feature 008. Email one-time codes, "Continue with
  Google", passkeys and voice calls are out of scope; the roadmap row 007
  that listed them is replaced by this feature.
- The choice of the SMS and WhatsApp delivery provider (and its sandbox or
  test mode so tests never send real messages), the cost per message and
  the sender identity are planning decisions, recorded in the plan's
  Complexity Tracking table with the alternatives rejected. A WhatsApp
  business sender is assumed to be obtainable for the business number
  already managed in site settings; if it is not, SMS ships first and
  WhatsApp delivery is enabled by configuration later.
- Choosing WhatsApp as the channel is the person's consent to receive the
  code on WhatsApp; no other messages are sent on that basis. Sender
  identities, message-template approval and any UAE telecom registration
  for SMS or WhatsApp business messaging are handled in planning with the
  provider choice.
- The professions a professional offers are chosen in the existing
  provider onboarding (feature 002), not at first visit; feature 001 FR-019
  is amended accordingly.
- A device or visitor key for the per-device limit is derived without
  identifying the person and is not shared with third parties; what a
  device remembers (splash seen, steps seen, checklist dismissed, preferred
  channel, a brief in progress) holds no personal data beyond the brief
  itself.
- The visual direction is inherited from "The Brief Bar" and the design
  system handoff (`specs/design-system/README.md`: the `PhoneOtp` component,
  the section "First visit and where sign-in happens", and canvas screens
  0, 0a–0c, 3b, 3c, 7b, 9a, 9b); its surface briefs under
  `.impeccable/surfaces/` are written in the plan step.
- Test ids use the prefix `PO-` (`PO-US1-S1`, `PO-FR-015`), following the
  `CP-`, `MP-` and `QM-` convention.
