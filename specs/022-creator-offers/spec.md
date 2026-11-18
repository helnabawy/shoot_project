# Feature Specification: Creator offers

**Feature Branch**: `022-creator-offers`

**Created**: 2026-11-17

**Status**: Clarified 2026-11-17

**Input**: User description: "Feature 022 creator-offers, inDrive-style pricing for photographers and videographers, behind a new site-settings switch "Creators offer prices" (off = today's fixed-price Quick Match unchanged). The client names a price per professional type as the last step of the brief, pre-filled with the suggested price and bounded by admin limits; the brief goes to every matching creator in the emirate with the client's price; each creator accepts that price, offers another price, or says not for me; the client sees the offers arrive live, accepts or declines each; accepting leads to details and a quotation of the offers plus a platform fee; notifications for every step; lists refresh live; older app versions keep working."

Test-id prefix for this feature: `OF-` (for example `OF-US3-S2`).

## Clarifications

### Session 2026-11-17

- Q: What happens to today's fixed-price flow? → A: It stays, behind a site-settings switch "Creators offer prices"; off keeps today's flow.
- Q: Who sets the starting price? → A: The client names a price per professional type with the brief (pre-filled with the suggested price); creators accept it or counter.
- Q: What does the client pay? → A: The chosen offers plus a platform fee (a percentage the team sets), shown as its own line.
- Q: How live must the lists be? → A: Notifications plus short re-checking while a list is open; no new service.
- Q: How does VAT apply? → A: Everything is VAT-inclusive; no VAT line is added.
- Q: Do creators see the platform fee the client pays on top? → A: No; creators see only their own amount, the fee is shown to the client only.
- Q: How long does an offer stay open if the client does nothing? → A: Until the client decides, the creator withdraws, the shoot date passes, or the brief's open window (feature 019) ends; no separate offer timer.
- Q: How many times may a creator change their price on one brief? → A: At most 3 changes before the client picks; withdrawing is always allowed until then.
- Q: Are start time and venue asked before the brief goes out? → A: Start time and contact stay in details. The **place** is now asked before sending (amended below).
- Q: Where is the event, and what do creators see of it? → A (2026-11-17, amends the previous answer): the client drops a **required pin on a map** in the brief; the emirate is taken from the pin and replaces the emirate question. Before a booking is confirmed, creators see only the **area name, a rough circle on a small map and the approximate distance** from where they start; the exact pin and address show to the booked creator once the booking is confirmed. Maps and place search use **Google Maps**.

### Design review 2026-11-17

The owner approved canvas boards 44–56, and later the same day boards 57–63 (the place step and each of its states) with the place shown on 44–56, (`specs/design-system/canvas/`, feature `022-creator-offers`
in `manifest.json`; 55 and 56 are the Arabic dark references of 46 and 51). Drawing them added
FR-016a (a list, not the swipe rail), FR-016b (both account homes) and FR-018a (details lock what the
creators priced).

### Owner amendment 2026-11-18

- Q: Should step 2 list the creators who have not answered yet ("Waiting to hear from N creators", each
  with an "Asked" badge)? → A: No. The owner asked to hide that list: before an offer, step 2 shows only
  how many creators the brief went to (FR-016); a creator appears to the client only once they offer.
  Adds FR-016c and US4 scenario 10. The optional `waiting` field of the v1 contract stays (v1 changes are
  additive only) but the server no longer sends it, so released apps hide the list too.
- Q: Should the brief now go to every creator, not only those who match it? → A: First "keep matching
  only", then the owner amended it the same day: an offers brief is **not limited to the client's
  emirate**. It goes to every live creator who offers the type, is free on the date and satisfies every
  filtering slot, in any emirate; creators see the area and their distance and price for it. The
  fixed-price flow (switch off) still matches by emirate. Amends US2 (scenario 2), FR-007, the edge cases
  on the map fallback and a creator's starting point, and the waiting text ("Sent to N photographers",
  no emirate).
- Q: Can the client see who is offering before accepting? → A: Yes (asked the same day): each offer's
  photo, name and code open that creator's public profile, and closing it returns to the offers as they
  were. Adds FR-016d and US4 scenario 11. Accept and Decline stay the card's actions; the creator `code`
  is already in the v1 offer, so the API does not change.

### Analysis 2026-11-17

