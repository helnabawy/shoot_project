# Data model: Creator brief inbox (019)

One migration (`<ts>_brief_inbox`) adds everything below. All new collections declare explicit access
(default deny). Reviewed for data loss: only additions, and one `NOT NULL` dropped
(`notifications.booking`).

## New collection `brief-answers` (module `inbox`)

| Field | Type | Rules |
|---|---|---|
| `brief` | relationship → `briefs` | required, indexed |
| `creator` | relationship → `creator-profiles` | required, indexed |
| `persona` | relationship → `personas` | required; one of the brief's personas that the creator offers |
| `decision` | select `accepted` \| `rejected` | required |
| `reason` | text | option value from the `brief-reject-reasons` option set; only with `rejected` |
| `note` | textarea, max 300 | only with `rejected`; never shown to the client |
| `answeredAt` | date | set by the server |
| `withdrawnAt` | date, nullable | set on undo (rejected) or withdraw (accepted); cleared on a new answer |

- Unique compound index (`brief`, `creator`, `persona`). A new answer updates the row (upsert).
- **Current answer** = the row with `withdrawnAt` empty.
- Access: `read` admin, or the user who owns `creator`; `create`/`update`/`delete` none through the API
  (commands use `overrideAccess`). Admin: list grouped under "Brief builder", read-only.

State per (brief, creator, persona):

```text
(none) --accept--> accepted --withdraw--> (none, withdrawnAt set)
(none) --reject--> rejected --undo-----> (none, withdrawnAt set)
accepted --reject--> rejected      rejected --accept--> accepted   (only while the brief is open)
```

All transitions require the brief to be open (R2) and, for `accept`, the creator to match it (R1).

## `briefs` (exists)

- New `answers`: `join` on `brief-answers.brief` (admin display only, no column).

## `notifications` (exists)

- `booking`: no longer required.
- New `brief`: relationship → `briefs`, indexed. A `beforeValidate` hook requires exactly one of
  `booking` or `brief`.
- `event` options gain `brief-accepted` and `brief-new` (from `NOTIFICATION_EVENTS`).
- `channel` options gain `push`.
- `dedupeKey` for brief events: `brief:<briefId>:<event>:<audience>:<channel>:<recipient>`.

## New collection `push-devices` (module `push`, `apps/web/src/modules/push/`)

| Field | Type | Rules |
|---|---|---|
| `user` | relationship → `users` | required, indexed |
| `token` | text | required, unique (FCM registration token) |
| `platform` | select `ios` \| `android` | required |
| `locale` | select `en` \| `ar` | required, default `en` |
| `lastSeenAt` | date | updated on each registration |

- Registering a token that belongs to another user moves it to the caller (a shared device; spec edge
  case). Access: read admin; everything else server only (endpoints use `overrideAccess` scoped to
  the caller).

## `users` (exists)

- New `pushEnabled`: checkbox, default `true`, read/update self or admin.

## `site-settings` (exists, global)

- `quickMatch.inboxDays`: number, default 30, min 1 (R2).
- `quickMatch.templates` gains localised texts for `brief-accepted` (client in-app and push, admin
  WhatsApp) and `brief-new` (creator in-app and push), with `{occasion}`, `{type}`, `{emirate}`,
  `{date}`, `{creator}` variables. Never `{phone}` or `{client}` (FR-019).

## `option-sets` (exists)

- Seeded set `brief-reject-reasons` (en/ar labels): `not-free`, `too-far`, `not-my-work`, `other`.

## Domain types (`packages/domain/src/booking/inbox.ts`)

- `OpenBriefFacts` = brief id, reference, persona ids, `BriefFacts`-derived `MatchInput` pieces, date,
  created-at, named creator id.
- `isBriefOpen(brief, { today, inboxDays, bookingStates })`.
- `briefMatchesCreator(candidate, facts, blocked)` → persona ids the creator matches (empty = no match).
- `inboxSections(rows, answers)` → `{ open, accepted, rejected }`, sorted (open: soonest date first,
  then matching specialty first, then newest; "any date" last).
- `acceptorsFirst(creators, acceptedIds)` and `preconfirm(assignments, acceptedByPersona, now)` (R5).
