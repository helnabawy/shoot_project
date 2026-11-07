# Feature Specification: Quick Match Matching, Quotation and Booking

**Feature Branch**: `003-quick-match-booking`

**Created**: 2026-11-06

**Status**: Clarified 2026-11-07 (depends on 001 briefs and 002 creators; carries the price-rule core that 004 builds on)

**Input**: Inspired by shootix.ae Quick Match steps 2–4 ("Your creator": verified creators free that day at one price, date agreed before you pay; "Your details": name and WhatsApp; "Your quotation": view, keep the PDF, accept online) and its six-step client process (Define it, Book it, Pro confirms, Pay, Shoot day, Delivered).

## Clarifications

### Session 2026-11-07

- Q: Where do prices come from while feature 004 is not built? → A: This feature carries the price-rule core itself — service tiers per professional type and duration, travel fees per emirate, add-ons and promo codes, as content-managed data — plus one pure price rule; feature 004 later adds only the public pricing and corporate pages and deals on top of the same data.
- Q: Which payment path is used at this stage? → A: No payment provider. Once the creator confirms, the client is shown the amount and payment instructions (managed content) and sends the transfer receipt to WhatsApp; an admin records the payment by hand as held, then released to the creator after delivery is confirmed, or refunded.
- Q: How is the quotation PDF produced? → A: The quotation page has a print layout; "Download PDF" uses the browser's own Save as PDF, in the page language. No PDF is generated on the server.
- Q: Which stories are in scope and how are notifications sent? → A: All four stories. Every notification is recorded in a notification log (recipient, channel, template, booking, state change); the WhatsApp channel produces a pre-filled WhatsApp link an admin or the recipient can open, the in-app channel shows on the account page; automatic outbound sending (WhatsApp/email) is feature 008.
- Q: Does each creator have a different price? → A: No. The price is computed once per brief from the price rules, so every creator listed for a brief shows the same fixed price ("one price"); "let us choose" has the same price.
- Q: How do clients without an account reach their quotation and booking? → A: Through a private link with an unguessable token (shown after step 3 and included in the WhatsApp message); members also see their quotations and bookings in their account. Creators act on bookings from their signed-in account.
- Q: What are the default time windows? → A: Content-managed settings with defaults: quotation valid 7 days; creator confirms within 24 hours; client confirms delivery within 7 days, after which an admin may complete the booking; creator payout due within 10 days of completion. Currency is AED; prices are shown VAT-inclusive (tax lines are out of scope).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See who's free and pick a creator (Priority: P1)

