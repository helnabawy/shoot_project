# Data model: Creator home (023)

Nothing new is stored. The home is a read model over existing bookings, briefs, brief answers, creator
profiles and availability. No collection, field or migration.

One configuration change: `users.accountType` gains `saveToJWT: true`, so the session token carries it
(research R1). The token is a routing hint only; no access decision reads it.

## Read model: `CreatorHome`

Built per request for the signed-in provider by `creatorHome(ctx)`; the same object feeds the website's
page and the endpoint (contracts/mobile-api.md).

| Field | From | Notes |
|---|---|---|
| `name`, `code`, `professions[]`, `photo` | user and creator profile | professions are content words in the request language; `photo` is the existing `imageV1` or `null` |
| `mode` | `homeMode(profile.status)` | `live`, `incomplete`, `review`, `paused` |
| `needs[]` | profile completeness (`needV1`) | only when `mode` is `incomplete` |
| `counts.toAnswer` | `queue.length` | absent unless `live` |
| `counts.comingUp` | confirmed, not yet shot | absent unless `live` |
| `counts.completed` | completed, all time | absent unless `live` |
| `queue[]` | `buildQueue(waiting, openBriefs)` | empty unless `live` |
| `next` | first upcoming confirmed booking | `null` when none |
| `today` | availability for the business day | `free`, `blocked`, `booked` |
| `reasons[]` | option set `brief-reject-reasons` | for the decline step of a brief |

## Queue item: `HomeItem`

A discriminated union on `kind`.

| Field | `booking` | `brief` |
|---|---|---|
| `kind` | `booking` | `brief` |
| `ref` | booking reference | brief reference |
| `persona` | assignment's persona id | the item's persona id |
| `occasion`, `emirate` | content words for the title | same |
| `profession` | content word | content word ("Needs") |
| `date` | day | day or `null` ("Date to agree") |
| `time` | start time or `null` | — |
| `length` | duration label or `null` | — |
| `client` | first name and initial | — (never shown for a brief) |
| `respondBy` | answer-by instant | — |
| `sentAt` | — | when the brief was sent |

Title on screen: "{occasion} in {emirate}" from a message key; when the occasion is empty, the
profession takes its place.

## Rules (`packages/domain/src/account/creator-home.ts`)

- `buildQueue(waiting, briefs)`: bookings first, by `respondBy` ascending (ties by `ref`); then briefs
  by `sentAt` descending (ties by `ref`). Pure; inputs are already scoped and filtered.
- `homeCounts(queue, upcoming, done)`: the three numbers.
- `homeMode(status)` over `ProfileStatus` (`packages/domain/src/creators/types.ts`): `live` and
  `live-with-changes` → `live`; `in-review` → `review`; `paused` and `suspended` → `paused`; `draft`
  or no profile → `incomplete`. The switch is exhaustive, so a new status fails the type check.
- `NEXT_LIMIT = 5`: rows shown under the card before the "See all" row.

## State changes

None of its own. Accept and Decline call the existing transitions:

| Action | Booking | Brief |
|---|---|---|
| Accept | `answerRequest(ref, confirm)`: assignment `pending → confirmed`, date blocked, booking may become `confirmed` | `answerBrief(ref, accept)`: answer row `accepted`, client notified |
| Decline | `answerRequest(ref, decline, reason?)`: assignment `declined`, team notified | `answerBrief(ref, reject, reason?, note?)`: answer row `rejected` |
| No longer open | problem `booking.errors.*` (409 / 403) | problem `inbox.errors.briefClosed` (409) |

After either, the home is read again; the item is gone from the queue because it no longer satisfies
the existing "waiting" or "open" rule.

## Validation

- Booking decline reason: optional, max 200 characters (existing `answerV1`).
- Brief reject: `reason` must be one of `reasons[].value` when given; `note` max 300 (existing
  `briefAnswerRequestV1`).
- The endpoint and the page refuse a caller who is not a provider (`creators.errors.notProvider`, 403).
