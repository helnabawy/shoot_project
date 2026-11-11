# Feature Specification: Mobile Quick Match and booking

**Feature Branch**: `012-mobile-quick-match`

**Created**: 2026-11-11

**Status**: Draft (spec only; plan and tasks follow when the feature is next)

**Input**: User description: "Feature 012 "mobile-quick-match" (test-id prefix MQ-) for the Flutter app in apps/mobile. Build Quick Match and the booking pages from canvas screens 07 swipe to choose a creator, 08 no one free that day, 09 details, 10 your number after the brief, 11 code then WhatsApp, 12 quotation to accept, 13 booking confirmed and how to pay, 14 delivered and confirm, and 40 quotation expired, at the website's paths (/match/{ref}/{key}, /match/{ref}/{key}/details, /q/{ref}/{key}). Sign-in is no longer a gate: the mobile number and the one-time code (feature 009) are asked at the end of the brief (10, 11), and one tap signs the person in, saves the booking and opens WhatsApp. Business rules mirror the website's Quick Match and booking (003): one fixed price per brief, quotation validity, booking states, payments recorded by an admin, nothing paid in the app. Depends on 009 and 011."

Test-id prefix for this feature: `MQ-` (for example `MQ-US2-S4`).

Design source: the canvas boards for screens 07, 08, 09, 10, 11, 12, 13, 14 and 40 in
`specs/design-system/canvas/` (`manifest.json` maps each number to its board), the designer's
Arabic dark board 43 (a variant of 13), and the canvas notes on the flow change and on screen 07's
carousel. Business rules: `specs/003-quick-match-booking/spec.md`. Screen numbers below are canvas
numbers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose a creator who is free (Priority: P1)

After the brief, the person sees the creators who are free on their date, picked for their brief,
as a carousel of cards (07). Each card shows the creator's work, photo, name, code, emirates,
years, specialties, languages and the one fixed price with what it includes. Swiping changes the
chosen creator; the one primary action below follows it ("Continue with Omar · AED 950"). A link
opens the chosen creator's profile, and "Not sure? Let us pick" continues without choosing. When no
one is free that day (08), the nearest other days with free creators are offered.

**Why this priority**: Seeing real, free people at one price is the moment the brief becomes a
booking; without it the app can only hand the person to WhatsApp.

**Independent Test**: Seed three free creators for a brief's date and one who has blocked it; open
`/match/{ref}/{key}`; see three cards with the same price; swipe and see the primary action follow;
change the date to a day with no one free and see 08 with other days.

**Acceptance Scenarios**:

1. **Given** a recorded brief with a date, **When** step 2 (07) opens, **Then** only listed
   creators of the brief's type who are free that day and match its occasion are shown, each with
   the same fixed price computed for the brief and what it includes, within 2 seconds.
2. **Given** the carousel, **When** the person swipes to another card or taps it, **Then** that card
   becomes the chosen one (outlined, its dot widened), it centres, the position ("2 of 3") is shown
   and announced, and the primary action names that creator and the price.
3. **Given** the chosen creator, **When** the person taps "See {first name}'s work and profile",
   **Then** their profile (16) opens, and going back returns to 07 with the same creator chosen.
4. **Given** 07, **When** the person taps "Not sure? Let us pick", **Then** the flow continues to
   the details step without a creator, and the team assigns one before confirmation (003 US1-S5).
5. **Given** a creator who blocked the date or already has a confirmed booking that day, **When**
   07 opens, **Then** that creator is not shown.
6. **Given** no creator is free on the brief's date, **When** step 2 opens, **Then** 08 shows the
   nearest other days with free creators (nearest first, with how many are free), the first as the
   primary action, and "Ask on WhatsApp" for a person who must keep the date.
7. **Given** 08, **When** the person picks another day, **Then** only the brief's date changes and
   07 opens for that day.
8. **Given** a brief with "any date", **When** step 2 opens, **Then** every matching listed creator
   is shown and the date is asked at the details step.
9. **Given** a brief whose duration or place has no price rule, **When** step 2 opens, **Then** the
   cards show "price on request" and the primary action continues to WhatsApp with the brief
   instead of a quotation.
