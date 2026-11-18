# Implementation Plan: Booking contact and confirmed bookings (025)

**Spec**: `spec.md` · **Scenarios**: `quickstart.md` · **Tasks**: `tasks.md`

## Summary

On a paid booking (and while it is scheduled or delivered) the client and each booked creator see each
other's verified number with Call and WhatsApp; confirmed bookings are listed on the account home and lead the bookings page. No new
collection, field, migration, package or service: the numbers already exist as the users `username`
(009) and are read by server code for the two sides only.

## Technical context

- **Rule** (`packages/domain/src/booking/contact.ts`): `CONTACT_STATES`, `sharesContact(state)`,
  `creatorSeesClient(state, assignmentStatus)`, `isConfirmedBooking(state)`, `formatPhone(e164)`.
  Pure, 100 % covered.
- **Server** (`apps/web/src/modules/booking/contact.ts`): `creatorContactsFor(payload, booking,
  viewerId, locale)` (the client's view) and `clientContactsFor(payload, bookings, profileIds,
  locale)` (the creator's view, one users read for all rows). Both read `users.username` with
  `overrideAccess` after checking who asks; `Users` field access stays `selfOrAdminField`.
- **Website**: `ContactRows` (`modules/booking/components/ContactRows.tsx`) in the bar grammar: a
  result group per person with a Call row (`tel:`) and a WhatsApp row; used by `QuotationView`
  (status slot, hidden in print) and `CreatorBookingRow`. `/account` gets a "Confirmed bookings"
  group (`ConfirmedBookings` in `modules/auth/components/AccountHome.tsx`, picked by
  `confirmedRows` in `account-home.ts`); `/account/bookings` splits its groups.
- **API v1, additive**: `bookingViewV1.contacts?`, `bookingViewV1.key?` (the owner's private key, so
  the app's PDF link works when the booking was opened without one), `bookingRequestV1.contact?`,
  `accountHomeV1.confirmed?`. Snapshot regenerated, additions only.
- **App**: `BookingContact` entity and `ContactBlock` widget (`core/widgets/contact_block.dart`),
  `launchCall` / WhatsApp through the existing `url_launcher`; the client's
  `/account/bookings/:ref` builds `BookingPage` with the key `me` (the server lets the signed-in
  owner in without a key, as the website's member page does); account home lists `confirmed`.

## Constitution check

- **Tests first / scenario ids (III)**: every `BC-` scenario has a test named with its id
  (`quickstart.md`); `pnpm check:scenarios` includes this feature.
- **Default deny (IV)**: no access rule changes; contact is added only by the two server functions
  above, each tested for the owner, a guest with the link, another member and a creator without a
  confirmed part.
- **CMS data (II) / persona (VII)**: no profession name in code; type labels come from the booking.
  New words are UI strings (`messages/{en,ar}.json`, ARB en and ar).
- **Designed, not generated (IX)**: surfaces `quotation`, `account-bookings`, `account-home` inherit
  The Brief Bar; contact actions are ordinary rows, one Top Hit per screen kept. The briefs'
  "never the client's phone" lines are amended. App: no board exists for the contact block and the
  confirmed group (open item); built from catalogue widgets, shown only when the server sends the
  new fields, so existing goldens are unchanged.
- **Bilingual, themes (VIII)**: logical layout, numbers isolated LTR, tokens only.
- **Complexity**: nothing new to justify.

## Risks

- Privacy: a number reaches the other side from Paid (the owner's decision, 2026-11-18). Mitigated by the state rule, the
  two-sides check and tests; flagged to the owner (clarification 1 and the legal assumption).
- A booking with several creators shows one group per creator; a creator with two parts appears once.
