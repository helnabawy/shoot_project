# Quickstart: validating feature 012

Prerequisites: `nvm use` (Node 24), Docker, `pnpm db:migrate`, `pnpm seed`.

1. Server: `pnpm --filter web test:int -- mobile-api-booking`; `pnpm --filter @shoot/domain test`.
2. Contract: the registry, examples and snapshot tests in `pnpm test`; the snapshot only gains.
3. App, in `apps/mobile`: `dart format --set-exit-if-changed lib test`, `flutter analyze`,
   `flutter test`; goldens with `tool/goldens.sh` on macOS.
4. By hand: record a brief on the website, open `/match/{ref}/{key}` in the app, choose, fill 09,
   sign in with the console code (`pnpm --filter web otp:last`), open WhatsApp, accept, move the
   booking in the admin and refresh.

## Scenario → test mapping

| Id | Scenario | Tests |
|---|---|---|
| MQ-US1-S1 | Free creators of the brief, one fixed price, what it includes | `mobile-api-booking.int.test.ts`, `match_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US1-S2 | Swiping or tapping chooses; the action follows | `match_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US1-S4 | Not sure? Let us pick | `match_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US1-S5 | A blocked or booked creator is not shown | `mobile-api-booking.int.test.ts` |
| MQ-US1-S6 | No one free: the nearest other days with counts | `mobile-api-booking.int.test.ts`, `match_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US1-S7 | Picking another day changes only the date | `mobile-api-booking.int.test.ts`, `match_cubit_test.dart` |
| MQ-US1-S8 | Any date lists every matching creator | `mobile-api-booking.int.test.ts` |
| MQ-US1-S9 | No price rule: price on request | `mobile-api-booking.int.test.ts`, `match_cubit_test.dart` |
| MQ-US2-S1 | Details carry over from the brief; no number asked | `book_flow_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US2-S2 | Another duration reprices | `mobile-api-booking.int.test.ts`, `book_flow_cubit_test.dart` |
| MQ-US2-S3 | A creator no longer free is not issued | `mobile-api-booking.int.test.ts` |
| MQ-US2-S4 | Missing or past details are marked; nothing is sent | `mobile-api-booking.int.test.ts`, `book_flow_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US2-S5 | The number is asked on its own screen | `quick_match_pages_test.dart` |
| MQ-US2-S6 | Send code through the chosen channel | `book_flow_cubit_test.dart` |
| MQ-US2-S8 | One tap signs in, saves the quotation, opens WhatsApp | `mobile-api-booking.int.test.ts`, `book_flow_cubit_test.dart` |
| MQ-US2-S9 | A wrong code saves nothing | `book_flow_cubit_test.dart` |
| MQ-US2-S10 | A signed-in person skips 10 and 11 | `mobile-api-booking.int.test.ts`, `book_flow_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US2-S11 | Back from WhatsApp the quotation shows | `quick_match_pages_test.dart` |
| MQ-US3-S1 | The quotation shows lines, total, professional, validity | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US3-S2 | Accepting moves the booking to accepted | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US3-S3 | Accepting twice is one booking | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart` |
| MQ-US3-S5 | An expired quotation cannot be accepted | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US3-S6 | A fresh quotation starts step 2 again | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart` |
| MQ-US3-S7 | A wrong key is the not-found screen | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US3-S8 | Let us pick: the team is choosing | `mobile-api-booking.int.test.ts` |
| MQ-US4-S1 | Confirmed: awaiting payment, progress, chat | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US4-S2 | The chat opens with the booking written in | `quick_match_pages_test.dart` |
| MQ-US4-S3 | Paid is a state the team recorded | `mobile-api-booking.int.test.ts` |
| MQ-US4-S4 | Declined: another free creator at the same price | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart` |
| MQ-US4-S5 | On hold shows its reason and the chat | `quick_match_pages_test.dart` |
| MQ-US4-S6 | No way to pay in the app | `mobile-api-booking.int.test.ts`, `quick_match_pages_test.dart`, `booking.test.ts` |
| MQ-US4-S7 | Date changes go to the chat | `quick_match_pages_test.dart` |
| MQ-US5-S1 | Delivered: confirm and report offered | `mobile-api-booking.int.test.ts`, `quick_match_pages_test.dart` |
| MQ-US5-S2 | Confirming completes it | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart` |
| MQ-US5-S3 | A reported problem puts it on hold | `mobile-api-booking.int.test.ts`, `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| MQ-US5-S4 | Confirming is not offered once completed | `mobile-api-booking.int.test.ts` |

Not yet covered by a test (SC-007 is open for these): MQ-US1-S3 (the profile link keeps the choice
on return, needs feature 011's profile screen), MQ-US1-S10 (Edit reopens the brief, needs 010's
brief screen), MQ-US2-S7 (the optional name on 11), MQ-US3-S4 (a promo discount line) and the pixel
diff of screens 07 to 14 and 40 (task T030).
