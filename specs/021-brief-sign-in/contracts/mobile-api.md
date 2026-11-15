# Contract: mobile API v1 changes (021) — additive

## `GET /api/mobile/v1/brief-builder` (`briefBuilder`)

Response `briefBuilderV1` gains one field:

```json
{ "locale": "en", "builder": { "…": "…" }, "signInRequired": true }
```

- `signInRequired?: boolean` — the server always sends it (`site-settings.briefNeedsSignIn`); a missing value means `false` (older servers). Older apps ignore it.
- Example `brief-builder.json` gains `"signInRequired": true`.

## `POST /api/mobile/v1/briefs` (`briefRecord`)

- Declared auth stays `optional` (guests are allowed while the switch is off).
- While the switch is on and the request has no valid Bearer member: `401` problem+json

```json
{ "type": "about:blank", "status": 401, "code": "brief.errors.signInRequired", "title": "Sign in to send your brief." }
```

  Nothing is recorded and no allowance is used.
- With a member: unchanged; the brief's `member` is that user.

## Problem codes

`brief.errors.signInRequired` is added to `problemCodes` (`packages/domain/src/api/v1/problems.ts`), both message files, and the app's `ProblemCode` enum (maps to a sign-in prompt, not an error line).

## Snapshot

`specs/contracts/mobile-api/v1.schema.json` regenerated; the additivity test passes.

## Amendment 2026-11-15 (additive)

- `briefBuilderV1.signInRequired` keeps its shape; the server now sends `false` by default (the switch is off).
- `POST /api/mobile/v1/quotations/{ref}/{key}/accept` (`quotationAccept`): declared auth stays `optional`.
  - No valid Bearer member: `401` problem `booking.errors.signInRequired`, title "Log in to accept your quotation."; nothing changes.
  - A member, and the booking has no member: accepted as today, and the booking (and its brief when it has no member) now belongs to that member; the response is the booking view.
  - A member, and the booking belongs to another member: `409` problem `booking.errors.otherAccount`; nothing changes.
  - A wrong key or unknown reference stays `404 api.errors.notFound` (checked first).
- Problem codes `booking.errors.signInRequired` and `booking.errors.otherAccount` are added to `problemCodes`, both message files and the app's `ProblemCode` enum (`signInRequired` maps to the sign-in screens, `?for=accept`, not to an error line).
- Snapshot `specs/contracts/mobile-api/v1.schema.json` regenerated; the additivity test passes.