`/speckit-analyze` fixes: the emirate comes from the pin everywhere (US1-S1, US5-S2); FR-005 applies
when the map is available and FR-005d names the fallback; the public point is the centre of the pin's
~2 km grid cell (FR-005b); an offer locks when a quotation that includes it is issued and unlocks if
that quotation expires (FR-010, US3-S4–S6); lists re-check every 3 seconds (SC-001).

Related specs: `specs/003-quick-match-booking/` (step 2, quotation, booking states, price rules),
`specs/019-creator-brief-inbox/` (creator inbox, accept and reject, push), `specs/020-online-payment/`
(Pay {total}), `specs/021-brief-sign-in/` (sign in to accept a quotation), and their app counterparts
`specs/012-mobile-quick-match/`, `specs/014-creator-account/`.

## Background: the flow today, and what changes

Today one price per professional type comes from the price rules the team sets (package for the
duration, travel for the place). Every creator listed in Quick Match step 2 shows that same price. A
creator can say "yes" to a brief in their inbox (feature 019), but the yes carries no amount; the
client picks a creator, gets a quotation at the fixed price and accepts it. Lists change only when a
page is reloaded.

With this feature switched on, price becomes a conversation, as in ride-hailing apps that let the
rider name a fare: the client says what they want to pay, creators accept it or answer with their own
price, and the client chooses among real offers. The fixed price survives as the suggestion every
price box starts from. With the switch off, everything works exactly as today.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The client names a price (Priority: P1)

A client builds the brief as today (professional types, occasion, date, duration, other slots), but
instead of choosing an emirate they mark the place on a map: search an address or a venue, or drag a
pin; the emirate is taken from the pin. As the last step they see "Your price" for each professional
type, already filled with the suggested price for that type, duration and emirate. They can keep it or
change it within the allowed range, see the range, and send the brief.

**Why this priority**: Without a client price there is nothing for creators to accept or counter; it
is the start of the new flow.

**Independent Test**: With the switch on, a brief for a photographer in Abu Dhabi for 2 hours shows the
suggested price, refuses an amount outside the range, and is saved with the chosen price.

**Acceptance Scenarios**:

1. **Given** the switch is on and the client has chosen a photographer and a duration and pinned the
   place, **When** they reach the last step, **Then** the price box shows the suggested price for
   that type, duration and the pin's emirate, and the allowed range.
2. **Given** a brief for a photographer and a videographer, **When** the client reaches the last
   step, **Then** there is one price box per type, each with its own suggestion.
3. **Given** the client types an amount below the floor or above the ceiling, **When** they try to
   send, **Then** the brief is not sent and a plain message names the allowed range.
4. **Given** the client has not placed a pin, or placed it outside the emirates the site serves,
   **When** they try to send, **Then** they are asked to mark the place in the UAE first.
4a. **Given** the client searches "Yas Marina Circuit" and picks the result, **Then** the pin moves
   there, the area ("Yas Island, Abu Dhabi") shows under the map, and the emirate is Abu Dhabi.
4b. **Given** the client drags the pin to another street, **Then** the area and emirate update.
4c. **Given** the client's browser or phone allows location, **When** they choose "Use my location",
   **Then** the pin moves to where they are; refusing location leaves search and dragging.
5. **Given** no suggested price exists for a type (no package for that duration), **When** the
   client reaches the last step, **Then** the box is empty, they must type a price, and the range
   check is skipped except that the price must be above zero.
6. **Given** the switch is off, **When** the client builds a brief, **Then** there is no price step
   and the flow is exactly as today.

---

### User Story 2 - Matching creators get the brief with its price (Priority: P1)

When the brief is sent, every live creator who matches it (offers the professional type, is free on
the date, satisfies every filtering slot, in any emirate since 2026-11-18) gets a push and finds it at the top of
their inbox and Up next, now showing the client's price for their professional type.

**Why this priority**: Creators must see the price to accept or counter; the broadcast already exists
(feature 019) and only gains the price.

**Independent Test**: Send a brief for Abu Dhabi; a matching Abu Dhabi creator and a Dubai-only
photographer both receive a push and see the card with the price; a videographer and a creator
blocked on the date receive nothing.

**Acceptance Scenarios**:

1. **Given** a sent brief with a client price, **When** a matching creator opens their inbox,
   **Then** the card shows the occasion, the client's own words, the date, the area and emirate, a
   small map with a rough circle (never the exact pin), the approximate distance from where the
   creator starts, the professional type and the client's price, and never the client's name,
   contact details or address.
1a. **Given** a creator who has not set where they start from, **Then** the card shows the area and
   map without a distance, and a link to set it.
