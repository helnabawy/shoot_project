# Feature Specification: Online payment for confirmed bookings

**Feature Branch**: `020-online-payment`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Online payment for confirmed bookings (Stripe). Today, once a creator confirms a booking (state "confirmed", awaiting payment), the client sees "How to pay" instructions and a "Send receipt on WhatsApp" button, and an admin records the payment by hand in /admin (Payments, kind "received"), which moves the booking to "paid". Replace that manual path with an online payment: on the quotation page (web and the app) a confirmed booking shows one primary action "Pay AED {total}" that opens the provider's hosted, secure checkout (card, Apple Pay, Google Pay where available), in AED, in the client's language. On success the client returns to the quotation, which shows the booking as paid; the server learns of the payment from the provider's signed notification (not from the browser) and records exactly one "received" payment, which applies the existing "pay" transition, so the booking states are unchanged and everyone gets the existing "paid" notifications. A cancelled or failed checkout leaves the booking confirmed and lets the client try again. The amount always comes from the booking total on the server. The manual path stays as a fallback, and when the provider is not configured the page shows today's WhatsApp receipt flow. Refunds and payouts stay manual. Members and guests can both pay."

Test-id prefix for this feature: `PY-` (for example `PY-US1-S2`).

Related specs: `specs/003-quick-match-booking/` (booking states, quotation page, payments recorded by an
admin, notifications; its assumptions name a payment provider as a later feature that "replaces the
manual record, not the booking states"), `specs/012-mobile-quick-match/` (the quotation and booking
screens in the app), `specs/019-creator-brief-inbox/` (app push).

## Background: the payment step today

1. A client accepts a quotation; the creator confirms; the booking is **confirmed** ("Awaiting payment").
2. The quotation page shows "Confirmed. Please pay AED {total} and send us the receipt", the
   content-managed "How to pay" text (bank transfer to an account shared on WhatsApp) and one action,
   "Send receipt on WhatsApp".
3. The client transfers the money and sends the receipt; an admin records a payment "Received from
   client" in the content area, which moves the booking to **paid** and sends the "paid" notifications.

The client cannot finish on their own, the team must chase receipts, and nothing tells the client how
long it takes. This feature lets the client pay in one step, and the booking becomes paid without anyone
on the team doing anything.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The client pays a confirmed booking online (Priority: P1)

A client opens their quotation link (or their booking in the account) after the creator confirmed. The
page says the booking is confirmed and shows one primary action, "Pay AED 1,550". It opens a secure
payment page in the client's language, showing the booking reference and the amount, where the client
pays by card, Apple Pay or Google Pay. When they finish they come back to the quotation, which shows
"Paid" with the date, and the history shows the payment.

**Why this priority**: it is the whole point: the client finishes the booking alone, in under two
minutes, and the team no longer records payments by hand.

**Independent Test**: with the provider in test mode, confirm a booking, open its quotation as a guest
with the link, pay with a test card, and see the booking become paid on the page, in the account and in
the content area, with exactly one payment record.

**Acceptance Scenarios**:

1. **Given** a confirmed booking and online payment switched on, **When** anyone with the quotation's
   private link (or the member who owns it) opens it, **Then** the page shows one primary action
   "Pay AED {total}" with the booking total, and the WhatsApp receipt action is not shown.
2. **Given** that page, **When** the client chooses Pay, **Then** a secure payment page opens with the
   booking reference, the amount in AED equal to the booking total held on the server, and the client's
   language (English or Arabic).
3. **Given** the client completes the payment, **When** the payment provider confirms it to the server,
   **Then** one payment "Received from client" is recorded with the amount, the method "card (online)" and
   the provider's payment reference, the booking moves to **paid**, and the "paid" notifications go out
   exactly as they do for a payment recorded by hand.
4. **Given** the client returns from the payment page before the provider's confirmation arrives,
   **When** the quotation shows, **Then** it says the payment is being confirmed, and shows **paid** as
   soon as the confirmation is recorded, without the client doing anything else.
5. **Given** the client leaves the payment page without paying, or the card is declined, **When** they
   return, **Then** the booking is still confirmed, nothing is recorded, and they can choose Pay again.
6. **Given** a booking that is not confirmed (quoted, accepted, paid or later, cancelled, expired),
   **When** its page shows, **Then** there is no Pay action, and asking the server to start a payment for
   it is refused.

---

### User Story 2 - The client pays from the app (Priority: P2)