10. **Given** 07 or 08, **When** the person taps "Edit" in the step line, **Then** the brief opens
    with its answers, and changing them shows step 2 again for the new answers.

---

### User Story 2 - Add details, give the number at the end, open WhatsApp (Priority: P1)

The person adds the shoot's details (09: date, start time, duration, venue, a note for the creator)
and sees the price update when the duration changes. Only then are they asked for their mobile
number (10) and how to receive the code (SMS or WhatsApp). On the code screen (11) they enter the
six-digit code and, the first time only, what the creator should call them. One tap, "Open
WhatsApp", signs them in, saves the booking with its quotation, and opens the WhatsApp chat with the
details already written. A person already signed in skips 10 and 11.

**Why this priority**: This is where the booking is saved and the conversation starts; it carries
the product's flow change (no sign-in gate, the number at the end).

**Independent Test**: From 07 with a chosen creator, fill 09, enter a test number on 10, enter the
test code and a name on 11, tap "Open WhatsApp", and confirm the person is signed in, a quotation
exists for the brief and creator, and WhatsApp was asked to open with the reference and link.

**Acceptance Scenarios**:

1. **Given** the details step (09), **When** it opens, **Then** the date, duration and place carry
   over from the brief, the step line shows the creator and price, and the primary action reads
   "Continue · {price}".
2. **Given** 09, **When** the person changes the duration, **Then** the price is recomputed with the
   price rules and the primary action shows the new price.
3. **Given** 09, **When** the person changes the date to a day the chosen creator is not free,
   **Then** a one-line message says so and offers to choose again for that day (07).
4. **Given** a required detail is missing (start time, venue) or the date is in the past, **When**
   the person taps the primary action, **Then** the field is marked with a one-line message and
   nothing is sent.
5. **Given** a signed-out person, **When** 09 is complete, **Then** 10 opens with a summary of the
   booking, the phone field (country code first), the choice of SMS or WhatsApp, and "Send code".
6. **Given** a valid number, **When** the person taps "Send code", **Then** a code is sent through
   the chosen channel (feature 009) and 11 opens showing where it was sent, "Change number", the
   six code cells and the resend countdown.
7. **Given** a number with no account name, **When** 11 shows, **Then** it asks, optionally, "What
   should {first name} call you?"; **Given** a number whose account has a name, **Then** that field
   is not shown.
8. **Given** a correct code, **When** the person taps "Open WhatsApp", **Then** in one action they
   are signed in (a new account is created for a new number, with the name if one was given), the
   quotation is issued and saved to their account, and WhatsApp opens with the booking details, the
   reference and the private link already written.
9. **Given** a wrong or expired code, **When** the person taps "Open WhatsApp", **Then** the cells
   show the error as on the sign-in screens (feature 009, screen 22), nothing is saved, and the
   person can retry or resend.
10. **Given** a signed-in person, **When** they tap the primary action on 09, **Then** 10 and 11 are
    skipped: the quotation is issued and saved and WhatsApp opens in that one tap.
11. **Given** the person returns to the app from WhatsApp, **When** the app shows again, **Then** it
    shows the quotation (12) for the booking just saved.

---

### User Story 3 - Accept the quotation, or get a fresh one when it expired (Priority: P1)

The quotation (12) shows what was briefed, the reference, issue date and shoot date, each price
line and the total, the professional, and how long it is valid. One primary action, "Accept
quotation", asks the professional to confirm. A quotation past its validity (40) can no longer be
accepted and offers "Get a fresh quotation" from the same brief.

**Why this priority**: Acceptance is the client's commitment; without it no creator is asked and no
booking proceeds.

**Independent Test**: Open a seeded quotation's private link; accept it; see the booking move to
"waiting for the professional"; open an expired quotation and request a fresh one.

**Acceptance Scenarios**:

1. **Given** a quotation within its validity, **When** 12 opens, **Then** it shows the brief line,
   reference, issue date, shoot date and time, every price line, the total with its tax note, the
   professional for each type, the validity date, "Accept quotation" and "Questions? Ask on
   WhatsApp".
2. **Given** 12, **When** the person taps "Accept quotation", **Then** the booking becomes
   "accepted" (waiting for the professional to confirm), both sides get a notification entry, and
   the screen shows that state with what happens next.