1b. **Given** the client accepted this creator's quotation and the booking is confirmed, **Then** the
   creator's booking shows the exact pin, the address the client confirmed in details, and a way to
   open directions in their maps app.
2. **Given** a creator who does not offer the type, or is blocked or booked on the date,
   **When** the brief is sent, **Then** they get no push and the brief is not in their inbox. A
   creator who serves only another emirate does get it, can offer, and their offer is listed for the
   client (amended 2026-11-18).
3. **Given** a creator who has push on, **When** a matching brief is sent, **Then** they get one
   push whose text includes the professional type, emirate, date and price, and tapping it opens
   their inbox.
4. **Given** the creator's inbox is open on the app or website, **When** a new matching brief is
   sent, **Then** the card appears without the creator reloading, within 5 seconds.

---

### User Story 3 - The creator accepts the price or offers another (Priority: P1)

On a brief card the creator has one primary action, "Accept {client price}", a second action "Offer
another price" that opens a price box pre-filled with the client's price and the allowed range, and
"Not for me" with the existing optional reasons. After answering, the brief moves to "You offered",
showing their price, where they can change the price or withdraw until the client picks.

**Why this priority**: The offer is the heart of the new model.

**Independent Test**: A creator accepts one brief at the client's price and counters another at a
higher price; both appear under "You offered" with the right amount; a price outside the range is
refused.

**Acceptance Scenarios**:

1. **Given** an open brief with a client price of AED 800, **When** the creator chooses "Accept AED
   800", **Then** an offer of AED 800 is recorded and the brief shows under "You offered: AED 800".
2. **Given** an open brief, **When** the creator chooses "Offer another price", types AED 950 within
   the range and sends, **Then** an offer of AED 950 is recorded.
3. **Given** the creator types an amount outside the range, **When** they send, **Then** nothing is
   recorded and a plain message names the range.
4. **Given** an offer that is not in an issued quotation, **When** the creator changes the price,
   **Then** the new amount replaces the old one and the client sees the new amount; this is allowed
   at most 3 times per brief.
5. **Given** an offer that is not in an issued quotation, **When** the creator withdraws it, **Then** the
   offer disappears from the client's list.
6. **Given** the client has a quotation that includes this creator's offer, **When** the creator
   tries to change or withdraw it, **Then** it is refused with a plain message that the client is
   booking it; once that quotation expires the creator may change or withdraw again.
7. **Given** the creator says "Not for me", **Then** the behaviour is as today (hidden for them, an
   optional reason, undo while the brief is open, the client is never told).
8. **Given** a creator on an older app that cannot send an amount, **When** they accept, **Then** the
   offer is recorded at the client's price.

---

### User Story 4 - The client sees offers live and chooses (Priority: P1)

After sending, the client lands on the offers page (step 2). Before any offer it says the brief was
sent to N creators and offers will appear here. Offers appear as they arrive, without reloading, one
group per professional type: photo, name, the "accepted your price" or "offered another price" mark,
the offer, the platform fee and the total. Each offer has Accept and Decline. Declining removes the
offer from the list and tells the creator. Accepting one offer per type leads on to details.

**Why this priority**: Choosing among offers is what the client gains from the new model.

**Independent Test**: Two creators offer on one brief; both appear on the open offers page within 5
seconds without reload; declining one removes it and the creator is notified; accepting the other
continues to details.

**Acceptance Scenarios**:

1. **Given** a sent brief with no offers yet, **When** the client opens the offers page, **Then** it
   says how many creators it was sent to and that offers will appear here, and shows the client's
   price per type.
2. **Given** the offers page is open, **When** a creator makes, changes or withdraws an offer,
   **Then** the page shows the change within 5 seconds without the client reloading.
3. **Given** several offers for one type, **Then** they are listed lowest total first, and offers at
   the client's price are marked as such.
4. **Given** an offer, **Then** it shows the creator's offer, the platform fee and the total the
   client would pay.
5. **Given** the client declines an offer, **Then** it disappears from their list, the creator is
   told (push and inbox) that the client chose otherwise, and the creator cannot offer again on
   that brief.
6. **Given** a brief with two professional types, **When** the client has accepted one offer for
   each, **Then** they continue to details; until then the continue action is not available.
7. **Given** a client who accepted an offer by mistake, **When** they go back before the quotation
   is accepted, **Then** they can choose another offer.
8. **Given** no creator matched the brief at all, **Then** the page says so and offers WhatsApp to
   the team, as today's "no one free" state.