The same client uses the Shoot app. The booking screen of a confirmed booking shows the same "Pay AED
{total}" action; it opens the secure payment page, and when the client comes back to the app the booking
shows as paid (or "being confirmed" for a moment).

**Why this priority**: app clients reach the booking through push and the account; without this they
would be sent to the website to pay.

**Independent Test**: in the app against a test-mode server, open a confirmed booking, pay with a test
card, return to the app and see the booking paid.

**Acceptance Scenarios**:

1. **Given** a confirmed booking in the app (quotation screen or the client's booking), **When** it
   shows, **Then** its one primary action is "Pay AED {total}" and the WhatsApp receipt action is not
   shown.
2. **Given** the client pays and returns to the app, **When** the screen comes back, **Then** it reloads
   and shows paid, or "being confirmed" until the server has recorded the payment.
3. **Given** the client cancels on the payment page, **When** they return, **Then** the booking is still
   confirmed and Pay is offered again.

---

### User Story 3 - The team keeps control (Priority: P3)

Admins still see every payment in the content area, can still record a payment by hand (for a bank
transfer or cash), and are told when an online payment arrives that the booking no longer expects. With
online payment switched off, clients see today's instructions and WhatsApp receipt action.

**Why this priority**: the manual path must keep working, and money must never be lost or silently taken
twice.

**Independent Test**: record a payment by hand on a confirmed booking and see it paid as today; switch
online payment off and see the WhatsApp flow; send a payment confirmation for an already paid booking and
see one extra payment recorded and an admin alert, with the booking unchanged.

**Acceptance Scenarios**:

1. **Given** online payment is switched off (or not configured), **When** a confirmed booking's page
   shows, on the website or in the app, **Then** it shows the "How to pay" text and the "Send receipt on
   WhatsApp" action exactly as today, and starting a payment is refused.
2. **Given** a confirmed booking, **When** an admin records a payment by hand, **Then** it becomes paid as
   today, and a later online payment for it is handled as in scenario 3.
3. **Given** the provider confirms a payment for a booking that is no longer confirmed (already paid,
   cancelled) or for an amount different from the booking total, **When** it arrives, **Then** the money
   is recorded as received with the provider's reference so it shows as held, the booking state is not
   changed, and the team gets an in-app alert naming the booking, the amount and that a refund or a check
   is needed.
4. **Given** the provider sends the same payment confirmation more than once, **When** each arrives,
   **Then** only one payment is recorded and only one set of notifications is sent.
5. **Given** a message claims to be a payment confirmation but is not signed by the provider, **When** it
   arrives, **Then** it is refused and nothing is recorded.

---

### Edge Cases

- The client opens two payment pages (two tabs, web and app) and pays both: the first moves the booking
  to paid; the second is recorded as received with an admin alert to refund (US3 S3).
- The admin changes the price of a confirmed booking (a new quotation version) while a payment page is
  open: the open payment page is for the old amount; if it is paid, the amount differs and is handled as
  US3 S3. Starting a payment always uses the current total.
- The client cancels the booking while a payment page is open, then pays: recorded, alert, booking stays
  cancelled (US3 S3).
- The payment page expires unused (the provider closes it after a while): nothing is recorded; Pay starts
  a new one.
- A payment page that is already open and unpaid for the same booking and amount is reused rather than a
  new one being started for every click.
- The provider is unreachable when the client chooses Pay: the client sees a short error in their
  language with a retry, and the booking is unchanged.
- The confirmation arrives before the client returns, or the client never returns (closed the
  browser): the booking still becomes paid, and the client gets the "paid" notification.
- The booking total is zero (a full promo): no Pay action; the team handles it by hand as today.
- A guest with the quotation link pays: same as a member; the link's access rules are unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: For a booking in the **confirmed** state, with online payment switched on, the quotation
  page (website) and the booking screen (app) MUST show one primary action "Pay AED {total}" in place of
  the WhatsApp receipt action and the "How to pay" text, with one line saying it is a secure card,
  Apple Pay or Google Pay payment.
- **FR-002**: Choosing Pay MUST open the payment provider's own hosted secure payment page. Card details
  never pass through or are stored by this system.
- **FR-003**: The amount MUST be the booking total in AED as held on the server at the moment the
  payment is started; nothing the browser or app sends can change it. A total of zero offers no Pay.
- **FR-004**: Starting a payment MUST be allowed only for a confirmed booking, only to the holder of the
  quotation's private link or the member who owns the booking, and only while online payment is on;
  otherwise it is refused with an error message key.
- **FR-005**: The payment page MUST show the booking reference and use the client's language
  (English or Arabic) where the provider supports it, and MUST return the client to the same quotation
  (website) or booking screen (app) on success or cancel.
- **FR-006**: The system MUST treat a payment as made only when the provider's signed confirmation
  reaches the server; the client's return to the page is never proof.
- **FR-007**: On a confirmed payment for a confirmed booking with the matching amount, the system MUST
  record exactly one payment "Received from client" (amount, method "card (online)", the provider's
  payment reference, recorded by the system) and apply the existing "pay" transition, which sends the
  existing "paid" notifications (in-app, WhatsApp link rows, app push) and stamps the paid time.
- **FR-008**: Repeated confirmations of the same payment MUST record nothing new and send nothing new.
- **FR-009**: A confirmed payment for a booking that is not confirmed, or for an amount other than its
  total, MUST still be recorded as received (so the money shows as held for a refund), MUST NOT change
  the booking state, and MUST raise an in-app alert to the team.
- **FR-010**: Confirmations without a valid provider signature MUST be refused and nothing recorded.
- **FR-011**: After returning from the payment page, the quotation MUST show "Payment being confirmed"
  until the payment is recorded and then show paid without the client reloading by hand (website polls
  briefly; the app reloads on return).
- **FR-012**: A cancelled, expired or declined payment page MUST leave the booking confirmed with Pay
  offered again; an open unpaid payment page for the same booking and amount MUST be reused.
- **FR-013**: Admins MUST still be able to record payments by hand (received, payout, refund) as today;
  refunds and payouts of online payments stay manual in this feature.
- **FR-014**: Online payment MUST be switched on and off by configuration (provider: `stripe` or `off`,
  off unless the provider's keys are set). Off means today's WhatsApp flow on the website and in the app.
- **FR-015**: The app MUST learn from the server whether online payment is on and the amount to show; it
  MUST NOT decide either itself.
- **FR-016**: All new interface text (Pay, being confirmed, payment errors) MUST be in English and
  Arabic, right-to-left in Arabic, in light and dark theme; amounts formatted for the language as today.
- **FR-017**: Provider keys and signing secrets MUST live only in the server's environment; no key that
  can move money reaches the browser or the app.
- **FR-018**: Each payment record MUST keep the provider's references so an admin can find it in the
  provider's dashboard.

### Key Entities

- **Payment** (exists): booking, kind (received, payout, refund), amount, method (adds "card
  (online)"), note, recorded by, recorded at; adds the provider's payment reference (unique) and
  whether it came from the provider.
- **Payment session**: one attempt to pay one booking online: the booking, the amount and booking
  revision it was started for, the provider's session reference and its link, its status (open, paid,
  expired) and when it was started. Lets an open session be reused and a confirmation be matched to its
  booking.
- **Admin alert** (exists as the in-app notification for the team): adds a "payment needs attention"
  event.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A client goes from the confirmed quotation to a paid booking in under 2 minutes with a
  saved wallet or card, without contacting the team.
- **SC-002**: 100 % of successful online payments end with the booking paid and exactly one matching
  payment record, within 1 minute of the provider confirming them.
- **SC-003**: 0 bookings move to paid without a provider-signed confirmation or an admin's hand record.
- **SC-004**: 0 duplicate payment records or duplicate "paid" notifications from repeated
  confirmations.
- **SC-005**: Every unexpected payment (wrong state, wrong amount, second payment) reaches the team as
  an alert, and none is lost.
- **SC-006**: With online payment off, the confirmed-booking page and screens are identical to today.

## Assumptions

- The owner chose Stripe as the provider (hosted checkout, AED, card, Apple Pay and Google Pay where
  the device supports them); the owner opens and verifies the merchant account. Until then everything is
  built and tested in the provider's test mode.
- The client pays the whole total once (no deposits or instalments); the money is held as today until
  delivery, then paid out to the creator by an admin (feature 003's rules).
- Refunds are made by an admin in the provider's dashboard and recorded by hand here; automatic refunds,
  split payouts to creators, commissions and saved cards are out of scope.
- The provider's own receipt (by email it collects on its page) is the client's receipt; this system
  sends no extra receipt.
- Prices are VAT-inclusive as today; the provider's fees are the owner's cost and are not shown to the
  client.
- The app opens the payment page in the system browser or an in-app browser tab and comes back through
  the existing app links; no payment SDK is added to the app.
