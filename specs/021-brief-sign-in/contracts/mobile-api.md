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
