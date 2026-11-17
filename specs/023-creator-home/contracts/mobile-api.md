# Contract: mobile API additions (023)

One additive endpoint in `/api/mobile/v1`. Existing endpoints and shapes are unchanged. The zod source
is `packages/domain/src/api/v1/creator-home.ts`; the snapshot `specs/contracts/mobile-api/v1.schema.json`
is regenerated and must differ only by additions.

## `GET /api/mobile/v1/me/creator/home`

- **Id**: `creatorHome`. **Auth**: required (Bearer). **Cache**: `private, no-store`.
- **Headers**: `Accept-Language` (en, ar) decides content words and labels.
- **Errors** (problem+json): `401 auth.errors.signInRequired`; `403 creators.errors.notProvider` when
  the member has no creator account.

### Response `creatorHomeV1`

```text
{
  name: string
  code: string | null
  professions: string[]                 // content words, primary first
  photo: imageV1 | null                 // the existing image shape (as in the creator profile)
  mode: 'live' | 'incomplete' | 'review' | 'paused'
  needs: needV1[]                       // existing shape; non-empty only when mode = 'incomplete'
  counts?: { toAnswer: int, comingUp: int, completed: int }   // present only when mode = 'live'
  queue: homeItemV1[]                   // ordered; empty unless mode = 'live'
  next: { ref, quotation|null, occasion, emirate, date, time|null, length|null, paid: boolean } | null
  today: 'free' | 'blocked' | 'booked'
  reasons: rejectReasonV1[]             // existing shape, for declining a brief
}

homeItemV1 =
  | { kind: 'booking', ref, persona, occasion, emirate, profession,
      date: day, time: string|null, length: string|null,
      client: string,                   // first name and initial only
      respondBy: iso-datetime }
  | { kind: 'brief', ref, persona, occasion, emirate, profession,
      date: day|null, sentAt: iso-datetime }
```

Rules the server guarantees:

- `queue` order: bookings by `respondBy` ascending, then briefs by `sentAt` descending.
- `counts.toAnswer === queue.length`.
- No phone, email, full client name, price or fee anywhere in the response.
- Unknown `kind` or `mode` values may be added later; the app must ignore an item whose `kind` it does
  not know and treat an unknown `mode` as `incomplete` without the action.
- `mode` comes from the profile status: `live` and `live-with-changes` → `live`; `in-review` →
  `review`; `paused` and `suspended` → `paused`; `draft` or no profile → `incomplete`.

### Examples (`packages/domain/src/api/v1/examples/`)

- `creator-home.json`: live, one booking and two briefs, a next shoot.
- `creator-home-clear.json`: live, empty queue, no next shoot.
- `creator-home-not-live.json`: `incomplete` with two needs; no `counts`, empty queue.

## Answers: existing endpoints, unchanged

| Card action | Endpoint | Body |
|---|---|---|
| Accept a booking | `POST /me/creator/bookings/{ref}/answer` | `{ decision: 'confirm' }` |
| Decline a booking | same | `{ decision: 'decline', reason? }` |
| Accept a brief | `POST /me/creator/briefs/{ref}/answer` | `{ persona, decision: 'accept' }` |
| Decline a brief | same | `{ persona, decision: 'reject', reason?, note? }` |

After a `2xx` or a `409` the app requests `creatorHome` again. A `409` (`inbox.errors.briefClosed`,
`booking.errors.not-allowed`, `booking.errors.dateTaken`) shows the "no longer open" message and the
queue moves on (FR-019). A network failure leaves the card and shows the retry message (FR-020).
