# Contract: account endpoints (v1, additive)

All `auth: required`, `cache: no-store`, errors as problem+json. Every query filters `member = caller`.

| id | Method and path | Answer |
|---|---|---|
| `meAccount` | `GET /api/mobile/v1/me/account` | `accountHomeV1` (404 for a creator account) |
| `meBookings` | `GET /api/mobile/v1/me/bookings?page=` | `bookingListV1` |
| `meBriefs` | `GET /api/mobile/v1/me/briefs?page=` | `briefListV1` |
| `meUpdate` | `PATCH /api/mobile/v1/me` body `meUpdateV1` | `meV1` (422 fields: `account.errors.*`) |

Examples in `packages/domain/src/api/v1/examples/` (`me-account`, `me-account-empty`, `me-bookings`,
`me-briefs`, `me-update-request`); the Dart decoders read the same files. Snapshot
`specs/contracts/mobile-api/v1.schema.json` regenerated with `pnpm --filter @shoot/domain api:snapshot`.
