# Quickstart: Notifications (024)

Run against the **local** database only (`apps/web/.env` points at production). Integration tests
use Testcontainers.

## Walkthrough

1. Sign in on the app as a creator with notices. Open the menu: the settings area shows
   "Notifications" with the unread count. Tap it: the latest notices, newest first.
2. Tap an unread notice: it opens its booking, and back on Notifications it is no longer marked.
3. Open Bookings: no "Updates" group.
4. Sign in as a client whose brief a creator accepted: Notifications lists it; a tap opens step 2.
5. Repeat in Arabic and in dark theme.
6. Website: `/account` has a Notifications row; `/account/notifications` lists the same notices;
   `/account/bookings` no longer does.

## Scenario → test mapping

Every scenario is covered by a test whose name starts with its id; `pnpm check:scenarios` checks that each file named here carries it.

| Id | Scenario | Tests |
|---|---|---|
| NT-US1-S1 | Latest notices, newest first, read and unread, own only | `notifications.test.ts`, `mobile-api-notifications.int.test.ts`, `notifications_models_test.dart`, `notifications_page_test.dart` |
| NT-US1-S2 | A tap marks read and opens the target | `mobile-api-notifications.int.test.ts`, `notifications_cubit_test.dart`, `notifications_page_test.dart` |
| NT-US1-S3 | Empty state | `notifications_page_test.dart` |
| NT-US1-S4 | Signed out: 401 | `mobile-api-notifications.int.test.ts` |
| NT-US2-S1 | Menu settings row with unread count, signed in only | `menu_page_test.dart` |
| NT-US2-S2 | Website account row and page | `mobile-api-notifications.int.test.ts` |
| NT-US3-S1 | Bookings lists no notices | `creator_views_test.dart` |
