# Data model: Mobile client account

## Server (additive)

- `users.accountFinishDismissedAt: date | null` (server-written only).
- `site-settings.accountAbout: [{ line: text (localized) }]`, max 4.

## Wire shapes (`packages/domain/src/api/v1/account.ts`)

- `bookingStatusV1`: `awaitingAcceptance | waitingProfessional | awaitingPayment | confirmed | paid | scheduled | delivered | completed | cancelled | expired | onHold | declined` (the app reads an unknown value as a neutral badge).
- `bookingSummaryV1`: `{ reference, status, occasion|null, place|null, date|null (YYYY-MM-DD), startTime|null, professional|null, totalFils|null }`.
- `briefSummaryV1`: `{ reference, sentence, sentAt (ISO), status: new|contacted|closed, bookingReference|null }`.
- `upNextV1` or `null`: `{ kind: quote|delivery|payment|declined, booking: bookingSummaryV1 }`.
- `placesV1`: `{ bookings: { waiting, open }, briefs: { open }, details: { done, total } }` (counts; the app builds the words).
- `accountHomeV1`: `{ person: { name|null, phone|null }, upNext, places, briefs (latest 5), finish: { items: [{ key: number|name|email|preferences, done, value|null }], autoOpen }, about: string[] }`.
- `bookingListV1`: `{ upcoming, past, page, hasMore }` (upcoming only on page 1; past paged by 20).
- `briefListV1`: `{ items, page, hasMore }`.
- `meUpdateV1` (PATCH body): `{ name?: 2-80, email?: valid, finishShown?: true }`; answer `meV1`.

## Problem codes (additive)

`account.errors.emailInvalid`, `account.errors.emailInUse`, `account.errors.nameLength`.

## App entities

`AccountHome`, `UpNext`, `FinishChecklist`, `BookingSummary`, `BookingStatus` (`unknown` fallback), `BriefSummary`,
`PageOf<T>`; cubit states `AccountHomeState`, `FinishState`, `BookingsState`.
