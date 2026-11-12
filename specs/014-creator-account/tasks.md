# Tasks: Mobile creator account (014, test-id prefix MW-)

Format: `- [ ] Tnnn [P] [USn] description with path`. Tests first in every phase.

## Phase 1: Contract (domain)

- [ ] T001 Write `packages/domain/src/api/v1/creator-account.ts`: zod `creatorAccountV1`, `myProfileV1`, `profilePatchV1`, `uploadV1`, `sampleAddV1`, `availabilityV1`, `creatorBookingsV1`, request bodies; export from `index.ts`; test file `creator-account.test.ts` (MW-CONTRACT)
- [ ] T002 [P] Add examples `creator-account.json`, `creator-profile-draft.json`, `creator-profile-ready.json`, `creator-profile-review.json`, `creator-availability.json`, `creator-bookings.json`, `creator-upload.json`, `creator-answer.json` in `packages/domain/src/api/v1/examples/`
- [ ] T003 Register the 15 endpoints in `packages/domain/src/api/v1/endpoints.ts`, add problem codes to `problems.ts`, add rows to the 008 inventory table `specs/008-mobile-api/contracts/mobile-api.md` (required by `examples.test.ts`), regenerate `specs/contracts/mobile-api/v1.schema.json` (`pnpm --filter @shoot/domain api:snapshot`)

## Phase 2: Server commands and handlers

- [ ] T004 [US1] Integration tests `apps/web/tests/integration/mobile-api-creator-profile.int.test.ts` (MW-US1-S1 to S9: read view, patch, submit refused/accepted, identity upload type/size, 403 for clients)
- [ ] T005 [US1] Commands `modules/creators/commands/{read-my-profile,save-my-profile,upload-photo,upload-identity,add-sample,remove-sample,submit-for-review,set-visibility}.ts`, handlers `modules/creators/api-account.ts`, routes under `app/(payload)/api/mobile/v1/me/creator/{account,profile/**,identity/[kind]}`
- [ ] T006 [US2] Integration tests `mobile-api-creator-bookings.int.test.ts` (MW-US2-S1 to S8: confirm, decline with reason, lapsed, deliver, mark read, no client number)
- [ ] T007 [US2] Commands `modules/booking/commands/{creator-bookings,answer-request,deliver,mark-update-read}.ts`, handlers `modules/booking/api-creator.ts`, routes `me/creator/bookings/**`, `me/creator/updates/[id]/read`
- [ ] T008 [US4] Integration tests `mobile-api-creator-availability.int.test.ts` (MW-US4-S1 to S5, S7) and commands `modules/booking/commands/availability.ts`, routes `me/creator/availability/**`
- [ ] T009 [US3] Unit test and command `account-summary` (MW-US3-S1 to S3) feeding `creatorAccount`

## Phase 3: App data layer

- [ ] T010 Dart models decoding every example (`test/features/creator_account/data/models_test.dart`), entities, repository contract, datasource, repository returning `Result` (`lib/features/creator_account/{domain,data}`), unknown enum values decode to a safe case
- [ ] T011 Use cases and `creator_account_injection.dart`, one line in `core/di/injection.dart`; failure messages for the new codes in `core/l10n/failure_message.dart` and both ARB files

## Phase 4: App stories

- [ ] T012 [US1] Cubit tests then `ProfileCubit` (steps, save on leave, first-error step, send for review, upload via `FilePicker` port) and pages for screens 28 and 29 (`MW-US1-S1..S9`)
- [ ] T013 [US2] `BookingsCubit` tests, cubit and page for screen 32 and `/account/bookings/:ref` (`MW-US2-S1..S8`)
- [ ] T014 [US3] `AccountCubit` tests, cubit and page for screen 27 (`MW-US3-S1..S5`)
- [ ] T015 [US4] `AvailabilityCubit` tests (optimistic toggle, rollback, booked locked, month bounds), page for screen 31 and the list view (`MW-US4-S1..S7`)
- [ ] T016 [US5] Review-state page (screen 30), hide/show, not-accepted note, live-with-changes message (`MW-US5-S1..S5`)
- [ ] T017 Routes `/account` (creator branch), `/account/profile`, `/account/availability`, `/account/bookings`, flip `built` in `app_routes.dart`; route tests

## Phase 5: Polish

- [ ] T018 Screen goldens for 27 to 32 (four variants) and `pnpm fidelity` (macOS, pinned Flutter)
- [ ] T019 `pnpm check:scenarios`, `pnpm typecheck && pnpm test`, `dart format`, `flutter analyze`, `flutter test --coverage`
- [ ] T020 Camera, photo library and file picking (`image_picker`, `file_picker`): needs owner approval of the packages
- [ ] T021 Manual device walkthrough: 360 px, English and Arabic, light and dark, largest text, VoiceOver and TalkBack

## Dependencies

T001 to T003 first; T004/T006/T008/T009 before their implementations; Phase 3 needs T003 (examples);
Phase 4 needs Phase 3; US2, US3, US4 are independent of US1 on the app side.
