# Quickstart: Creator brief inbox (019)

Run everything against the **local** database only. `apps/web/.env` points at the production
database; before any command below, point `DATABASE_URI` at the local Docker PostgreSQL (with the
owner's consent) or run the Testcontainers suites, which start their own database.

## Prerequisites

```bash
nvm use
docker compose up -d postgres
pnpm install
pnpm db:migrate        # applies <ts>_brief_inbox
pnpm seed              # seeds brief-reject-reasons and the new templates
PUSH_PROVIDER=console pnpm dev
```

## Walkthrough

1. Sign in as a live creator (seeded provider) on the website; `/account` shows Up next "N new briefs".
2. In another browser, send a brief that matches them (their type, emirate, a free date).
3. Reload `/account`: the count rises; open the inbox; Accept. The dev console shows the
   `brief-accepted` push line for the client (if the client is a member with a device) and an admin
   notification is in `/admin/collections/notifications`.
4. Open the client's step-2 link: the creator is first, marked "Said yes". Continue, accept the
   quotation: the booking's assignment for that creator is `confirmed` at once.
5. With another matching creator, reject a brief with a reason; it moves to "Not for me"; Undo brings it
   back.
6. App (`apps/mobile`, simulator, `--dart-define=API_BASE_URL=http://localhost:3000`): sign in as the
   creator, the account screen's Up next shows the same count; Accept and Reject work the same. With a
   Firebase config present, allow push and send a brief: a push arrives and opens the inbox.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm check:scenarios
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test
```

## Scenario → test mapping

| Id | Scenario | Tests |
|---|---|---|
| BI-US1-S1 | Up next shows the waiting count and the soonest matching brief | `inbox-queries.int.test.ts`, `account-home.test.ts`, `AccountHome.inbox.test.tsx`, `account_cubit_test.dart` |
| BI-US1-S2 | Wrong type, emirate, blocked or booked date, or unmet filter: not shown | `inbox.test.ts`, `inbox-queries.int.test.ts` |
| BI-US1-S3 | Occasion, type, emirate, date and sent time; never client contact | `inbox-queries.int.test.ts`, `mobile-api-inbox.int.test.ts` |
| BI-US1-S4 | A hidden profile sees no briefs; Up next keeps the profile message | `inbox-queries.int.test.ts`, `account-home.test.ts` |
| BI-US1-S5 | Bookings waiting for an answer come before briefs | `account-home.test.ts`, `account_cubit_test.dart` |
| BI-US1-S6 | Nothing matching: Up next is clear | `account-home.test.ts`, `account_cubit_test.dart` |
| BI-US1-S7 | The app shows the same briefs and counts as the website | `mobile-api-inbox.int.test.ts`, `inbox_cubit_test.dart`, `inbox_page_test.dart` |
| BI-US2-S1 | Accepting records the answer and leaves the waiting count | `inbox-commands.int.test.ts`, `inbox_cubit_test.dart`, `InboxList.test.tsx` |
| BI-US2-S2 | Several creators accept the same brief | `inbox-commands.int.test.ts` |
| BI-US2-S3 | Step 2 lists acceptors first, marked "said yes" | `inbox.test.ts`, `booking-match-acceptors.int.test.ts`, `mobile-api-inbox.int.test.ts` |
| BI-US2-S4 | Picked acceptor starts confirmed after the quotation is accepted | `inbox.test.ts`, `booking-match-acceptors.int.test.ts` |
| BI-US2-S5 | Picking a non-acceptor or "let us choose" follows today's flow | `booking-match-acceptors.int.test.ts` |
| BI-US2-S6 | Booked with another creator: "went to another creator" | `inbox-queries.int.test.ts` |
| BI-US2-S7 | Closed or booked brief: accept refused with a plain message | `inbox-commands.int.test.ts`, `inbox_cubit_test.dart` |
| BI-US2-S8 | An acceptor no longer free leaves the client's list | `booking-match-acceptors.int.test.ts` |
| BI-US2-S9 | Withdrawing an acceptance before being picked | `inbox-commands.int.test.ts`, `inbox_cubit_test.dart` |
| BI-US3-S1 | Rejected brief no longer appears, on web and app | `inbox-commands.int.test.ts`, `mobile-api-inbox.int.test.ts` |
| BI-US3-S2 | Reason optional, from the content list, in both languages | `inbox-commands.int.test.ts`, `RejectForm.test.tsx`, `inbox_page_test.dart` |
| BI-US3-S3 | Others still see it; the client is not told | `inbox-commands.int.test.ts` |
| BI-US3-S4 | Undo a rejection while the brief is open | `inbox-commands.int.test.ts`, `inbox_cubit_test.dart` |
| BI-US4-S1 | Admin sees who accepted and rejected; admin notified with a WhatsApp link | `inbox-notify.int.test.ts` |
| BI-US4-S2 | Member client gets one push in their language; tap opens step 2 | `inbox-notify.int.test.ts`, `push_tap_test.dart` |
| BI-US4-S3 | Member client gets an in-app notification | `inbox-notify.int.test.ts`, `account_models_test.dart` |
| BI-US4-S4 | The private link shows who said yes | `booking-match-acceptors.int.test.ts` |
| BI-US4-S5 | Push off or no device: no push, in-app still works | `inbox-notify.int.test.ts` |
| BI-US4-S6 | At most one push per creator and brief | `inbox-notify.int.test.ts` |
| BI-US4-S7 | A push never contains a phone, email or the client's name | `inbox-notify.int.test.ts`, `push-text.test.ts` |
| BI-US5-S1 | New brief: one push to each matching creator, in their language | `inbox-announce.int.test.ts` |
| BI-US5-S2 | Named-creator brief pushes only that creator | `inbox-announce.int.test.ts` |
| BI-US5-S3 | Non-matching, hidden or push-off creators get none | `inbox-announce.int.test.ts` |
| BI-US5-S4 | Expired device is forgotten; the brief is still saved | `push-fcm.test.ts`, `inbox-announce.int.test.ts` |
| BI-US6-S1 | The app asks permission once, with a reason | `push_cubit_test.dart` |
| BI-US6-S2 | Allowing registers the device; sign-out removes it | `push-devices.int.test.ts`, `push_cubit_test.dart`, `session_cubit_test.dart` |
| BI-US6-S3 | Push switched off: nothing is sent until on again | `push-devices.int.test.ts`, `inbox-notify.int.test.ts`, `menu_page_test.dart` |
| BI-SC-001 | Inbox read completes in under 2 s with 200 open briefs | `inbox-queries.int.test.ts` |
| BI-SC-002 | 100 % of shown briefs satisfy every rule, none expose contact details | `inbox.test.ts`, `inbox-queries.int.test.ts` |
| BI-SC-005 | Exactly one push per eligible device, none with push off | `inbox-notify.int.test.ts`, `inbox-announce.int.test.ts` |

Test locations: domain `packages/domain/src/booking/inbox.test.ts`; web integration
`apps/web/tests/integration/*.int.test.ts`, `apps/web/tests/integration/push-*.int.test.ts, apps/web/src/modules/push/**/*.test.ts`,
`apps/web/tests/integration/booking-match-acceptors.int.test.ts`; web components beside their
components; app `apps/mobile/test/features/creator_account/` and `apps/mobile/test/core/push/`.
