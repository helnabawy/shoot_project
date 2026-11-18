# Tasks: Booking contact and confirmed bookings (025)

**Input**: `spec.md`, `plan.md`, `quickstart.md`. **Paths**: `W` = `apps/web/src`, `D` = `packages/domain/src`,
`M` = `apps/mobile`, `T` = `apps/web/tests`.

No new collection, field, migration or package. Tests first in each phase; every test is named with its `BC-` id.

## Phase 1: Rule and contract

- [x] T001 Failing tests `D/booking/contact.test.ts` (`BC-US1-S1`, `S2`, `BC-US2-S1`, `S2`, `BC-US3-S3`)
- [x] T002 `D/booking/contact.ts`: `sharesContact`, `creatorSeesClient`, `isConfirmedBooking`, `formatPhone`, `contactNumber`; exported from `D/booking/index.ts`
- [x] T003 `bookingContactV1`; additive `bookingViewV1.contacts?`, `bookingViewV1.key?`, `bookingRequestV1.contact?`, `accountHomeV1.confirmed?`; examples `booking-view-contact`, `creator-bookings-contact`, `me-account-confirmed`; snapshot regenerated (additions only); `MQ-US4-S6` amended to allow `contacts` only (`D/api/v1/booking.test.ts`)

## Phase 2: Server (default deny)

- [x] T004 Failing integration test `T/integration/booking-contact.int.test.ts` (every `BC-US1`, `BC-US2`, `BC-US3-S1` server scenario: owner, guest, other member, other creator, pending creator, no verified number, completed)
- [x] T005 `W/modules/booking/contact.ts`: `creatorContactsFor` (owner only) and `clientContactsFor` (confirmed part only), one users read, `Users` access unchanged
- [x] T006 `commands/quotation-view.ts`: `contacts` and `key` for the signed-in owner; `api.ts` passes the viewer; the owner may open with the key `me` (already allowed by `getQuotationAccess`)
- [x] T007 `commands/creator.ts`: `contact` on a confirmed request
- [x] T008 `modules/account/commands/read-account.ts`: `confirmed` (awaiting payment, paid, scheduled; soonest first; at most three)
- [x] T009 `modules/payments/api.ts`: the payment page returns to the real quotation link when the owner came without a key

## Phase 3: Website

- [x] T010 Failing component tests `ContactRows.test.tsx`, `CreatorBookingRow.test.tsx` (`BC-US1-S1`, `BC-US2-S1`, `BC-US2-S3`); unit tests `account-home.test.ts` (`BC-US3-S1` to `S3`)
- [x] T011 `ContactRows` (Call and WhatsApp rows, number in `Bidi`), in `QuotationView` (hidden in print) and `CreatorBookingRow` (anchor `#b-{ref}`)
- [x] T012 `quote-page.tsx` and both quotation routes pass the signed-in viewer
- [x] T013 `/account`: "Confirmed bookings" (`ConfirmedBookings`, `confirmedRows`); `/account/bookings`: Confirmed leads for both roles (`splitConfirmed`)
- [x] T014 Messages `booking.contact.*`, `booking.confirmedGroup`, `otherRequests`, `otherBookings`, `account.confirmed.*` in en and ar
- [x] T015 Surface briefs `quotation`, `account-bookings`, `account-home` amended (contact rows, confirmed group)

## Phase 4: App

- [x] T016 Failing tests `booking_contact_test.dart`, `creator_contact_test.dart`, `account_confirmed_test.dart`
- [x] T017 `core/contact/booking_contact.dart`, `core/widgets/contact_block.dart`, `ShootIcons.phone`; ARB `contact*`, `accountConfirmed` (en, ar)
- [x] T018 Models: `BookingView.contacts`, `.key`; `BookingRequest.contact`; `AccountHome.confirmed`
- [x] T019 Booking screen shows `ContactBlock` per creator; PDF uses the returned key
- [x] T020 Creator booking card shows the client's `ContactBlock`
- [x] T021 Account home lists "Confirmed bookings"; `/account/bookings/:ref` opens `OwnBookingPage` (key `me`) instead of the stand-in

## Phase 5: Checks

- [x] T022 `pnpm typecheck && pnpm lint && pnpm test`; `pnpm check:scenarios` (025 added); `dart format`, `flutter analyze`, `flutter test`
- [x] T023 `impeccable detect` on the changed web components

## Owner refinement (2026-11-18)

- [x] T029 Quotation page: status as a tag (`StatusTag`), history as a timeline (`HistoryTimeline`), each booked creator with avatar, name, type and number, Call and WhatsApp as side-by-side buttons (`ContactButtons`, also on the creator's booking row); tests in `ContactRows.test.tsx`; DESIGN.md and the quotation brief updated; checked locally at 1024 px dark and 360 px Arabic light
- [x] T031 Status tags on every booking row: `/account/bookings`, the creator's rows, the account home (Up next, Confirmed bookings); creator-side tones; checked at 1024 px dark and 360 px Arabic light
- [ ] T030 The app's booking screen: the contact block has no avatar yet (needs a board, and a photo in `bookingContactV1`)

## Open

- [x] T024a The owner decided contact shows from Paid, not Confirmed (2026-11-18); rule, tests and spec updated
- [ ] T024 The owner confirms the remaining clarifications: the verified sign-in number, and that the privacy text covers sharing it with the other side of a booking
- [ ] T025 A canvas board for the app's contact block and the client's "Confirmed bookings" group (no board yet; built from catalogue widgets), then goldens and `pnpm fidelity`
- [ ] T026 Captures at 360/768/1024/1440 px, en/ar, light/dark of `/q/…`, `/account`, `/account/bookings`, and the impeccable finish review
- [ ] T027 Device walkthrough (`quickstart.md`): calls and WhatsApp on iOS and Android, VoiceOver and TalkBack
- [ ] T028 Older app builds open `/account/bookings/{ref}` as the stand-in; nothing to do, noted for release notes
