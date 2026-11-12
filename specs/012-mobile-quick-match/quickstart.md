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
| MQ-US1-S1..S9 | `apps/web/tests/integration/mobile-api-booking.int.test.ts`, `test/features/quick_match/presentation/cubit/match_cubit_test.dart`, `.../pages/quick_match_pages_test.dart` |
| MQ-US2-S1..S11 | the same integration file, `.../cubit/book_flow_cubit_test.dart`, `.../pages/quick_match_pages_test.dart` |
| MQ-US3-S1..S8 | the same integration file, `.../cubit/booking_view_cubit_test.dart`, `.../pages/quick_match_pages_test.dart` |
| MQ-US4-S1..S7 | the same files |
| MQ-US5-S1..S4 | the same files |

Not yet covered by a test: MQ-US1-S3 (the profile link keeps the choice on return) and MQ-US1-S10
(Edit reopens the brief with its answers), which need feature 010's brief screens; the pixel diff of
screens 07 to 14 and 40 (task T030).
