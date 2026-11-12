# Data model: Mobile Quick Match and booking

All entities exist (003); this feature adds one group and the wire shapes.

## Booking (`bookings`), one added group

| Field | Type | Rule |
|---|---|---|
| `details.startTime` | text, nullable | `HH:MM` 24 h, required by the issue command. |
| `details.duration` | text, nullable | A `durations` option value; defaults to the brief's. |
| `details.venue` | text, nullable | 1–200 chars, required by the issue command. |
| `details.note` | text, nullable | up to 300 chars. |

Access as the other booking fields (server only).

## Wire shapes (`packages/domain/src/api/v1/booking.ts`)

- `matchV1`: `{ locale, brief: {reference, sentence, date, duration}, date, priceOnRequest,
  totalFils|null, sections[{persona:{slug,singular,plural}, priceFils|null, includes[],
  creators[matchCreatorV1]}], nearby[{date, free}] }`; `matchCreatorV1 = creatorCardV1 + gallery`.
- `detailsV1` (request): `{ date, startTime, duration, venue, note? }`.
- `quotationRequestV1`: `{ picks[{persona, code|null}], details }`.
- `quotationIssuedV1`: `{ reference, key, state, whatsappUrl }`.
- `bookingViewV1`: see research R9.
- `reportRequestV1`: `{ reason }` 5–500; `pickAnotherRequestV1`: `{ persona, code }`.
- `freshQuotationV1`: `{ briefReference, briefKey, picks[] }`.

## State

`quoted, accepted, confirmed, paid, scheduled, delivered, completed`; side states `cancelled`,
`expired` (derived from validity), `on-hold`. Transitions are 003's; this feature adds none.
