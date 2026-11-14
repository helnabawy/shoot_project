# Feature Specification: Creator brief inbox

**Feature Branch**: `019-creator-brief-inbox`

**Created**: 2026-11-13

**Status**: Clarified 2026-11-13 (awaiting the owner's review before `/speckit-plan`)

**Input**: User description: "Signed-in creators (providers) should see incoming client briefs that match them and accept or reject each one, on both the website's creator account home (`/account`) and the Flutter app's creator account screen. It should sit in, or work like, the existing Up next panel. Today a client sends a brief, a quotation is issued, the client accepts, and only then is a creator assigned; the owner wants creators to see open client briefs before any quotation and accept or reject them: a change to the matching model, not just a UI tweak."

Test-id prefix for this feature: `BI-` (for example `BI-US1-S3`).

## Clarifications

### Session 2026-11-13

- Q: When a matching creator accepts an open brief, what happens to the quotation and booking flow? → A: Several creators may accept one brief. The client's Quick Match step 2 lists the creators who already accepted first; the one the client picks is assigned already confirmed (no second confirmation). The price stays the one price from the rules; the admin flow is otherwise unchanged.
- Q: Which open briefs does a creator see? → A: The same rules as Quick Match step 2: the creator offers the brief's professional type, serves its emirate, is free on its date (not blocked, not booked; a brief without a date matches on everything else) and satisfies every filtering slot such as the "shot by" gender preference. The occasion's specialty only sorts the list, it never filters.
- Q: What does Reject do? → A: It hides the brief for that creator only, with an optional reason from a short content-managed list (English and Arabic) and an optional note; the creator can undo while the brief is open; the client is never told; admins see the reasons.
- Q: How does the client hear that a creator accepted? → A: Push notification, in-app notification and the brief's private link, all three. (Owner's answer: "push notification and in app - private link as well".)
- Q: Which push messages are sent, given push does not exist yet? → A: Both directions, to the Shoot app on iPhone and Android: the client gets a push when a creator accepts their brief, and matching creators get a push when a new brief that matches them arrives. Devices register for push; each member can switch push off; in-app and the private link remain the fallback. Automatic WhatsApp and email stay with feature 018.

Related specs: `specs/001-landing-auth-cms/` (briefs and the brief builder), `specs/002-creator-profiles/`
(creator profiles: professional types, specialties, emirates, gender, availability calendar),
`specs/003-quick-match-booking/` (matching rules of step 2, quotation, assignment and creator
confirmation), `specs/012-mobile-quick-match/` and `specs/014-creator-account/` (the same in the app),
`specs/ROADMAP.md` 018 (automatic outbound notifications, not built).

## Background: the flow today

1. A client completes the brief sentence (professional type, occasion, emirate, date and other
   slots). The brief is saved with status *new*.