3. **Given** the person taps "Accept quotation" twice, **When** both reach the server, **Then** one
   booking exists.
4. **Given** a quotation with a promo discount, **When** 12 opens, **Then** the discount shows as
   its own line and the total includes it.
5. **Given** a quotation past its validity, **When** its link opens, **Then** 40 shows the brief's
   summary and total with "Expired", and accepting is not possible.
6. **Given** 40, **When** the person taps "Get a fresh quotation", **Then** a new matching starts
   from the same brief and 07 opens, with a note that the price and who is free may have changed.
7. **Given** a private link whose key is wrong, or a quotation that belongs to another account,
   **When** it opens, **Then** the not-found screen (37) shows and nothing about the quotation is
   revealed.
8. **Given** a "let us pick" quotation, **When** 12 opens, **Then** the professional section says
   the team is choosing one, and accepting is still possible.

---

### User Story 4 - Follow the booking and arrange payment (Priority: P2)

Once the professional confirms, the same link shows the confirmed booking (13): the status
("Awaiting payment"), the brief line, the reference and the professional, the price lines, and the
booking's progress (brief sent, professional confirmed, payment recorded, shoot day). The one
primary action opens the WhatsApp chat, where payment is agreed and the receipt is sent; the team
records the payment. Every later state shows on the same screen with its own next step.

**Why this priority**: People need to see where their booking stands, but the business can run the
steps after acceptance through WhatsApp and the admin while this lands.

**Independent Test**: Move a seeded booking through confirmed, paid and scheduled in the admin; open
its link after each change and see the status, progress and next step change; confirm nothing on
the screen takes a payment.

**Acceptance Scenarios**:

1. **Given** a confirmed booking with no payment recorded, **When** its link opens, **Then** 13
   shows "Awaiting payment", the price lines and total, the progress with the professional's
   confirmation date, and "Open the WhatsApp chat" as the primary action.
2. **Given** 13, **When** the person taps the primary action, **Then** WhatsApp opens with the
   booking reference and the payment instructions from site settings already written.
3. **Given** the team records the payment, **When** the link is opened or refreshed, **Then** the
   status reads "Paid", the progress marks the payment with its date, and the next step is the shoot
   day.
4. **Given** the professional declines or does not answer in time, **When** the link opens,
   **Then** the screen says so plainly and offers another free professional at the same price as
   the primary action (003 US3-S2).
5. **Given** a cancelled or on-hold booking, **When** the link opens, **Then** the status and a
   one-line reason show, with WhatsApp as the way to reach a person.
6. **Given** any booking screen, **When** the person looks for a way to pay, **Then** there is none
   in the app: no card field, no payment button, no stored payment detail.
7. **Given** 13, **When** the person taps "Ask {first name} in the chat" under "Need to change the
   date?", **Then** WhatsApp opens with the booking reference.

---

### User Story 5 - Confirm delivery or report a problem (Priority: P2)

When the professional marks the work delivered, the booking screen (14) shows "Delivered", the
booking's full history, and one primary action: "Confirm delivery". "Report a problem" asks what
went wrong and sends it to the team, putting the booking on hold.

**Why this priority**: Confirmation releases the creator's payout and closes the booking; it
happens once per booking, at the end.

**Independent Test**: Mark a seeded paid booking as delivered; open its link; confirm delivery and
see "Completed"; repeat with another booking, report a problem, and see "On hold".

**Acceptance Scenarios**:

1. **Given** a delivered booking, **When** its link opens, **Then** 14 shows "Delivered", the
   reference, the professional and the amount paid, a line asking to confirm, the history with a
   date per step, "Confirm delivery" and "Report a problem".
2. **Given** 14, **When** the person taps "Confirm delivery", **Then** the booking becomes
   "completed", the history shows it, and the payout due date is recorded for the team (003 US3-S4).
3. **Given** 14, **When** the person taps "Report a problem", **Then** a sheet asks "What went
   wrong?", and sending it puts the booking "on hold" for the team with the text attached.
4. **Given** the delivery confirmation window has passed, **When** the link opens, **Then** the
   screen shows whatever state the team set, and confirming is no longer offered if the booking is
   already completed.

---

### Edge Cases