9. **Given** a client with the app installed and push on, **When** a new or changed offer arrives,
   **Then** they get a push that opens the offers page.
10. **Given** a sent brief that matching creators have not answered yet, **When** the client opens the
   offers page, **Then** it does not list those creators (no names, codes or "Asked" rows); it shows
   only the count from scenario 1, and a creator appears only with their offer (amended 2026-11-18).
11. **Given** an offer from A on the offers page, **When** the client opens A's photo, name or code,
   **Then** A's public profile opens (website `/creators/{code}`, app `/creators/:code`), and going back
   returns to the offers page with the same offers and choices (amended 2026-11-18).

---

### User Story 5 - Quotation, acceptance and payment from the offers (Priority: P1)

With one offer accepted per type, the client fills details (time, venue, contact, note), sees a
quotation whose lines are each chosen creator's offer plus one platform-fee line and the total,
accepts it (signing in if needed, as today), and the booking starts confirmed because the creators
already agreed. Paying online charges that total.

**Why this priority**: Without it the offers never become a booking.

**Independent Test**: Accept an offer of AED 950 with a 10 % fee; the quotation shows AED 950, a fee of
AED 95 and a total of AED 1,045; after acceptance the booking is confirmed and "Pay AED 1,045" charges
exactly that.

**Acceptance Scenarios**:

1. **Given** accepted offers, **When** the client completes details, **Then** the quotation lists one
   line per creator's offer and one platform-fee line, with the total.
2. **Given** the switch is on, **Then** details offer no paid add-ons and no promo code, and show
   the date, duration and pinned place as fixed with a way to send a new brief instead.
3. **Given** a signed-out client, **When** they accept the quotation, **Then** they are asked to sign
   in and come back, as in feature 021.
4. **Given** the client accepts the quotation, **Then** each chosen creator's assignment starts
   confirmed and their date is held, the creator is told the booking is accepted, and other
   creators who offered see "went to another creator".
5. **Given** a chosen creator became unavailable before the client accepted the quotation (blocked
   the date, withdrew, profile hidden), **When** the client accepts, **Then** acceptance is refused
   with a plain message and the client goes back to the offers to choose again.
6. **Given** a confirmed booking, **When** the client pays online, **Then** the amount charged is the
   quotation total including the fee.

---

### User Story 6 - The team controls the model (Priority: P2)

An admin turns "Creators offer prices" on or off and sets the platform fee percentage and the floor
and ceiling of allowed prices (as percentages of the suggested price). Admins see every brief's
client prices and offers.

**Why this priority**: Rollout and rollback must not need a release.

**Independent Test**: Turn the switch on and off and change the fee; new briefs follow the new
setting while briefs already sent keep the mode and fee they started with.

**Acceptance Scenarios**:

1. **Given** the switch is off, **Then** briefs, step 2, quotations and the creator inbox behave
   exactly as before this feature.
2. **Given** a brief sent while the switch was on, **When** the switch is turned off, **Then** that
   brief continues in the offers flow to its end.
3. **Given** an admin changes the fee or the range, **Then** briefs already sent keep the values
   they were sent with.
4. **Given** an admin opens a brief, **Then** they see the client's prices and every offer with its
   creator, amount, changes and the client's decision.

### Edge Cases

- A creator offers on a brief whose date passes before the client chooses: the brief closes, offers
  lapse, both sides see it as closed.
- Two types where only one gets offers: the client cannot continue; the page says which type still
  waits; the client may contact the team on WhatsApp.
- A creator changes the price while the client is about to accept: the client always accepts the
  amount shown; if it changed in between, they are told and shown the new amount before continuing.
- The same creator offers for both professional types (photo and video): treated as two offers; the
  client may accept both.
- A creator blocks the date after offering: the offer disappears from the client's list.
- The suggested price changes after the brief was sent: the brief's range stays as sent.
- Push is off or unavailable: the inbox, Up next and the offers page still update by themselves while
  open, and in-app notifications remain.
- Arabic: prices, ranges and fees read correctly right to left with Arabic labels and Western digits as
  elsewhere on the site; the map and place search show Arabic names when the site is in Arabic.
- The map cannot load (no network, key refused): the place step says so and offers choosing the
  emirate and typing the area instead; such a brief goes to creators in every emirate like any other
  and creators see no map or distance.
- A pin in the sea, the desert far from any road, or outside the UAE: the client is asked to move it
  to a reachable place in the emirates served.