After completing the brief sentence (feature 001), the visitor sees
verified creators who are available on the chosen date for that
professional type and occasion, each with samples and **one fixed price**
computed from the pricing rules (feature 004), and picks one (or "let
us choose").

**Acceptance Scenarios**:

1. **Given** a brief with a date, **When** step 2 loads, **Then** only
   creators marked available that day and matching the type/specialty are
   listed with the computed price, within 2 seconds.
2. **Given** no creator is free, **Then** the visitor sees alternatives
   (nearby dates, "Let us choose") and can still continue to WhatsApp.
3. **Given** a brief with "any date", **Then** all matching creators are
   listed and the date is requested in step 3.
4. **Given** the listed creators, **Then** each shows the same fixed price
   computed for the brief, with what it includes (duration, deliverables,
   travel fee); a brief whose duration or location has no price rule shows
   "price on request" and continues to WhatsApp instead of a quotation.
5. **Given** the visitor picks "let us choose", **Then** the flow continues
   without a creator and an admin assigns one before confirmation.
6. **Given** a creator has blocked the date or already has a confirmed
   booking that day, **Then** that creator is not listed for it.
7. **Given** the visitor completes the brief sentence (amended 2026-11-07,
   owner request), **Then** the brief bar itself shows, under its one action,
   up to three free matching creators per professional type with the one
   price, without saving anything; choosing one saves the brief and goes
   straight to the details step with that creator; the bar's action still
   opens the full list. Without JavaScript the bar is unchanged.

---

### User Story 2 - Leave details and receive a quotation (Priority: P1)

The visitor enters name and WhatsApp number (pre-filled for members),
receives a quotation page and PDF (brief summary, creator, price breakdown
with travel fees and promo code, validity), and can accept it online.

**Acceptance Scenarios**:

1. **Given** step 3 submitted, **Then** a quotation with a unique reference
   is created, shown on a page with a printable PDF, and a notification
   with a WhatsApp link to it is recorded for the visitor and the admins.
2. **Given** a valid promo code, **Then** the discount is applied and shown.
3. **Given** the visitor accepts, **Then** the booking is created in state
   "accepted" (awaiting creator confirmation) and both sides are notified.
4. **Given** an expired, unknown or used-up promo code, **Then** no discount
   is applied and a plain message says why.
5. **Given** a quotation past its validity, **Then** it can no longer be
   accepted and the visitor can request a fresh one from the same brief.
6. **Given** a signed-in member, **Then** name and WhatsApp number are
   pre-filled and the quotation appears in their account.

---

### User Story 3 - Creator confirms and the booking proceeds (Priority: P2)

The creator confirms or declines within the confirmation window; on
confirmation the client is shown the amount and payment instructions and
sends the receipt to WhatsApp; an admin records the payment as held; the
booking moves through shoot day and delivery; the client confirms delivery;
the admin records the creator's payout within 10 days.

**Acceptance Scenarios**:

1. **Given** an accepted booking, **When** the creator confirms in their
   account, **Then** the booking is "confirmed", the date is blocked for that
   creator, and the client sees payment instructions and a WhatsApp action
   to send the receipt.
2. **Given** the creator declines or the confirmation window passes,
   **Then** that creator's assignment lapses, the booking stays "accepted",
   the client is offered another available creator at the same price on the
   booking page, and an admin may reassign one.
3. **Given** a confirmed booking, **When** an admin records the payment,
   **Then** it is "paid" with the payment marked held; on the shoot date it
   is "scheduled".
4. **Given** the creator marks the work delivered, **When** the client
   confirms delivery, **Then** the booking is "completed" and a payout due
   date 10 days later is recorded; **When** the client reports a problem
   instead, **Then** it is "on hold" for admin review.
5. **Given** any transition not allowed from the current state, **Then** it
   is refused and nothing changes.

### User Story 4 - Admin oversight (Priority: P2)

Admins see all briefs, quotations and bookings with states, can reassign
creators, adjust prices, cancel, and export.

**Acceptance Scenarios**:

1. **Given** bookings in several states, **When** an admin opens the content
   area, **Then** they can filter bookings by state and see each one's
   brief, creator, quotation, payment records and audit trail.
2. **Given** a booking, **When** the admin reassigns the creator, adjusts
   the price (issuing a new quotation version), cancels, records a payment
   or resolves a hold, **Then** the change is recorded in the audit trail
   with who and when, and the affected people get a notification entry.
3. **Given** a filter, **When** the admin exports, **Then** a CSV of the
   matching bookings is downloaded.
4. **Given** a provider or client account, **Then** they can never see
   another person's bookings, quotations or payments.

### Edge Cases

- Creator never responds: booking expires and the client is offered another
  creator.
- Price rules change after a quotation is issued: the quotation keeps its
  price until expiry.
- Duplicate acceptance (double tap): one booking.
- Client disputes delivery: booking enters "on hold" for admin review.
- Two clients accept quotations for the same creator and date: the first
  confirmation wins; the second booking is offered another creator.
- The creator's profile is unverified or deactivated after a quotation: the
  quotation can no longer be accepted for that creator; the client is
  offered another one.
- A brief with several professional types (photographer and videographer):
  one price per type is summed, one creator is picked per type, and one
  booking holds one assignment per type; it is "confirmed" once every
  assigned creator has confirmed.
- A quotation that is never accepted: the booking becomes "expired" when the
  quotation's validity ends.

## Requirements *(mandatory)*

- **FR-001**: The system MUST resume from a recorded brief id (feature 001)
  and keep all later artefacts linked to it.
- **FR-002**: Creators MUST be able to mark availability per date (default
  available, with blocked dates) and the matching MUST honour it.
- **FR-003**: Each listed creator MUST show one price computed from the
  pricing rules for the brief (type, duration, location, extras).
- **FR-004**: Quotations MUST have a unique reference, a printable PDF
  (FR-013), a validity period, an itemised price and an online acceptance
  action.
- **FR-005**: Bookings MUST follow explicit states (quoted, accepted,
  confirmed, paid, scheduled, delivered, completed, cancelled, expired,
  on-hold) with timestamps and an audit trail.
- **FR-006**: Clients, creators and admins MUST be notified at each state
  change; every notification is recorded in a notification log with its
  channel (WhatsApp link, email, in-app). Automatic outbound sending is
  feature 008.
- **FR-007**: Payment MUST be recorded manually by an admin (no payment
  provider at this stage): the client sends the receipt to WhatsApp, the
  payment is recorded as held until the client confirms delivery, then
  released to the creator (due within 10 days) or refunded.
- **FR-008**: Every page in the flow MUST meet the performance and
  accessibility budgets in both languages and themes and follow the
  recorded visual direction (Principle IX).
- **FR-009**: Price rules MUST be content-managed data — service tiers per
  professional type and duration (price, deliverables), travel fees per
  emirate, add-ons, promo codes (percentage or fixed, validity window, usage
  limit) — and one pure rule MUST compute a brief's price from them
  (tier + travel fee + add-ons − promo), exhaustively unit-tested.
- **FR-010**: A quotation MUST store its price lines at issue time and keep
  them until it expires, regardless of later price-rule changes.
- **FR-011**: Quotation and booking pages MUST be reachable by the client
  through a private unguessable link without an account, and by members in
  their account; creators act only on their own bookings when signed in.
- **FR-012**: Time windows (quotation validity, creator confirmation,
  delivery confirmation, payout due) and payment instructions MUST be
  content-managed settings.
- **FR-014**: The brief bar MUST preview matching creators as soon as the
  brief is complete (US1-S7), computed from the unsaved answers with the
  same rules as step 2; a brief is saved only when the visitor acts.
- **FR-013**: The quotation page MUST have a print layout so the browser's
  Save as PDF produces the quotation document in the page language.

### Key Entities

Availability (blocked dates per creator), Price rules (service tier,
travel fee, add-on, promo code), Quotation (reference, private token,
lines, discount, validity, version), Booking (state machine, one assignment per professional type, audit trail),
Payment record (held, released, refunded), Notification log.

## Success Criteria *(mandatory)*

- **SC-001**: A visitor goes from brief to accepted quotation in under 5
  minutes.
- **SC-002**: 95% of quotations are generated within 3 seconds of step 3.
- **SC-003**: Zero bookings without a linked brief and quotation, and zero
  confirmed bookings without a creator for every professional type.
- **SC-004**: Every booking state change in the acceptance scenarios behaves
  as specified, verified by automated tests.

## Assumptions

- No payment provider at this stage; a provider (Stripe, Tap, Telr…) is a
  later feature that replaces the manual record, not the booking states.
  Commission rates are out of scope.
- Quotation legal text and payment instructions are content the owner edits;
  seed text is a placeholder.
- Prices are in AED, VAT-inclusive; tax invoices are out of scope.