2. Quick Match step 2 lists the creators who match (professional type, emirate, free on the date,
   every filtering slot such as "shot by"; the occasion's specialty ranks, it never filters). The
   client picks one or "let us choose".
3. Step 3 produces a quotation at one fixed price; the client accepts it and a booking is created.
4. Only now is a creator assigned (the picked one, or one an admin chooses), and the creator
   confirms or declines with a reason before a deadline, on Bookings.

Creators therefore never see a brief until a client has already accepted a price. This feature
lets matching creators see open briefs earlier and say whether they want them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the briefs that match me (Priority: P1)

A signed-in creator whose profile is live opens their account home. The Up next panel leads with
open client briefs that match them: how many are waiting and the soonest one, with the occasion
sentence, the professional type, the emirate, the date and how long ago it was sent. They never see
the client's name, phone number or any other contact detail. One action opens the list of all
matching open briefs, soonest date first.

**Why this priority**: Nothing else in the feature works until a creator can see the right briefs,
and it is the part the owner asked for first.

**Independent Test**: With one live creator and briefs that do and do not match them, the account
home and the list show exactly the matching ones, without client contact details.

**Acceptance Scenarios**:

1. **Given** a live creator and an open brief that matches them, **When** they open their account
   home, **Then** the Up next panel shows the waiting count and the soonest matching brief, with one
   action to see them all.
2. **Given** an open brief for a professional type the creator does not offer, an emirate they do
   not serve, a date they have blocked or are already booked on, or a filtering choice they do not
   meet (for example a "shot by" preference), **Then** it is not shown to them.
3. **Given** a matching brief, **Then** the creator sees the occasion, type, emirate, date and when
   it was sent, and never the client's name, WhatsApp number or account.
4. **Given** a creator whose profile is draft, in review, paused or suspended, **Then** they see no
   briefs, and Up next keeps telling them about their profile instead.
5. **Given** both bookings waiting for the creator's answer and matching briefs, **Then** bookings
   waiting for an answer come first in Up next (they have a deadline), and the briefs follow.
6. **Given** no matching open briefs and nothing else waiting, **Then** Up next reads as clear, as it
   does today.
7. **Given** the app's creator account screen, **Then** it shows the same briefs and counts as the
   website for the same creator.

---

### User Story 2 - Accept a brief (Priority: P1)

The creator opens a matching brief and accepts it ("I can do this"). The brief then moves on in the
client's flow with this creator.

**Why this priority**: Accepting is the point of the feature: it is how a creator gets matched
earlier.

**Independent Test**: A creator accepts a matching brief; the brief, the client's view and the
admin's view reflect that this creator accepted, and the creator's list no longer offers it.

**Acceptance Scenarios**:

1. **Given** an open matching brief, **When** the creator accepts it, **Then** their acceptance is
   recorded with the time, the brief shows as accepted on their side, and it leaves their waiting
   count.
2. **Given** two or more matching creators, **When** each accepts the same brief, **Then** every
   acceptance is recorded and the brief stays open for the others until the client picks.
3. **Given** creators accepted a brief, **When** the client opens Quick Match step 2 for it, **Then**
   the creators who accepted are listed first, marked as having said yes, at the same one price;
   the other matching creators follow as today.
4. **Given** the client picks a creator who accepted and then accepts the quotation, **Then** that
   creator is assigned already confirmed: they are not asked to confirm again, and the booking moves
   on as if they had confirmed.
5. **Given** the client picks a creator who did not accept, or "let us choose", **Then** the flow is
   the same as today (the creator confirms after the client accepts the quotation).
6. **Given** the client's booking was created with another creator, **Then** the brief is no longer
   open and the other accepting creators see it as "went to another creator", without the name.
7. **Given** the brief was closed or became a booking in the meantime, **When** the creator accepts,
   **Then** nothing is recorded and they see a plain message that the brief is no longer open.
8. **Given** the creator accepted a brief whose date is now booked for them through another booking,
   **Then** the acceptance is withdrawn from the client's list (the creator is no longer free) and
   the admin sees why.
9. **Given** a creator accepted, **When** they withdraw the acceptance before the client picks them,
   **Then** they leave the client's "said yes" list.

---

### User Story 3 - Reject a brief (Priority: P2)

The creator says a brief is not for them, optionally with a reason chosen from a short list (and an
optional note). The brief disappears from their list for good.

**Why this priority**: Without it the list fills with briefs the creator will never take, but the
feature still delivers value without it.

**Independent Test**: A creator rejects a matching brief with and without a reason; it no longer
appears for them, still appears for other matching creators, and an admin can read the reason.

**Acceptance Scenarios**:

1. **Given** an open matching brief, **When** the creator rejects it, **Then** it no longer appears
   in their list or counts, on the website and in the app.
2. **Given** a rejection, **Then** a reason is optional; the reasons are managed content, in English
   and Arabic.
3. **Given** a rejection, **Then** other matching creators still see the brief, and the client is
   not told.
4. **Given** a creator rejected a brief by mistake, **Then** they can undo it while the brief is
   still open, from a short "Rejected" list.

---

### User Story 4 - The client and the team know who accepted (Priority: P2)

When a creator accepts a brief, the client hears about it by push notification (in the app), in the
account's notifications and on the brief's private link, and the admins see it too.

**Why this priority**: An acceptance nobody hears about does not change anything for the client.

**Independent Test**: After an acceptance, a push is sent to the client's registered devices, an
in-app notification is recorded, the private link shows the accepting creator, and the admin brief
record lists who accepted and who rejected.

**Acceptance Scenarios**:

1. **Given** a creator accepts, **Then** the brief's record in the admin lists who accepted and who
   rejected (with reasons), and a notification is recorded for the admins with a WhatsApp link to
   forward to the client.
2. **Given** a member client with the app installed and push allowed, **When** a creator accepts their
   brief, **Then** they receive one push in their language naming the creator's display name and
   the brief's occasion; tapping it opens the brief's step 2 with the accepting creators first.
3. **Given** a member client, **Then** the acceptance also appears in their in-app notifications on
   the website and in the app, whether or not the push arrived.
4. **Given** any client, member or not, **When** they open the brief's private link, **Then** it
   shows which creators said yes.
5. **Given** a client who switched push off, or has no device registered, **Then** no push is sent and
   the in-app notification and private link still work.
6. **Given** several creators accept within a short time, **Then** the client gets at most one push
   per creator, and never more than one push for the same creator and brief.
7. **Given** any push, **Then** it never contains a phone number, email or the client's name.

---

### User Story 5 - Creators hear about new matching briefs (Priority: P3)

A creator with the app installed gets a push when a new brief that matches them arrives, so they can
answer before others.

**Why this priority**: The inbox works without it, but pushes make early acceptance realistic.

**Independent Test**: Submitting a brief sends one push to each matching creator's registered
devices and none to creators who do not match.

**Acceptance Scenarios**:

1. **Given** a new brief, **When** it is saved, **Then** every creator who matches it and has push on
   receives one push in their language with the professional type, occasion, emirate and date;
   tapping it opens the brief in the app's inbox.
2. **Given** a brief addressed to one named creator, **Then** only that creator is pushed.
3. **Given** a creator who does not match, is not live, or switched push off, **Then** they get no
   push.
4. **Given** a push could not be delivered (an expired device registration), **Then** that device is
   forgotten and nothing else fails: the brief is saved and shows in the inbox.

---

### User Story 6 - Choose whether to get pushes (Priority: P3)

A member allows push on their device when the app first needs it, and can switch push off and on
again later in the app.

**Independent Test**: A member allows push, then switches it off; afterwards no push reaches their
devices, and switching it on again restores them.

**Acceptance Scenarios**:

1. **Given** a signed-in member in the app, **When** the app first has something worth a push (a
   creator opens the inbox, a client sends a brief), **Then** it asks the system permission once
   with a plain sentence why; declining changes nothing else.
2. **Given** push allowed, **Then** the device is registered to that member; signing out removes the
   registration.
3. **Given** the member switches push off in the app, **Then** no push is sent to any of their
   devices until they switch it on.

---

### Edge Cases

- A brief sent to one named creator (from their profile's "Book this creator") is shown only to that
  creator, not to every matching creator.
- A brief with several professional types (photographer and videographer) is shown to creators of
  each type; one creator's acceptance covers only their own type.
- A brief with "any date" matches on everything except the date, and shows "date to agree".
- A brief whose date has passed is no longer open: it leaves every list and cannot be accepted.
- When Quick Match is switched off in the content area, a brief has no private link: a member client
  sees acceptances in their account and by push only, and a visitor without an account hears from the
  team on WhatsApp (the admin notification carries the link to send).
- A brief that already became a booking (the client accepted a quotation) is no longer open.
- A brief closed by an admin leaves every list at once.
- A creator who changes their emirates, types or blocked days sees the list change on their next
  visit; acceptances and rejections already recorded stay.
- A creator paused or suspended after accepting: their acceptance stays recorded and the admin sees
  their status.
- Two creators accept at the same moment: both acceptances are recorded.
- A creator's push for a new brief and the brief being taken by another creator cross: tapping the
  push opens the brief with a plain "no longer open" message.
- A member signed in on several devices gets the push on each of them; a device shared by two
  members after sign-out and sign-in pushes only the member signed in.
- The app is offline or the brief changed while the creator looked at it: the answer is checked
  again on submit and the plain "no longer open" message is shown.
- Professional type, specialty and emirate names come from content, in the reader's language; a new
  professional type added in the content area works without a code change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a signed-in creator with a live profile the open client briefs that
  match them, on the website's account home (`/account`) and on the app's creator account screen,
  with the same briefs and counts in both.
- **FR-002**: A brief MUST match a creator when every rule of Quick Match step 2 holds: the brief
  asks for a professional type the creator offers; the creator serves the brief's emirate; the
  creator is free on the brief's date (not blocked, not already booked), unless the brief has no
  date; and every filtering slot of the brief (for example "shot by") is satisfied. The occasion's
  specialty MUST only sort the list (matching specialty first), never filter. A brief addressed to
  one named creator MUST match only that creator.
- **FR-003**: A brief MUST be open while its status is *new*, its date (if any) is today or later,
  and it has not become a booking.
- **FR-004**: The creator MUST see, for each brief, the occasion sentence, professional type,
  emirate, date (or "date to agree") and how long ago it was sent; the system MUST NOT show them the
  client's name, contact details or account.
- **FR-005**: The Up next panel MUST put bookings waiting for the creator's answer first, then
  matching open briefs (count and the soonest one, with one action to the full list), then the
  existing profile, next-job and clear states.
- **FR-006**: The creator MUST be able to accept an open matching brief; the system MUST check again
  that the brief is open and still matches when the answer arrives, and record who accepted and when.
- **FR-007**: Several creators MAY accept one brief. Quick Match step 2 MUST list the creators who
  accepted first, marked as having said yes, at the same one price; a creator who accepted MUST
  still be free and matching to be listed. When the client picks a creator who accepted and accepts
  the quotation, that creator's assignment MUST start confirmed. Picking anyone else, or "let us
  choose", MUST follow the existing flow. A creator MAY withdraw their acceptance until the client
  has picked them.
- **FR-008**: The creator MUST be able to reject an open brief with an optional reason from a
  content-managed list (English and Arabic) and an optional note; a rejected brief MUST NOT appear
  for that creator again, and other creators are unaffected.
- **FR-009**: The creator MUST be able to undo a rejection while the brief is open.
- **FR-010**: On acceptance the system MUST record a notification for the admins (with a WhatsApp
  link to forward), record an in-app notification for a member client, send a push to the client's
  registered devices unless push is off, and show the accepting creators on the brief's private
  link. Rejections MUST NOT notify the client.
- **FR-011**: Admins MUST see on each brief which creators accepted and which rejected, with times
  and reasons.
- **FR-012**: The app MUST get these briefs and answers through new additive endpoints of the
  versioned mobile API; existing endpoints and shapes MUST NOT change.
- **FR-013**: Professional types, specialties, emirates and rejection reasons MUST come from content
  in the reader's language; nothing in code or app strings may name a profession.
- **FR-014**: Everything visible MUST work in English and Arabic (right to left), light and dark
  theme, at 360 to 1440 px on the website and on phone and tablet in the app, and meet WCAG 2.1 AA.
- **FR-015**: Only the creator themself may read their matching briefs or answer for them; clients,
  other creators and visitors MUST NOT, and the brief's existing access rules stay as they are.
- **FR-016**: The app MUST register a device for push once the signed-in member allows it, and remove
  the registration on sign-out; the server MUST forget a registration the push service reports as
  no longer valid.
- **FR-017**: Each member MUST be able to switch push off and on in the app; while off, no push is
  sent to any of their devices.
- **FR-018**: When a brief is saved, the system MUST send one push to each matching live creator with
  push on (FR-002), in the creator's language, and none to anyone else.
- **FR-019**: Push text MUST be content-managed or message-file text in English and Arabic, MUST name
  professions only from content, and MUST NOT contain phone numbers, emails or the client's name. A
  failed push MUST NOT fail or delay the action that caused it.

### Key Entities

- **Brief** (exists): what the client asked for: professional types, selections (occasion, emirate,
  filtering slots), date, status, the client (member or contact), and optionally one named creator.
- **Brief answer** (new): one creator's answer to one brief: accepted or rejected, the time, the
  optional reason and note, and for which professional type. At most one current answer per creator,
  brief and type.
- **Rejection reason** (new, content): a short reason label in English and Arabic, ordered, can be
  switched off.
- **Notification** (exists): the notification log of feature 003; gains brief events and a push
  channel.
- **Push device** (new): one app installation registered for push by one member: the platform, the
  push address, the language and when it was last seen. A member has zero or more.
- **Push preference** (new, on the member): whether push is on.
- **Creator profile** (exists): professional types, specialties, emirates, gender, status and
  blocked days, which decide matching.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator with matching open briefs sees them on their account home within 2 seconds of
  opening it, on the website and in the app.
- **SC-002**: In tests, 100% of briefs shown to a creator satisfy every visibility rule and 0% expose
  client contact details.
- **SC-003**: A creator can accept or reject a brief in at most two taps or clicks from the account
  home.
- **SC-004**: A rejected brief never reappears for that creator, in 100% of tests across website and
  app.
- **SC-005**: In tests with the fake push provider, 100% of acceptances and new matching briefs
  produce exactly one push per eligible device, and none for members with push off.
- **SC-006**: Within the first month after launch, at least half of new briefs get one creator
  acceptance before a quotation is accepted (owner's business measure, read from the admin).

## Assumptions

- Only creators with a live (public) profile see briefs; draft, in-review, paused and suspended
  profiles do not.
- The brief list is read on each visit; the open screen does not update live. This feature brings
  the push part of feature 018 forward (app push on iPhone and Android only, no browser push);
  automatic WhatsApp and email sending stay with 018. A push provider account (for example the
  owner's Firebase project and Apple push key) is supplied by the owner; tests use a fake provider.
- The admin keeps the final say on bookings: nothing in this feature confirms a booking or a price
  without the client's acceptance of a quotation.
- Matching uses the same rules as Quick Match step 2 so a creator sees what a client would have been
  shown, keeping one definition of "matches".
- The feature depends on 003 (matching, bookings, notifications) and 014 (the app's creator
  account); it changes their screens additively.
- Open briefs older than their date leave the list on their own. A brief without a date stays open
  for a content-managed number of days after it was sent (default 30), then leaves every list.
- A brief whose quotation was issued but not yet accepted is still open; it closes once the client
  accepts a quotation.
