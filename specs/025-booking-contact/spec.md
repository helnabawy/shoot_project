# Feature Specification: Booking contact and confirmed bookings

**Feature**: `025-booking-contact` · **Test-id prefix**: `BC-` · **Created**: 2026-11-18 · **Status**: implemented (open items in `tasks.md`)

**Input**: the owner, 2026-11-18, with a screenshot of the paid quotation Q-5AHF6: "i prefer to show
the contact info of the creator and client contact method to each others for example show them
contact method call or message on whatsapp using their phone number and the confirmed Quotations
should be easy to access to creators and clients".

Related specs: `003-quick-match-booking` (booking states, the quotation page, the creator's rows),
`009-otp-sign-in` (the verified number is the users `username`), `012-mobile-quick-match` (the app's
booking screen), `013-client-account`, `014-creator-account`, `022-creator-offers` (FR-008: the
client's name and contact stay hidden from creators before a booking; FR-005c: the exact place goes
to the booked creator from Confirmed on), `023-creator-home`.

## Clarifications

### Session 2026-11-18 (decided by the implementing session; to be confirmed by the owner)

- Q: From which booking state do the two sides see each other's number? → A: from **Paid** through
  Scheduled and Delivered. **Decided by the owner, 2026-11-18**: "show contact only after paid, not
  confirmed" (a first draft used Confirmed). Not before (Quoted, Accepted, Confirmed), and not once
  the booking is over (Completed, Cancelled, Expired) or On hold (the team handles a reported
  problem). Confirmed bookings are still listed for easy access (User Story 3); they show contact
  once paid.
- Q: Which number? → A: each person's sign-in number, verified by a one-time code (009). The contact
  number typed in booking details is unverified and is not used. A person with no verified number
  (an email-only account) shows no contact actions; the team's WhatsApp stays.
- Q: Who may read a number? → A: only the two sides of that booking: the signed-in client who owns
  it, and a creator whose own part of it is confirmed. The private quotation link alone is not
  enough: a guest or another member who holds the link sees the quotation without contact.
- Q: What does "easy to access" mean? → A: confirmed bookings (Confirmed, Paid, Scheduled) are listed
  on the account home, one tap from the booking, and lead the bookings page as their own group, for
  clients and creators. In the app a client's booking opened from the account is the real booking
  screen (it was a stand-in showing only the reference).

## User Scenarios & Testing

### User Story 1: A client reaches their booked creator (P1)

1. **BC-US1-S1** Given a booking that is Paid, Scheduled or Delivered, when its signed-in
   client opens it, then each booked creator is shown with their name, their number, "Call" and
   "Message on WhatsApp". WhatsApp opens with a first line naming the booking's reference.
2. **BC-US1-S2** Given a booking that is Quoted, Accepted, Confirmed (not paid yet), On hold,
   Completed, Cancelled or Expired,
   then no creator contact is shown or sent.
3. **BC-US1-S3** Given someone who opens the private quotation link but is not signed in as the
   booking's client (a guest, another member), then the quotation shows as before with no contact,
   and the server's answer carries no number.

### User Story 2: A booked creator reaches their client (P1)

1. **BC-US2-S1** Given a booking in a sharing state on which the creator's own part is confirmed,
   when they open their bookings, then the booking shows the client's first name, their number,
   "Call" and "Message on WhatsApp".
2. **BC-US2-S2** Given a request the creator has not answered, declined or let lapse, or a booking
   outside the sharing states, then no client contact is shown or sent; a creator who is not on the
   booking can never read it.
3. **BC-US2-S3** Given the other side has no verified number, then no contact actions show and the
   rest of the booking is unchanged.

### User Story 3: Confirmed bookings are one tap away (P1)

1. **BC-US3-S1** Given a client with confirmed bookings, when they open their account, then
   "Confirmed bookings" lists up to three, soonest shoot first, each with its day, place, creator and
   state; a tap opens the booking. With none, the group is absent.
2. **BC-US3-S2** Given a creator with confirmed bookings, their account lists them the same way (the
   client's first name in place of the creator); a tap opens that booking among their bookings.
3. **BC-US3-S3** The bookings page leads with a "Confirmed" group for both roles (after a creator's
   requests waiting for an answer); everything else follows.
4. **BC-US3-S4** In the app, a client's booking opened from the account or a notification is the
   booking screen with its state, price, next step and contact, not a stand-in.

## Requirements

- **FR-001** One rule decides sharing (`packages/domain/src/booking/contact.ts`): the booking's state
  is Paid, Scheduled or Delivered, and, for a creator, their own assignment is confirmed.
- **FR-002** A contact is a name, the number in E.164, and a WhatsApp link with a first line in the
  reader's language. The number is the other person's verified sign-in number; anything else is no
  contact.
- **FR-003** Default deny: numbers are read by server code only for the booking's signed-in client
  or a creator with a confirmed part; no collection access rule is loosened; the private link, a
  guest, another member and a creator without a confirmed part get no contact field at all.
- **FR-004** Website: the quotation page (member view and private link when signed in as the owner)
  shows a contact group per booked creator; the creator's booking row shows the client's contact.
  Actions are ordinary rows, never a second Top Hit; they are not printed.
- **FR-005** App: the booking screen shows each contact (who, the number, Call and WhatsApp as
  secondary buttons); the screen's one primary action is unchanged. The creator's booking card shows
  the client's contact the same way.
- **FR-006** API changes are additive: `contacts` and `key` on the booking view, `contact` on a
  creator's booking request, `confirmed` on the client account home. Older apps ignore them.
- **FR-007** Numbers are shown left-to-right in both languages, grouped for reading
  (`+971 50 123 4567`).
- **FR-008** Account home and bookings page group confirmed bookings as in User Story 3; counts and
  rows are real or absent.
- **FR-009** 022 FR-008 keeps holding: before a booking is confirmed a creator sees neither the
  client's name nor their contact.

## Out of scope

In-app chat or calls, masking or proxy numbers, contact on briefs or offers, changing which number
is shown, notifying anyone that their number was shared, a creator's booking detail page on the
website (their booking opens in the bookings list).

## Assumptions

- Sharing the verified number with the other side of a confirmed booking is covered by the legal
  documents the owner maintains; the owner updates the privacy text if it says otherwise.
- The app has no board for the contact block; it is assembled from the catalogue (`SummaryRow`,
  `SecondaryButton`, `TopHit`) and a board is an open item.
