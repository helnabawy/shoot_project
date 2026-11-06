# Feature Specification: Quick Match Matching, Quotation and Booking

**Feature Branch**: `003-quick-match-booking`

**Created**: 2026-11-06

**Status**: Draft (spec only — depends on 001 briefs, 002 creators, 004 prices)

**Input**: Inspired by shootix.ae Quick Match steps 2–4 ("Your creator": verified creators free that day at one price, date agreed before you pay; "Your details": name and WhatsApp; "Your quotation": view, keep the PDF, accept online) and its six-step client process (Define it, Book it, Pro confirms, Pay, Shoot day, Delivered).

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
   (nearby dates, "let us find one") and can still continue to WhatsApp.
3. **Given** a brief with "any date", **Then** all matching creators are
   listed and the date is requested in step 3.

---

### User Story 2 - Leave details and receive a quotation (Priority: P1)

The visitor enters name and WhatsApp number (pre-filled for members),
receives a quotation page and PDF (brief summary, creator, price breakdown
with travel fees and promo code, validity), and can accept it online.

**Acceptance Scenarios**:

1. **Given** step 3 submitted, **Then** a quotation with a unique reference
   is created, shown on a page with a downloadable PDF, and sent to the
   visitor's WhatsApp/email.
2. **Given** a valid promo code, **Then** the discount is applied and shown.
3. **Given** the visitor accepts, **Then** the booking is created in state
   "awaiting creator confirmation" and both sides are notified.

---

### User Story 3 - Creator confirms and the booking proceeds (Priority: P2)

The creator confirms or declines within a window; on confirmation the
client is asked to pay (payment provider integration or manual, see
assumptions); the booking moves through shoot day and delivery; the client
confirms delivery; the creator is paid within 10 days.

### User Story 4 - Admin oversight (Priority: P2)

Admins see all briefs, quotations and bookings with states, can reassign
creators, adjust prices, cancel, and export.

### Edge Cases

- Creator never responds: booking expires and the client is offered another
  creator.
- Price rules change after a quotation is issued: the quotation keeps its
  price until expiry.
- Duplicate acceptance (double tap): one booking.
- Client disputes delivery: booking enters "on hold" for admin review.

## Requirements *(mandatory)*

- **FR-001**: The system MUST resume from a recorded brief id (feature 001)
  and keep all later artefacts linked to it.
- **FR-002**: Creators MUST be able to mark availability per date (default
  available, with blocked dates) and the matching MUST honour it.
- **FR-003**: Each listed creator MUST show one price computed from the
  pricing rules for the brief (type, duration, location, extras).
- **FR-004**: Quotations MUST have a unique reference, a PDF, a validity
  period, an itemised price and an online acceptance action.
- **FR-005**: Bookings MUST follow explicit states (quoted, accepted,
  confirmed, paid, scheduled, delivered, completed, cancelled, expired,
  on-hold) with timestamps and an audit trail.
- **FR-006**: Clients, creators and admins MUST be notified at each state
  change through configurable channels.
- **FR-007**: Payment MUST be held until the client confirms delivery (or
  recorded as paid manually when no provider is configured).
- **FR-008**: Every page in the flow MUST meet the performance and
  accessibility budgets in both languages and themes and follow the
  recorded visual direction (Principle IX).

### Key Entities

Availability, Quotation (reference, lines, discount, validity, PDF),
Booking (state machine), Payment record, Notification log.

## Success Criteria *(mandatory)*

- **SC-001**: A visitor goes from brief to accepted quotation in under 5
  minutes.
- **SC-002**: 95% of quotations are generated within 3 seconds of step 3.
- **SC-003**: Zero bookings without a linked brief, creator and quotation.
- **SC-004**: Every booking state change in the acceptance scenarios behaves
  as specified, verified by automated tests.

## Assumptions

- Payment provider choice (Stripe, Tap, Telr…) and commission rates are
  decided before planning; a manual "mark as paid" path exists regardless.
- Quotation PDF layout and legal text are provided by the owner.
