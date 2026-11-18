# Tasks: Notifications (024)

**Input**: `specs/024-notifications/spec.md`, `quickstart.md`. Small feature: no separate plan; the
design notes are inline here.

**Paths**: `W` = `apps/web/src`, `D` = `packages/domain/src`, `M` = `apps/mobile`.

**Design**: no new collection, package or migration. The `notifications` collection (feature 003)
already holds in-app rows for clients and creators. One read (`W/modules/booking/notices.ts`) serves
the website page and the API. The app gets a `features/notifications/` feature (data, domain,
cubit, page) at `/account/notifications`, the same path as the website.

## Phase 1: Contract

- [x] T001 Write failing schema tests `D/api/v1/notifications.test.ts` (`NT-US1-S1`)
- [x] T002 `noticeV1`, `noticesV1` in `D/api/v1/notifications.ts`, examples `notices.json`, `notices-read.json`, endpoints `notices` and `noticeRead` in `D/api/v1/endpoints.ts`, snapshot regenerated (additions only)

## Phase 2: Server

- [x] T003 Write failing integration test `apps/web/tests/integration/mobile-api-notifications.int.test.ts` (`NT-US1-S1`, `S2`, `S4`, `NT-US2-S2`)
- [x] T004 `myNotices`, `readNotice` in `W/modules/booking/notices.ts`; handlers in `W/modules/booking/api-notices.ts`; route files under `api/mobile/v1/me/notifications/`
- [x] T005 Website: `/account/notifications` page, a row on `/account`, `NotificationList` shows read and unread with time and link; `/account/bookings` drops the list (`NT-US3-S1`); `markNotificationRead` returns to the notifications page; strings in `messages/{en,ar}.json`

## Phase 3: App

- [x] T006 Write failing tests: `notifications_models_test.dart`, `notifications_cubit_test.dart`, `notifications_page_test.dart`, `menu_page_test.dart` (`NT-US2-S1`), `creator_views_test.dart` (`NT-US3-S1`)
- [x] T007 `M/lib/features/notifications/` (data source, model, repository, cubit, page, routes, injection), ARB strings en and ar
- [x] T008 Menu settings row "Notifications" with the unread count, signed in only
- [x] T009 Remove "Updates" from the creator's Bookings screen and the cubit's `markRead`; the v1 `updates` field and `creatorUpdateRead` endpoint stay for older apps (feature 014's `MW-US2-S7` moves here as `NT-US1-S2`)

## Phase 4: Checks

- [x] T010 `pnpm typecheck`, `pnpm lint`, the domain and booking tests, the new integration test; in `M`: `dart format`, `flutter analyze`, `flutter test`
- [ ] T011 Device walkthrough (quickstart steps 1–5) in en and ar, light and dark
- [ ] T012 Design: no canvas board exists for this screen; it reuses the Bookings screen's row style. The owner may want a board drawn and a golden added (`design-fidelity`)
