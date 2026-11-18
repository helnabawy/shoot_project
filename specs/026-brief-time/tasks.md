# Tasks: Start time in the brief (026)

**Input**: `spec.md`, `plan.md`, `quickstart.md`. **Paths**: `W` = `apps/web/src`, `D` =
`packages/domain/src`, `M` = `apps/mobile`.

## Phase 1: Domain and contract

- [x] T001 Failing tests `D/brief/time.test.ts` (`BT-US1-S2`, `BT-US2-S1`, `BT-US3-S1`)
- [x] T002 `D/brief/time.ts` (`startTimeOf`, `withTimeToken`, `isolateLtr`), `SlotKind` `time`, export `./brief/time`
- [x] T003 `slotKindV1` adds `time`, `matchV1.brief.startTime` (optional); tests in `site.test.ts`, `booking.test.ts`; snapshot regenerated (additions only)

## Phase 2: Website and CMS

- [x] T004 Failing tests `W/modules/brief/config.test.ts`, `submit.test.ts` (`BT-US1-S1`…`S4`, `BT-US2-S1`, `BT-US3-S1`)
- [x] T005 Site settings tab "Start time" (`briefTime`), `withBriefTime` in `config.ts`, `queries.ts` wiring with fallback words (`messages/{en,ar}.json` `brief.time.*`)
- [x] T006 `submit.ts`: waived time without a date, `startTime` on the parsed brief; an unset time always left out of the sentence
- [x] T007 Briefs `startTime` (server only, through the hook's context); `send-brief.ts`, `record-brief.ts`
- [x] T008 Booking: `matchView` `brief.startTime`; `issue-quotation.ts` keeps the brief's time when no details are sent (website)
- [x] T009 Failing component test `BriefBuilder.time.test.tsx`, then the builder: waived step, step count, clock skip row, LTR token and rows, "pick a time" prompt
- [x] T010 Migration `20261118_184004_brief_time` (columns; "Start times" option set created and linked; words in en/ar), `payload-types.ts` regenerated, seed (`start-times`, `briefTime`), delete guard on the linked option set
- [x] T011 Integration test `tests/integration/brief-time.int.test.ts` (`BT-US2-S1`, `BT-US2-S2`, `BT-US3-S1`, `BT-US3-S2`)

## Phase 3: App

- [x] T012 Failing tests: `brief_engine_test.dart`, `brief_bar_test.dart`, `brief_data_test.dart`, `site_models_test.dart`, `book_flow_cubit_test.dart`
- [x] T013 `SlotKind.time`; `BriefEngine` waives the time with any date (`timeWaived`, `askedSlots`), "any date" clears the date and the time; bar counts asked steps and isolates time rows; `briefRecordBody` leaves a waived time out
- [x] T014 `MatchPage.briefStartTime`; `BookFlowCubit.begin(startTime:)` fills an empty time

## Phase 4: Checks

- [x] T015 `pnpm typecheck && pnpm lint && pnpm test`, `pnpm check:scenarios`; in `M`: `dart format --set-exit-if-changed lib test`, `flutter analyze`, `flutter test`

## Open

- [ ] T016 The owner confirms the clarifications (list of times, "any time", any date, wording)
- [ ] T017 Browser walkthrough on a local database (quickstart 1–9), 360/768/1024/1440 px, en/ar, light/dark; impeccable detector and finish review on the builder
- [ ] T018 Device walkthrough of the app (iPhone, Android, VoiceOver/TalkBack); goldens if a board is drawn for the step
- [ ] T019 Playwright e2e for the time step
