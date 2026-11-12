# Contract: booking endpoints of `/api/mobile/v1` (additive)

All through `defineHandler`; failures are `problem+json`. Shapes live in
`packages/domain/src/api/v1/booking.ts`. `{ref}` is the brief or quotation reference, `{key}` the
private key.

| Id | Method and path | Auth | Cache | Input | Output |
|---|---|---|---|---|---|
| `match` | `GET /match/{ref}/{key}?date&duration` | none | no-store | params, query | `matchV1` |
| `quotationIssue` | `POST /match/{ref}/{key}/quotation` | required | no-store | `quotationRequestV1` | `quotationIssuedV1` |
| `quotationView` | `GET /quotations/{ref}/{key}` | none | no-store | params | `bookingViewV1` |
| `quotationAccept` | `POST /quotations/{ref}/{key}/accept` | none | no-store | none | `bookingViewV1` |
| `quotationConfirmDelivery` | `POST /quotations/{ref}/{key}/confirm-delivery` | none | no-store | none | `bookingViewV1` |
| `quotationReport` | `POST /quotations/{ref}/{key}/report` | none | no-store | `reportRequestV1` | `bookingViewV1` |
| `quotationFresh` | `POST /quotations/{ref}/{key}/fresh` | none | no-store | none | `freshQuotationV1` |
| `quotationPickAnother` | `POST /quotations/{ref}/{key}/pick-another` | none | no-store | `pickAnotherRequestV1` | `bookingViewV1` |

Problems: `api.errors.notFound` (wrong key, unknown), `api.errors.invalidInput` (fields carry
`booking.errors.*` keys), `api.errors.unauthorized` (issue without a token),
`api.errors.rateLimited` (issue), and 409 problems for state conflicts
(`booking.errors.unavailable`, `not-allowed`, `creatorUnavailable`, `expired`).

Never returned: `accessSalt`, any phone number, other clients' data, payment details beyond the
recorded state. Accept and confirm-delivery repeated after success return the same view.
