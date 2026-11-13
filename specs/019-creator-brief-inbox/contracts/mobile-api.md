# Contract: mobile API additions (019)

All under `/api/mobile/v1`, through `defineHandler`, registered in
`packages/domain/src/api/v1/endpoints.ts`, with zod shapes in `packages/domain/src/api/v1/inbox.ts` and
`push.ts`, one JSON example per answer in `examples/`, and the snapshot
`specs/contracts/mobile-api/v1.schema.json` regenerated. **Additive only**: no existing field changes
type or meaning; new fields on existing shapes are optional.

Errors are `application/problem+json` with message-key codes:
`creators.errors.notProvider` (403), `inbox.errors.briefClosed` (409), `inbox.errors.notMatching` (409),
`inbox.errors.reasonUnknown` (422), `push.errors.tokenInvalid` (422), `api.errors.invalidInput` (422).

## Creator inbox (auth: required, provider only, `private, no-store`)

### `GET /me/creator/briefs` (`creatorBriefs`)

```json
{
  "open": [
    {
      "ref": "BR-7K2Q",
      "persona": "p_12",
      "profession": "Photographer",
      "occasion": "a birthday party",
      "sentence": "I need a photographer for a birthday party in Dubai on 20 Nov",
      "emirate": "Dubai",
      "date": "2026-11-20",
      "sentAt": "2026-11-13T09:12:00.000Z",
      "answer": null,
      "outcome": "open"
    }
  ],
  "accepted": [ { "...": "same item, answer: \"accepted\", outcome: \"open\" | \"other-creator\" | \"booked-you\" | \"closed\"" } ],
  "rejected": [ { "...": "same item, answer: \"rejected\", reason: \"too-far\"" } ],
  "reasons": [ { "value": "not-free", "label": "Not free that day" } ]
}
```

- `profession`, `occasion`, `emirate`, reason labels: content, in `Accept-Language`.
- `date` is `null` for "date to agree". No client name, phone, email or member id, ever (FR-004).
- `accepted` and `rejected` hold the last 30 days of the creator's current answers.

### `POST /me/creator/briefs/{ref}/answer` (`answerCreatorBrief`)

Request: `{ "persona": "p_12", "decision": "accept" | "reject", "reason"?: "too-far", "note"?: "≤300 chars" }`.
`reason` and `note` only with `reject`; `reason` must be a value of `brief-reject-reasons`.

Response 200: the full `creatorBriefs` view. 409 `inbox.errors.briefClosed` when the brief is not open,
409 `inbox.errors.notMatching` when the creator no longer matches (accept only). Idempotent: repeating
the same answer returns 200 and records nothing new.

### `DELETE /me/creator/briefs/{ref}/answer?persona=p_12` (`withdrawCreatorBrief`)

Undo a rejection or withdraw an acceptance while the brief is open. Response 200: `creatorBriefs`.
409 `inbox.errors.briefClosed`; 409 `inbox.errors.alreadyPicked` when the client already picked this
creator (their booking exists past `quoted`).

### `GET /me/creator/account` (exists, `creatorAccount`) — additive field

`"briefs": { "count": 3, "soonest": { "ref": "BR-7K2Q", "profession": "Photographer", "occasion": "a birthday party", "emirate": "Dubai", "date": "2026-11-20" } }`
— optional; omitted when the profile is not live; `count: 0` and `soonest: null` when nothing waits.

## Quick Match step 2 (exists, `match`) — additive field

Each creator in `sections[].creators[]` gains optional `"saidYes": true` when they accepted this brief
for that section's persona; they are listed first in their section.

## Push (auth: required, any member, `private, no-store`)

### `POST /me/push/devices` (`registerPushDevice`)

Request: `{ "token": "<fcm token, 1–4096 chars>", "platform": "ios" | "android", "locale": "en" | "ar" }`.
Response 204. Re-registering updates `locale` and `lastSeenAt`; a token owned by another user moves to
the caller.

### `DELETE /me/push/devices/{token}` (`removePushDevice`)

Response 204, also when the token is unknown (sign-out must not fail).

### `GET /me/push` (`pushPreference`) and `PUT /me/push` (`setPushPreference`)

`{ "enabled": true }` both ways.

## Push message (FCM payload, server → device)

```json
{
  "notification": { "title": "<localised>", "body": "<localised, no phone/email/client name>" },
  "data": { "event": "brief-new" | "brief-accepted", "path": "/account/inbox" | "/match/BR-7K2Q/<key>" }
}
```

The app opens `data.path` only after `safe_next` validates it.

## Website (server actions, not part of v1)

`modules/inbox/actions.ts`: `answerBriefAction(form)` and `withdrawBriefAction(form)` wrap the same
commands (`modules/inbox/commands/answer-brief.ts`, `withdraw-answer.ts`) and revalidate `/account` and
`/account/inbox`.