- A creator becomes unavailable between 07 and the code step (another booking confirmed, the day
  blocked, the profile hidden): the quotation is not issued for them; the person sees a plain
  message and 07 for the same date.
- Two people accept quotations for the same creator and date: the first confirmation wins; the
  second booking is offered another creator (003 edge cases).
- Price rules change between 07 and the code step: the price shown on 11 and in the quotation is
  the one computed when the quotation is issued, and any change is shown before the person taps
  "Open WhatsApp".
- A brief with several professional types: 07 shows one carousel per type, one under another; the
  primary action continues once a creator is chosen for each type; the price is the sum; the
  quotation lists one professional per type.
- WhatsApp is not installed: the chat opens at WhatsApp's web address; the booking is saved either
  way.
- The code is never received: "Resend code" becomes available when the countdown ends; resending
  and attempts are limited as feature 009 sets; the person can switch the channel.
- The person changes number on 11: they return to 10 with the number kept for editing.
- The app is closed between 09 and 11: the brief and creator are kept for the private link; the
  details are asked again.
- A private link opened on a phone signed in to another account: the quotation still opens by its
  key (as on the website), and it is not added to the signed-in account.
- The status changes while the screen is open: the screen updates when it is refreshed or shown
  again; there are no push notifications in this feature.
- Content cannot be loaded: the something-went-wrong screen (39) shows with "Try again" and
  WhatsApp.
- Largest text size, long Arabic creator names, long venue text: everything wraps; the carousel
  cards grow taller rather than cut off text.

## Requirements *(mandatory)*

### Functional Requirements

**Choosing a creator (07, 08)**

- **FR-001**: Step 2 MUST start from a recorded brief (feature 010, 011 or the website) and keep
  every later step linked to it (003 FR-001).
- **FR-002**: 07 MUST show only listed creators free on the brief's date and matching its type and
  occasion (003 US1), in the same order as the website's step 2, each with one fixed price computed
  for the brief by the price rules (003 FR-003, FR-009) and what it includes.
- **FR-003**: The carousel MUST show cards of 296/360 of the screen width that snap to the centre
  with the next card peeking in, mark the chosen card (outline in the accent, widened dot), announce
  "n of m", and let a tap choose and centre a card; the primary action MUST follow the chosen
  creator.
- **FR-004**: Each card MUST show the creator's work gallery (one large and two small tiles, a play
  mark on video), photo or scene tile, name, code, emirates, years, specialties, languages, price and
  what it includes; it MUST NOT show ratings, verified badges or review counts.
- **FR-005**: 07 MUST offer "See {first name}'s work and profile" for the chosen creator and "Not
  sure? Let us pick", which continues without a creator.
- **FR-006**: When no one is free, 08 MUST show the nearest other days with free creators (up to
  four, nearest first, never in the past) with the real number free on each, the first day as the
  primary action, and "Ask on WhatsApp"; picking a day MUST change only the date.
- **FR-007**: A brief with no applicable price rule MUST show "price on request" and continue to
  WhatsApp instead of a quotation (003 US1-S4).

**Details and the number at the end (09, 10, 11)**

- **FR-010**: 09 MUST ask for date, start time, duration (options from the CMS), venue or address,
  and an optional note for the creator; date, duration and place MUST carry over from the brief;
  changing the duration MUST recompute and show the price.
- **FR-011**: 09 MUST NOT ask for a phone number, name or email.
- **FR-012**: For a signed-out person, 10 MUST show the booking summary, the phone field with the
  country code (UAE first), a hint that the number is the one they use WhatsApp on and that the
  creator sees their name, never their number, the choice of SMS or WhatsApp, and "Send code".
- **FR-013**: 10 and 11 MUST use the mobile-number sign-in of feature 009 (number validation, code
  sending, resend countdown, attempt and rate limits, wrong-code and expired-code handling, account
  creation for a new number); this feature MUST NOT define its own code rules.
