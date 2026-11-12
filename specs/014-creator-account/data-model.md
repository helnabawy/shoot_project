# Data model: Mobile creator account

No collection or schema change. Reads and writes `creator-profiles`, `creator-listings`,
`identity-documents`, `media`, `availability-blocks`, `bookings`, `notifications` through existing access.

## Wire entities (zod in `packages/domain/src/api/v1/creator-account.ts`)

- **CreatorAccount** (27): `name`, `code`, `professions[]`, `status`, `strength`, `needs[]`
  (`{step, required[], recommended[]}`), `waiting` (nearest request or null), `deliverable` (booking
  to mark delivered or null), `counts {waiting, upcoming, blockedDays}`.
- **MyProfile** (28/29/30): `code`, `status` (draft, in-review, live, live-with-changes, paused,
  suspended), `submittedAt`, `reviewNote`, `strength`, `canSubmit`, `fields`, `photo`, `samples[]`,
  `identity` per kind (`state`, `uploadedAt`, `note`), `steps[7]` (`key`, `number`, `state`
  needs|recommended|done, `required[]`, `recommended[]`), `options` (CMS lists), `limits`.
- **Availability** (31): `today`, `windowDays`, `days[]` (`date`, `state` blocked|booked), `blockedCount`.
- **CreatorBookings** (32): `updates[]`, `waiting[]`, `upcoming[]`, `done[]`; a **BookingRequest** has
  `ref`, `quotation`, `occasion`, `emirate`, `date`, `profession`, `client` (first name), `respondBy`,
  `state`, `answer`, `canDeliver`, `paid`. No phone, no prices of others.

## State transitions

Profile status follows 002 `profileStatus`. Assignment: pending to confirmed or declined (or lapsed by the
clock); booking `scheduled` to `delivered` by the creator after the shoot day.
