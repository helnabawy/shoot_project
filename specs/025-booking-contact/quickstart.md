# Quickstart: Booking contact and confirmed bookings (025)

Run against the **local** database only (`apps/web/.env` points at production). Integration tests
use Testcontainers.

## Walkthrough

1. As a client with a confirmed booking, open `/account`: "Confirmed bookings" lists it. Tap it: no
   contact yet. Pay it: the quotation now shows the creator's name and number with "Call" and
   "Message on WhatsApp".
2. Open the same quotation by its private link in a private window: no contact.
3. As the booked creator, open `/account`: the booking is under "Confirmed bookings"; a tap lands on
   it in `/account/bookings`, with the client's first name, number, Call and WhatsApp.
4. In the app as the client: Account → "Confirmed bookings" → the booking opens the booking screen
   with the creator's contact (Call and WhatsApp as secondary buttons).
5. In the app as the creator: Bookings → Coming up shows the client's contact on the card.
6. Repeat in Arabic (numbers stay left-to-right) and in dark theme.

## Scenario → test mapping

Every scenario is covered by a test whose name starts with its id; `pnpm check:scenarios` checks that each file named here carries it.

| Id | Scenario | Tests |
|---|---|---|
| BC-US1-S1 | The owner sees each booked creator's contact in a sharing state | `domain/booking/contact.test.ts`, `booking-contact.int.test.ts`, `ContactRows.test.tsx`, `domain/api/v1/booking.test.ts`, `booking_contact_test.dart` |
| BC-US1-S2 | No contact outside the sharing states | `domain/booking/contact.test.ts`, `booking-contact.int.test.ts` |
| BC-US1-S3 | The private link alone, a guest or another member: no contact | `booking-contact.int.test.ts` |
| BC-US2-S1 | A booked creator sees the client's contact | `domain/booking/contact.test.ts`, `booking-contact.int.test.ts`, `CreatorBookingRow.test.tsx`, `creator_contact_test.dart` |
| BC-US2-S2 | Not before the creator's part is confirmed, never for another creator | `domain/booking/contact.test.ts`, `booking-contact.int.test.ts` |
| BC-US2-S3 | No verified number: no contact actions | `booking-contact.int.test.ts`, `ContactRows.test.tsx` |
| BC-US3-S1 | The client's account lists confirmed bookings | `account-home.test.ts`, `booking-contact.int.test.ts`, `account_confirmed_test.dart` |
| BC-US3-S2 | The creator's account lists confirmed bookings | `account-home.test.ts` |
| BC-US3-S3 | The bookings page leads with Confirmed | `account-home.test.ts` |
| BC-US3-S4 | The app opens a client's booking from the account | `account_confirmed_test.dart` |