- **FR-014**: 11 MUST show where the code was sent, "Change number", the six code cells (with the
  phone's one-time-code autofill), the resend countdown, the optional name field only for a number
  whose account has no name (009 FR-014), the booking summary, and "Open WhatsApp".
- **FR-015**: "Open WhatsApp" MUST, in one tap: verify the code, sign the person in (creating the
  account, with the name when given, for a new number), issue the quotation for the brief, creator
  and details (003 US2-S1) and save it to the account, then open WhatsApp with the booking details,
  reference and private link already written. If any part fails, nothing MUST be half-saved and the person
  MUST see a one-line message.
- **FR-016**: A signed-in person MUST skip 10 and 11; the primary action on 09 MUST then issue and
  save the quotation and open WhatsApp in one tap.
- **FR-017**: Returning to the app after WhatsApp MUST show the quotation (12) for the booking just
  saved.
- **FR-018**: The creator MUST see only the client's name, never their number.

**Quotation (12, 40)**

- **FR-020**: The quotation MUST be reachable by its private link without an account and by its
  owner in their account (003 FR-011); a wrong key MUST show the not-found screen.
- **FR-021**: 12 MUST show the brief line, reference, issue date, shoot date and time, the price
  lines stored when the quotation was issued (003 FR-010), any discount line, the total with its tax
  note, the professional for each type, the validity date, "Accept quotation" and "Questions? Ask on
  WhatsApp".
- **FR-022**: Accepting MUST move the booking to "accepted" once, however many times it is tapped,
  and MUST be refused after the validity date.
- **FR-023**: 40 MUST show "Expired", the reference, issue and validity dates, the brief summary
  (who, for, where, when, total), a note that price and availability may have changed, "Get a fresh
  quotation" (starting step 2 again from the same brief) and WhatsApp.
- **FR-024**: The header's "Download PDF" button on 12, 13 and 14 MUST [NEEDS CLARIFICATION: The
  website's PDF is the browser's own Save as PDF of the quotation page (003 FR-013). In the app,
  should "Download PDF" (a) open the quotation's web page in the system browser to save it there,
  (b) produce a PDF in the app and offer the system share sheet, or (c) be left out of the app?]

**Booking status (13, 14 and states without a board)**

- **FR-030**: The same link MUST show the booking's current state, read from the server each time
  the screen opens or is refreshed: accepted (waiting for the professional), confirmed (awaiting
  payment, 13), paid, scheduled, delivered (14), completed, cancelled, expired (40) and on hold, each
  with a status badge in words (never colour alone), the booking's progress or history, and one next
  step.
- **FR-031**: 13 MUST show "Awaiting payment", the brief line, reference, shoot date, professional,
  price lines and total, the progress (brief sent, professional confirmed, payment recorded, shoot
  day) with dates, "Open the WhatsApp chat" as the primary action (with the reference and the
  payment instructions from site settings written in), and "Need to change the date? Ask
  {first name} in the chat".
- **FR-032**: When the professional declines or the confirmation window passes, the screen MUST say
  so and offer another free professional at the same price as its primary action (003 US3-S2).
- **FR-033**: 14 MUST show "Delivered", the reference, professional and amount paid, the history
  with dates, "Confirm delivery" as the primary action and "Report a problem", which asks "What went
  wrong?" and puts the booking on hold with the text.
- **FR-034**: Payments MUST be recorded by an admin only; the app MUST NOT take, request or store
  any payment detail, and MUST only show the payment state the team recorded.
- **FR-035**: States with no board (accepted, declined or lapsed, paid, scheduled, completed,
  cancelled, on hold) MUST use the layout of 13 with their own badge, progress and next step.

**Design, content and accessibility**

- **FR-040**: Screens 07, 08, 09, 10, 11, 12, 13, 14 and 40 MUST match their canvas boards in
  English and Arabic, light and dark, through the design-fidelity check of feature 007; 13 MUST also
  match the designer's Arabic dark board 43. States with no board (FR-035, several carousels, the
  report-a-problem sheet) MUST be kept as the app's own baselines.
- **FR-041**: Each screen MUST have exactly one primary action, drawn as the Top Hit in the fixed
  primary red: "Continue with {first name} · {price}" on 07, the nearest other day on 08, "Continue
  · {price}" on 09, "Send code" on 10, "Open WhatsApp" on 11, "Accept quotation" on 12, "Open the
  WhatsApp chat" on 13, "Confirm delivery" on 14, "Get a fresh quotation" on 40.
- **FR-042**: Prices, durations, places, occasions, professions, the WhatsApp number, message
  templates, payment instructions and the time windows MUST come from the CMS through the mobile API
  (feature 008), never from app constants.
