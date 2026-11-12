---

description: "Task list for feature 012 — mobile Quick Match and booking"
---

# Tasks: Mobile Quick Match and booking

**Input**: `specs/012-mobile-quick-match/` (spec, plan, research, data-model, contracts, quickstart).

**Prerequisites**: features 007, 008, 009 merged (they are in this branch's history). Feature 011's
profile route `/creators/:code` is linked by path only; until 011 merges it shows the not-found
screen. Feature 010 owns recording a brief; this feature reads a brief by reference and key.

**Skills**: `mobile-api-contract`, `payload-cms`, `testing-strategy`, `flutter-mobile`,
`design-fidelity`, `persona-extensibility`, `ui-design`.

**Tests first** (Principle III): each phase lists its tests before the code. Test names carry the
`MQ-USn-Sm` id. Paths: `web/` = `apps/web/`, `mobile/` = `apps/mobile/`, `domain/` =
`packages/domain/src/`.

## Format: `- [ ] Tnnn [P?] [USn?] Description with path`

## Phase 1: Setup

- [x] T001 Create branch `claude/012-mobile-quick-match`; confirm `pnpm typecheck`, `flutter analyze` green on the base.
- [x] T002 [P] Add `bookings.details` group (`startTime` text HH:MM nullable, `duration` text nullable, `venue` text max 200 nullable, `note` text max 300 nullable, server-only access) in `web/src/modules/booking/collections/Bookings.ts`.
- [x] T003 Generate the committed migration `pnpm --filter web payload migrate:create booking_details` and `generate:types`; review: four nullable columns, no data change.

## Phase 2: Foundational (contract and commands)

- [x] T004 [P] Write `domain/api/v1/booking.ts` zod shapes (`matchV1`, `matchCreatorV1`, `detailsV1`, `quotationRequestV1`, `quotationIssuedV1`, `bookingViewV1`, `reportRequestV1`, `pickAnotherRequestV1`, `freshQuotationV1`) with `booking.test.ts` (details: `startTime` `^([01]\d|2[0-3]):[0-5]\d$`, `venue` 1–200, `note` ≤ 300, `reason` 5–500).
- [x] T005 [P] Add JSON examples (`match.json`, `match-none-free.json`, `quotation-request.json`, `quotation-issued.json`, `booking-view-quoted.json`, `booking-view-confirmed.json`, `booking-view-delivered.json`, `booking-view-expired.json`, `fresh-quotation.json`) in `domain/api/v1/examples/`.
- [x] T006 Register the eight endpoints in `domain/api/v1/endpoints.ts` and export `booking.ts` from `index.ts`; regenerate `specs/contracts/mobile-api/v1.schema.json` (additive only).
- [x] T007 Extract `web/src/modules/booking/commands/` from `actions.ts`: `access.ts` (private-key + owner access), `accept-quotation.ts`, `confirm-delivery.ts`, `report-problem.ts`, `fresh-quotation.ts`, `pick-another.ts`, each returning a result (`ok` or reason) instead of redirecting; rewrite the website actions in `actions.ts` as wrappers (behaviour unchanged). (Done: `commands/client-actions.ts` holds accept, cancel, fresh, pick-another, confirm-delivery and report; `commands/issue-quotation.ts` holds the quotation body; the website actions are wrappers. A repeated confirm-delivery or report is harmless, as accept already was.)
- [ ] T008 Existing website suites stay green: `pnpm --filter web test:int -- booking`. (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)

## Phase 3: User Story 1 — Choose a creator who is free (P1)

- [ ] T009 [P] [US1] Integration tests `web/tests/integration/mobile-api-booking-match.int.test.ts`: `MQ-US1-S1` (free creators, same price, includes), `S5` (blocked and booked creators hidden), `S6` (nearby days with real counts), `S7`/`S8` (date change, any date), `S9` (price on request), unknown key 404. (Done in one file, `mobile-api-booking.int.test.ts`, which also covers T016, T021, T025 and T028.) (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)
- [x] T010 [P] [US1] `web/src/modules/booking/commands/match.ts` (step 2 read over `getMatchPage`, date and duration override, nearby counts, gallery thumbs) and `web/src/modules/booking/wire.ts` mappers. (Done: the mapping is in `commands/match.ts`; `matchV1` also carries `durations` and `whatsappUrl`.)
- [x] T011 [US1] `web/src/modules/booking/api.ts` `getMatchV1` and the route `web/src/app/(payload)/api/mobile/v1/match/[ref]/[key]/route.ts`.
- [x] T012 [P] [US1] Dart: models and fixtures decoding the examples (`mobile/lib/features/quick_match/data/models/match_models.dart`, entities, repository, data source) with `test/features/quick_match/data/match_models_test.dart`.
- [x] T013 [P] [US1] `MatchCubit` (`MQ-US1-S2`, `S4`, `S8`, `S9`, `S10`) with `bloc_test`: choose, let-us-pick, change day, per-section picks, price on request.
- [ ] T014 [US1] Screens 07 and 08: `match_page.dart`, `match_card.dart` on `SnapCarousel`, `StepStrip`, `TopHit` (`MQ-US1-S3` profile link keeps the choice); widget tests incl. semantics "n of m". (Built and widget-tested (`quick_match_pages_test.dart`); open until T030 proves it against boards 07 and 08. Several carousels are built, one per type.)
- [x] T015 [US1] Routes `/match/:ref/:key` built (flip `built`), additive ARB keys `quickMatch*` en and ar.

## Phase 4: User Story 2 — Details, number at the end, WhatsApp (P1)

- [ ] T016 [P] [US2] Integration tests `mobile-api-booking-issue.int.test.ts`: `MQ-US2-S8` (issues for signed-in member, details stored, client name and number from the account), `S4` (invalid date/time/venue → 422 fields), `S10` (token required → 401), `S3` (creator no longer free → 409), idempotent no half-saved booking (R3), rate limit. (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)
- [x] T017 [US2] `commands/issue-quotation.ts` (move the body of `requestQuotation`, take client from the user, store `details`, delete the booking on failure, compose `whatsappUrl`); `api.ts` `issueQuotationV1`; route `match/[ref]/[key]/quotation/route.ts`.
- [x] T018 [P] [US2] `BookFlowCubit` (details validation `MQ-US2-S1`…`S4`, price follows duration `S2`, signed-in skips 10/11 `S10`, send code `S6`, name only for a number with no account `S7`, wrong code `S9`, verify then issue then open WhatsApp `S8`, resume to quotation `S11`).
- [ ] T019 [US2] Screens 09, 10, 11 (`details_page.dart`, `number_page.dart`, `code_page.dart`) reusing 009's `PhoneField`, `OtpCodeInput`, `RequestCode`, `VerifyCode`; routes `/match/:ref/:key/{details,number,code}` built; widget tests. (Built and widget-tested; one file `number_code_pages.dart` for 10 and 11; open until T030. The optional name on 11 is always shown, because the app cannot know before verifying whether the account has a name; MQ-US2-S7 has no test.)
- [x] T020 [US2] Open WhatsApp with `url_launcher` (web address fallback) and navigate to `/q/:ref/:key`.

## Phase 5: User Story 3 — Accept the quotation or get a fresh one (P1)

- [ ] T021 [P] [US3] Integration tests `mobile-api-booking-accept.int.test.ts`: `MQ-US3-S1` view, `S2` accept, `S3` double accept, `S4` discount line, `S5` expired view and accept refused, `S6` fresh quotation, `S7` wrong key / other account 404, `S8` let-us-pick. (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)
- [x] T022 [US3] `commands/quotation-view.ts` read model + `wire.ts` `toWireBookingView`; `api.ts` view, accept, fresh handlers; routes under `quotations/[ref]/[key]/`.
- [x] T023 [P] [US3] `BookingViewCubit` (load, accept, fresh, refresh on resume) with tests.
- [ ] T024 [US3] Screens 12 and 40 in `booking_page.dart` with `QuoteLines`, `StatusBadge`; "Download PDF" opens the website page (research R1); route `/q/:ref/:key` built. (Built and widget-tested in `booking_page.dart`; "Download PDF" opens the website's quotation page in the browser, research R1, owner decision pending; open until T030.)

## Phase 6: User Story 4 — Follow the booking and arrange payment (P2)

- [ ] T025 [P] [US4] Integration tests `mobile-api-booking-status.int.test.ts` (`MQ-US4-S1`…`S7`): confirmed → awaiting payment, paid, declined → replacements and pick-another, cancelled/on-hold reason, no payment fields. (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)
- [x] T026 [US4] `commands/pick-another` wiring and pick-another endpoint/route; progress and next-step mapping in `toWireBookingView`.
- [ ] T027 [US4] Screen 13 and the board-less states (accepted, declined or lapsed, paid, scheduled, completed, cancelled, on hold) in the same layout; WhatsApp primary; tests `MQ-US4-*`; assert no payment widgets (`MQ-US4-S6`). (Built and widget-tested in the same `booking_page.dart`; open until T030. Payment instructions from site settings are NOT yet written into the WhatsApp message: the server sends the receipt text only.)

## Phase 7: User Story 5 — Confirm delivery or report a problem (P2)

- [ ] T028 [P] [US5] Integration tests `mobile-api-booking-delivery.int.test.ts` (`MQ-US5-S1`…`S4`). (deferred to post-merge integration run; the suite is written in `mobile-api-booking.int.test.ts`)
- [x] T029 [US5] Confirm-delivery and report endpoints and routes; screen 14 and the report sheet; tests.

## Phase 8: Polish

- [ ] T030 [P] Goldens for 07–14, 40 in four variants (`tool/goldens.sh`), added to `tools/design-fidelity/shipped.json`; `pnpm fidelity` (needs macOS pinned Flutter). (Open: no goldens, no canvas references and no pixel diff were produced in this pass.)
- [ ] T031 [P] Arabic strings review, largest text size, VoiceOver and TalkBack walkthrough (device, owner). (Open: the Arabic strings are first drafts for review; no device walkthrough.)
- [ ] T032 `pnpm check:scenarios`; `dart format`, `flutter analyze`, `flutter test --coverage` (>= 80 % of changed lines); `pnpm typecheck && pnpm test`; CLAUDE.md and ROADMAP status lines.

## Dependencies

Phase 1 → 2 → US1 → US2 → US3 → US4 → US5 → Polish (US2 needs US1's cubit and routes; US3–US5 share the
view read model from T022). Server tasks inside a story run before its app tasks.

## MVP

US1 + US2 + US3 (all P1): a brief becomes a saved, accepted booking.
