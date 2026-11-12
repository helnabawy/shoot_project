# Quickstart: validating feature 012

Prerequisites: `nvm use` (Node 24), Docker, `pnpm db:migrate`, `pnpm seed`.

1. Server: `pnpm --filter web test:int -- mobile-api-booking`; `pnpm --filter @shoot/domain test`.
2. Contract: the registry, examples and snapshot tests in `pnpm test`; the snapshot only gains.
3. App, in `apps/mobile`: `dart format --set-exit-if-changed lib test`, `flutter analyze`,
   `flutter test`; goldens with `tool/goldens.sh` on macOS.
4. By hand: record a brief on the website, open `/match/{ref}/{key}` in the app, choose, fill 09,
   sign in with the console code (`pnpm --filter web otp:last`), open WhatsApp, accept, move the
   booking in the admin and refresh.

| Scenario | Test |
|---|---|
| MQ-US1-S1..S10 | `mobile-api-booking-match.int.test.ts`, `match_cubit_test.dart`, `match_page_test.dart` |
| MQ-US2-S1..S11 | `mobile-api-booking-issue.int.test.ts`, `book_flow_cubit_test.dart`, `details_page_test.dart` |
| MQ-US3-S1..S8 | `mobile-api-booking-accept.int.test.ts`, `booking_view_cubit_test.dart` |
| MQ-US4-S1..S7 | `mobile-api-booking-status.int.test.ts`, `booking_page_test.dart` |
| MQ-US5-S1..S4 | `mobile-api-booking-delivery.int.test.ts`, `booking_page_test.dart` |
