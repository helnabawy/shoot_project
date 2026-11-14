# Research: Creator brief inbox (019)

Every decision below resolves an unknown from the plan's Technical Context. Code references are to
`main` at 9eea871.

## R1. One definition of "matches": reuse Quick Match step 2, inverted

- **Decision**: A new pure function `briefMatchesCreator(candidate, input)` in
  `packages/domain/src/booking/inbox.ts` calls the existing `matchCreators([candidate], input)` from
  `matching.ts` once per brief, for each of the brief's professional types. The web side builds
  `MatchInput` with the existing `briefFacts(brief, slots)` (`modules/booking/match.ts` L34) and the
  creator's own blocked days (one `availability-blocks` query for the creator over the open briefs'
  dates). The candidate is the creator's public summary from `getPublicCreators(locale,
  {listedOnly: true})`, so only live, listed creators match (FR-001, US1-S4).
- **Rationale**: Clarification Q2 asks for the same rules as step 2. Calling the same function makes
  divergence impossible, and the specialty keeps "ranks, never filters" (it sorts the inbox).
- **Alternatives**: Store a precomputed "matched creators" list on each brief. Rejected: it goes stale
  when a creator blocks a day or changes emirates (spec edge case), and it needs a writer on every
  profile change.

## R2. Which briefs are open, and the window for briefs without a date

- **Decision**: Open = `status = new` AND (`date >= today (Dubai)` OR (`date` empty AND `createdAt`
  within the last `inboxDays` days)) AND no booking for the brief in a state past `quoted`
  (`accepted`, `confirmed`, …). `inboxDays` is a new content setting
  (`site-settings.quickMatch.inboxDays`, default 30). A brief addressed to one creator (`brief.creator`)
  matches only that creator. The query reads at most 200 open briefs, newest first, before matching.
- **Rationale**: A brief with "any date" would otherwise stay open forever. A quoted-but-not-accepted
  booking leaves the brief open (the client has not committed). The spec's assumption is amended to
  say this (see spec Assumptions).
- **Alternatives**: A cron that closes old briefs. Rejected: it changes the admin's status field that
  the team uses by hand.

## R3. Storing answers: a `brief-answers` collection

- **Decision**: New collection `brief-answers` in a new module `apps/web/src/modules/inbox/`:
  `brief`, `creator` (creator-profiles), `persona`, `decision` (`accepted` | `rejected`), `reason`
  (option value), `note`, `answeredAt`, `withdrawnAt`. Unique index on (`brief`, `creator`,
  `persona`); an answer is upserted. Undo (rejected) and withdraw (accepted) set `withdrawnAt`, so the
  admin keeps the history (FR-011). Access: read admin or the creator's own user; create/update/delete
  server only (`overrideAccess` in commands). Briefs get a `join` field `answers` so the admin sees
  them on the brief record.
- **Rationale**: Answers are per creator and per type; one row each keeps the uniqueness rule in the
  database (concurrent accepts, FR-006). A new module keeps `brief` (client side) and `booking`
  (bookings) from growing a creator-inbox concern; it imports both through their `index.ts`.
- **Alternatives**: An array on the brief. Rejected: concurrent writers on one row, and the creator
  could not be given read access to their own entries only.

## R4. Rejection reasons are an option set

- **Decision**: Reasons are the existing `option-sets` collection, slug `brief-reject-reasons`
  (localised label, value, order, already supported). Seeded with four reasons ("Not free that day",
  "Too far", "Not my kind of work", "Other"). The inbox reads it with the existing option-set query.
- **Rationale**: Content-managed, bilingual and ordered with no new collection (Principle VIII).
- **Alternatives**: A `select` with fixed options. Rejected: Principle IV.

## R5. Acceptors first at step 2, and "assigned already confirmed"

- **Decision**:
  - `getMatchPage` (match.ts L113) loads the brief's current accepted answers and passes their creator
    ids per persona. A new pure `acceptorsFirst(creators, acceptedIds)` (domain `inbox.ts`) reorders each
    section after `matchCreators` (so only acceptors who still match are listed, US2-S8), and the view
    marks each with `saidYes`. Website: `CreatorPickRow` shows a "Said yes" mark. App: `matchV1`
    creators gain an optional `saidYes` (additive).
  - `acceptQuotation` (commands/client-actions.ts L36): after `startAssignments`, a new pure
    `preconfirm(assignments, acceptedByPersona, now)` sets a `pending` row whose creator accepted the
    brief for that persona to `confirmed` (`respondedAt = now`). The command then calls the existing
    `blockDateFor` for those creators; a row whose date is taken falls back to `pending` with its normal
    `respondBy` (it then lapses or is answered as today). If `allConfirmed` holds, it applies `confirm`
    right after `accept`, as the admin's confirm path in `hooks.ts` does.
  - The brief stays open until a booking for it passes `quoted`; then the other acceptors' inbox shows
    the answer as "went to another creator" (no name).
- **Rationale**: Clarification Q1. The client flow and prices are unchanged; only the order, one mark
  and the starting status of one assignment differ.
- **Alternatives**: Creating the booking when a creator accepts. Rejected: the client has not chosen.

## R6. Notifications for briefs

- **Decision**: `notifications.booking` becomes optional and a `brief` relationship is added (one of
  the two is required, checked in a hook). New events in `NOTIFICATION_EVENTS`: `brief-accepted`
  (audiences client, admin) and `brief-new` (creator). New channel `push`. The `notify` helper gains a
  brief variant `notifyBrief(payload, brief, event, {creatorIds?, vars})` in the inbox module that
  writes in-app / whatsapp / push rows with the same `dedupeKey` rule, keyed by brief id instead of
  booking revision (one push per creator and brief, US4-S6, SC-005). Templates live in
  `site-settings.quickMatch.templates` like the others (content).
- **Rationale**: One notification log for admins and members (FR-010); dedupe already exists.
- **Alternatives**: A separate brief-notifications collection. Rejected: two logs to read.

## R7. Push: Firebase Cloud Messaging for iPhone and Android

- **Decision**:
  - App: `firebase_core` and `firebase_messaging` (exact pins), iOS through FCM's APNs bridge. The app
    asks permission when it first has reason (creator opens the inbox, client sends a brief, US6-S1),
    registers the FCM token with `POST /me/push/devices`, refreshes it on `onTokenRefresh`, and removes
    it with `DELETE /me/push/devices/{token}` in `SessionCubit.signOut()` before `auth/logout`. Taps
    (`onMessageOpenedApp`, `getInitialMessage`) route to the `path` in the message data through
    `safe_next` validation. If Firebase cannot start (no config files in a build), push is off and
    nothing else changes.
  - Server: `apps/web/src/shared/push/` with a `PushProvider` interface and two providers: `fcm`
    (FCM HTTP v1 `messages:send`, OAuth2 access token from a service-account JWT signed with
    `node:crypto` RS256 and cached until expiry; no Google SDK) and `console` (logs a redacted line and
    stores the last messages in memory for tests and local runs). Chosen by `PUSH_PROVIDER`
    (`fcm` | `console` | `off`, default `off`); `FCM_SERVICE_ACCOUNT` holds the base64 JSON. A
    `NOT_FOUND`/`UNREGISTERED` answer deletes the device (FR-016). Sending runs inside Next's
    `after()` so the request that caused it never waits or fails (FR-019).
  - Config files (`GoogleService-Info.plist`, `google-services.json`) come from the owner's Firebase
    project and are not committed; the Android Gradle plugin is applied only when the file exists so
    the current CI APK build keeps working.
- **Rationale**: FCM is the one free provider covering both platforms; the HTTP v1 call is small
  enough to write with platform primitives (Principle VIII) instead of `firebase-admin` (large).
- **Alternatives**: OneSignal / Expo push (third-party service and SDK); direct APNs + FCM (two
  integrations); `flutter_local_notifications` (not needed: the OS shows FCM notification messages).

## R8. Push preference and language

- **Decision**: `users.pushEnabled` (checkbox, default true, self-or-admin). Each `push-devices` row
  stores the app's language at registration (updated on each registration and on language change), and
  the push text is rendered in that language. `GET /me/push` and `PUT /me/push` read and set the switch;
  the switch sits on the app's menu page next to Theme and Appearance, shown only when signed in.
- **Rationale**: Users have no stored language today; the device's language is the one the person reads
  the push in.

## R9. Where pushes are triggered

- **Decision**: New brief: right after `payload.create('briefs')` in both `submitBrief`
  (brief/actions.ts) and `recordBrief` (brief/commands/record-brief.ts), each calls
  `announceBrief(briefId)` from the inbox module inside `after()`. It finds the matching live creators
  with the same R1 rule, writes `brief-new` notifications (in-app and push) and sends. Acceptance:
  the `answerBrief` command writes `brief-accepted` for the client (member: in-app + push; visitor: none
  besides the private link) and admins (in-app + WhatsApp link), sending push inside `after()`.
- **Rationale**: Explicit calls from the two writers are easier to test than a collection hook that
  would also fire on seed and admin edits.

## R10. Up next and the inbox screens

- **Decision**:
  - Website: `NextUp` gains `{ kind: 'briefs'; count; brief }`; `pickNextUp` order is answer → briefs →
    profile → job → clear (a hidden profile has no briefs anyway). The panel's one action opens a new
    page `/account/inbox` (open briefs with Accept / Not for me, then "You said yes" and "Not for me"
    with Undo). Server actions in `modules/inbox/actions.ts`.
  - App: `creatorAccountV1` gains optional `briefs: { count, soonest }`; `UpNextKind` gains `briefs`
    with the same order; a new `InboxPage` + `InboxCubit` at `/account/inbox` inside
    `features/creator_account/`, with a reject sheet modelled on the existing `DeclineSheet` (reason chips
    from the API + optional note).
  - Design: there is no canvas board for the inbox. Before building, one board (inbox list, reject
    sheet, Up next "briefs" state) is drawn in the canvas with the impeccable workflow and approved by
    the owner; the app is then held to it by the pixel diff like every other screen. The website page
    follows "The Brief Bar" world and the impeccable gates.
- **Rationale**: Mirrors the existing answer flow (BookingsCubit `_run`, DeclineSheet), so both
  platforms stay alike (FR-001).

## R11. Branch and environment

- **Decision**: Implementation runs on branch `019-creator-brief-inbox` in its own worktree (the
  shared checkout stays on `main`). Database work uses the local Docker PostgreSQL or Testcontainers
  only; `apps/web/.env` points at production and is never used for migrations, seeds or test data.