- A creator's starting point is in another emirate: the distance is still shown; in offers mode the
  brief reaches them whatever emirates they serve (amended 2026-11-18).

## Requirements *(mandatory)*

### Functional Requirements

**Switch and settings**

- **FR-001**: The team MUST be able to turn "Creators offer prices" on and off, and set the platform
  fee percentage, the price floor and the price ceiling (percentages of the suggested price),
  without a release. Default: off.
- **FR-002**: With the switch off, every existing flow (brief, step 2, quotation, inbox, payments)
  MUST behave exactly as before.
- **FR-003**: A brief MUST keep the mode, fee and range in force when it was sent, for its whole life.

**Client price**

- **FR-004**: With the switch on, the brief MUST end with a price per professional type, pre-filled
  with the suggested price (package for the duration plus travel for the emirate) and limited to
  the range.
- **FR-005**: With the switch on and the map available, a brief MUST have a map pin inside the
  emirates the site serves before it can be sent; its emirate (used for matching, travel price and the inbox) MUST be taken
  from the pin, and the emirate question is not asked.
- **FR-005a**: The place step MUST offer address and venue search, dragging the pin, and "Use my
  location" (only with the visitor's permission), and MUST show the area name under the map.
- **FR-005b**: Before a booking is confirmed, creators and every API they use MUST receive only the
  area name, the emirate, a public point (the centre of the roughly 2 km grid cell that holds the pin, never the pin
  itself), and the distance
  in whole kilometres from the creator's starting point; the exact pin and address MUST reach only the
  client, admins, and the booked creator once the booking is confirmed.
- **FR-005d**: When the map is not available (it fails to load, or maps are switched off), the place
  step MUST fall back to choosing one of the emirates and typing an area; such a brief is matched
  and priced by that emirate, and creators see the area and emirate with no map or distance.
- **FR-005c**: A creator MUST be able to set where they start from (a pin or an area) on their
  profile; the distance is shown only when it is set.
- **FR-006**: The client's price MUST be checked on the server as well as on screen.

**Broadcast**

- **FR-007**: Sending the brief MUST notify every live creator who matches it (today's matching rules
  except the emirate: since 2026-11-18 an offers brief reaches creators in every emirate), in-app and
  by push, with the client's price for their type; creators who do not match MUST NOT be notified.
  The creator's inbox, answering and the client's offers list use the same rule.
- **FR-008**: The creator's inbox card and Up next MUST show the client's price; the client's name and
  contact details MUST never be shown before a booking.

**Offers**

- **FR-009**: A matching creator MUST be able to accept the client's price, offer another price within
  the range, or say not for me.
- **FR-010**: A creator MUST be able to change their price at most 3 times, or withdraw, until a
  quotation that includes their offer is issued (the client sent details); while that quotation
  stands both are refused, and they are allowed again if it expires or the client chooses another
  offer before accepting it.
- **FR-011**: An accept without an amount (older app) MUST be recorded at the client's price.
- **FR-012**: The creator MUST see their own offer amount and never the platform fee.
- **FR-012a**: An offer MUST stay open until the client accepts or declines it, the creator withdraws
  it, the shoot date passes, or the brief's open window ends; it then shows as closed to both sides.

**Client choice**

- **FR-013**: The offers page MUST list, per professional type, each current offer with creator,
  offer amount, platform fee and total, lowest total first, marking offers at the client's price.
- **FR-014**: The client MUST be able to decline an offer; it MUST disappear for the client, the
  creator MUST be told, and that creator MUST NOT offer again on that brief.
- **FR-015**: The client MUST be able to accept one offer per professional type, change that choice
  until the quotation is accepted, and continue to details only when every type has an accepted
  offer.
- **FR-016**: Before any offer, the page MUST say how many creators the brief was sent to; if none
  matched, it MUST offer WhatsApp to the team.
- **FR-016c**: The offers page MUST NOT list the creators who have not answered; the client sees a
  creator only once that creator offers (amended 2026-11-18).