- **FR-043**: Arabic MUST be right to left with start and end positions only (the carousel swipes in
  reading direction), mirrored direction icons, and Arabic strings written by a person; amounts and
  dates follow the app language's format, and the phone number reads left to right inside Arabic.
- **FR-044**: Every interactive element MUST have a touch target of at least 44 × 44 and a screen-
  reader name, role and state (the labels on the boards, for example "Your creators", "Six-digit
  code", "Country code, United Arab Emirates, +971", "Booking progress"); the carousel MUST be
  operable without swiping (by the screen reader's adjust actions and by tapping cards); every
  screen MUST work at the largest system text size.
- **FR-045**: Self-started motion (the price rolling, the confirmation tick, the glint) MUST end
  within 5 seconds, and none MUST play under reduced motion.
- **FR-046**: The screens MUST open at the website's paths (`/match/{ref}/{key}`,
  `/match/{ref}/{key}/details`, `/q/{ref}/{key}`), with `/ar` opening them in Arabic; the number and
  code steps MUST be reachable only from inside the flow.

### Key Entities

- **Brief**: the recorded answers (feature 001), the reference and key that open its private link.
- **Match**: for a brief and date, the free listed creators in order, the fixed price and what it
  includes, or the nearest other days with how many are free.
- **Booking details**: date, start time, duration, venue, note.
- **Quotation**: reference, private key, version, price lines and discount stored at issue, total,
  validity, the professional per type, state.
- **Booking**: the state (quoted, accepted, confirmed, paid, scheduled, delivered, completed,
  cancelled, expired, on hold) with dates per step, one assignment per professional type.
- **Payment record**: held, released or refunded, recorded by an admin; shown only as a state.
- **Problem report**: the client's text and time, attached to an on-hold booking.
- **Account and session**: created or resumed by the code step (feature 009).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person goes from a recorded brief to a saved booking with WhatsApp open in under 3
  minutes, and from brief to accepted quotation in under 5 minutes (003 SC-001).
- **SC-002**: Step 2 shows its creators within 2 seconds of opening, on a mid-range phone on a 4G
  connection, for 95 % of briefs.
- **SC-003**: In a usability session, 4 of 5 participants complete 09 to 11 without help and say
  afterwards that they knew why their number was asked.
- **SC-004**: 0 bookings without a linked brief and quotation, and 0 duplicate bookings from
  repeated taps, in testing.
- **SC-005**: 0 screens in the app offer a way to pay.
- **SC-006**: Screens 07 to 14 and 40 pass the fidelity check in all four variants (and 13 against
  board 43), with at most 1 % of pixels differing and every key element within 1 px.
- **SC-007**: Every acceptance scenario `MQ-US1-S1` … `MQ-US5-S4` has an automated test named with
  its id.

## Assumptions

- Features 009 (mobile-number sign-in with SMS and WhatsApp codes, accounts created by number) and
  011 (profiles, used by "See the work and profile") exist first; 008 provides the matching,
  quotation, acceptance, booking status, delivery confirmation and problem report through the
  mobile API, sharing the website's rules.
- Every creator listed for a brief shows the same price (003 clarifications). Board placeholders
  with different prices per creator are placeholder data; if feature 011's open question introduces
  per-creator prices, this feature follows that decision.
- The WhatsApp chat is with the business number from site settings (001 FR-010); the copy "the chat
  with Omar" describes the conversation the team brokers. The payment instructions are written into
  the WhatsApp message from 13 rather than shown on the screen, matching board 13.
- The app offers no promo-code field (board 09 has none); a discount applied by the team or on the
  website still shows on the quotation.
- The order of creators on 07 is the website's step-2 order; the app adds no ranking of its own.
- The time windows (quotation validity 7 days, creator confirmation 24 hours, delivery confirmation
  7 days) are the website's content-managed settings.
- The details entered on 09 are kept only while the app is open; they are saved with the quotation
  when it is issued.
- Push notifications and automatic outbound messages are feature 018; the app shows state changes
  when a booking screen is opened or refreshed.
- The standalone sign-in (20 to 23) belongs to feature 009; the client's bookings list belongs to
  feature 013.