- **FR-016d**: Each offer MUST link the creator's photo, name and code to their public profile; on the
  website the profile then offers a way back to the same offers page (with the client's choices) as its one
  primary action and does not offer "Book with {name}" (owner, 2026-11-18), in the app the profile is pushed
  over step 2. Accept and Decline stay the offer's actions (amended 2026-11-18).
- **FR-016a**: Offers MUST be shown as a list in which every offer's Accept and Decline are visible
  at once (not a swipe rail showing one creator at a time); only the first (lowest total) offer's
  Accept is the screen's primary action.
- **FR-016b**: The client's account home MUST show the number of offers on each open brief and lead
  Up next with the brief that has offers; the creator's account home MUST show the client's price
  in Up next and a "Briefs and offers" entry that lists their past offers.

**Quotation and booking**

- **FR-017**: In this mode, the quotation MUST consist of one line per chosen offer and one
  platform-fee line, and its total MUST be what online payment charges.
- **FR-018**: In this mode, details MUST NOT offer paid add-ons or promo codes.
- **FR-018a**: In this mode, details MUST show the date, duration and place as fixed (the creators
  priced them); changing any of them means sending a new brief. Details ask only start time, the
  address details for the pin (building, floor, gate; pre-filled from the pin's address) and an
  optional note.
- **FR-019**: Accepting the quotation MUST need a signed-in member (feature 021) and MUST start each
  chosen creator's assignment confirmed and hold their date.
- **FR-020**: If a chosen creator is no longer available when the quotation is accepted, acceptance
  MUST be refused and the client returned to the offers.
- **FR-021**: Client prices, offers and the platform fee MUST all be VAT-inclusive; the quotation
  says "VAT included" as today and adds no VAT line, so the client pays exactly offers plus fee.

**Notifications and live lists**

- **FR-022**: These events MUST notify the other side in-app and by push, in the recipient's
  language: new matching brief (creator), new or changed offer (client), offer declined (creator),
  quotation accepted (creator), offer went to another creator (creator).
- **FR-023**: The creator's inbox and Up next and the client's offers page MUST show changes made by
  the other side within 5 seconds while open and visible, on the website and in the app, without
  reloading.
- **FR-024**: A push received while the app is open MUST refresh the matching list at once.

**Compatibility**

- **FR-025**: App versions released before this feature MUST keep working; every change to what the
  app exchanges with the server MUST be additive.
- **FR-026**: Professions and their labels MUST come from content, as everywhere else; nothing in this
  feature may name photographers or videographers in code.

### Key Entities

- **Brief** (extended): gains its mode (fixed price or offers), the client's price per professional
  type, the fee and range frozen at sending, and its **place**: the exact pin and address (private),
  the area name, the emirate and a public rounded point.
- **Creator starting point** (creator profile, extended): an optional pin or area the distance is
  measured from.
- **Offer** (extends a creator's answer to a brief): creator, professional type, amount, how many
  times it was changed, withdrawn or not, and the client's decision (declined, accepted).
- **Quotation line** (extended): two new kinds, a creator's offer and the platform fee.
- **Offer settings**: the switch, fee percentage, floor and ceiling.
- **Notification** (extended): new events for offers made, changed, declined and lost.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A client goes from sending a brief to seeing the first offer without reloading or
  leaving the page; changes appear within 5 seconds in 95 % of cases (lists re-check every 3 seconds while visible).
- **SC-002**: A creator can accept or counter a brief in at most 2 taps from the push.
- **SC-003**: A client can go from accepting an offer to a confirmed booking in under 3 minutes.
- **SC-004**: 100 % of offers are within the brief's range; no booking total differs from the sum of
  offers plus fee.
- **SC-005**: With the switch off, every existing acceptance test for Quick Match, the inbox and
  payments passes unchanged.
- **SC-006**: Older app versions complete the accept and brief flows without errors.
- **SC-007**: The offers page and inbox meet the site's speed and accessibility budgets in English and
  Arabic, light and dark, at 360 px; the map loads only when the place step opens, so the landing
  page's first load is unchanged.
- **SC-008**: No creator-facing screen, notification or API answer before a confirmed booking
  contains the exact pin or address (verified by test over every creator endpoint).

## Assumptions

- The suggested price is today's price for one professional type (package for the duration plus travel
  for the emirate); add-ons and promo codes play no part in this mode.
- Defaults: fee 10 %, floor 70 %, ceiling 200 % of the suggested price; the team changes them.
- Payment remains as in feature 020; payouts to creators and the commission settlement stay outside
  the app.
- Live updates use the app's notifications plus regular re-checking while a list is open; no new
  service is added.
- This supersedes, while the switch is on, the "one fixed price" statements of `PRODUCT.md`, spec 003
  (FR-003) and spec 019 (clarification 1, FR-007); those documents are annotated accordingly.
- New and changed app screens are drawn in the design canvas and approved by the owner before they
  are built.
