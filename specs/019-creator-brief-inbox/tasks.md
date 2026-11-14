---
description: "Task list for feature 019 creator brief inbox"
---

# Tasks: Creator brief inbox

**Input**: `specs/019-creator-brief-inbox/` (spec, plan, research R1–R11, data-model, contracts/mobile-api.md, quickstart).

**Tests**: Required (constitution III). Every `BI-` scenario in quickstart.md has a test that is written
first and fails before the code it covers. Integration tests run on Testcontainers PostgreSQL; never
against `apps/web/.env`'s production database.

**Skills**: `payload-cms` (collections, migration, seeds), `nextjs-frontend` + `ui-design` + `impeccable`
(web UI), `mobile-api-contract` (endpoints, shapes), `flutter-mobile` + `design-fidelity` (app),
`persona-extensibility` (no profession in code or ARB), `testing-strategy` (before every test).

## Format: `- [ ] Tnnn [P?] [USn?] Description with path`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[USn]**: the spec's user story.

## Phase 1: Setup

- [X] T001 Create the worktree on branch `019-creator-brief-inbox` from `main` (the shared checkout stays on `main`), run `nvm use && pnpm install`, and confirm `DATABASE_URI` for every local command points at the Docker PostgreSQL (`docker compose up -d postgres`), never the production URL in `apps/web/.env`
- [X] T002 [P] Append `node scripts/check-scenario-tests.mjs specs/019-creator-brief-inbox/quickstart.md` to the `check:scenarios` script in `package.json`
- [X] T003 [P] Document `PUSH_PROVIDER` (`fcm` | `console` | `off`, default `off`) and `FCM_SERVICE_ACCOUNT` (base64 service-account JSON) in `.env.example`, and add both to the env validation in `apps/web/src/shared/lib/env.ts`: `FCM_SERVICE_ACCOUNT` required only when `PUSH_PROVIDER=fcm`
- [ ] T004 [P] Ask the owner for the Firebase project inputs (iOS + Android apps, APNs key uploaded, `GoogleService-Info.plist`, `google-services.json`, service-account JSON); record in `specs/019-creator-brief-inbox/plan.md` Delivery notes when received. Nothing below blocks on them

## Phase 2: Foundational (blocks every story)

### Domain rules (tests first)

- [X] T005 [P] Write failing unit tests `BI-US1-S2`, `BI-SC-002`, `BI-US2-S3`, `BI-US2-S4` in `packages/domain/src/booking/inbox.test.ts` for `isBriefOpen`, `briefMatchesCreator`, `inboxSections`, `acceptorsFirst`, `preconfirm` (research R1, R2, R5; data-model "Domain types")
- [X] T006 Implement `packages/domain/src/booking/inbox.ts`: `isBriefOpen(brief, {today, inboxDays, bookingStates})` (open = status `new` AND (date ≥ today OR (no date AND createdAt within `inboxDays`)) AND no booking past `quoted`); `briefMatchesCreator(candidate, facts, blocked)` returning the persona ids matched, built on `matchCreators`; a named-creator brief matches only that creator; `inboxSections` sorting open by soonest date, then matching specialty, then newest, "any date" last; `acceptorsFirst`; `preconfirm` (pending row of an accepting creator → `confirmed`, `respondedAt = now`). Export from `packages/domain/src/booking/index.ts`; 100 % coverage
- [X] T007 [P] Add events `brief-accepted` (audiences client, admin) and `brief-new` (creator) and channel `push` to `packages/domain/src/booking/notifications.ts` (`NOTIFICATION_EVENTS`, `AUDIENCES`, `Channel`), with a brief-scoped `briefDedupeKey(briefId, event, audience, channel, recipient)` = `brief:<briefId>:<event>:<audience>:<channel>:<recipient>`; tests in `notifications.test.ts`

### API shapes

- [X] T008 [P] Add zod shapes in `packages/domain/src/api/v1/inbox.ts` (`creatorBriefsV1`, `briefItemV1`, `briefAnswerRequestV1` with `decision: 'accept' | 'reject'`, `reason?`, `note?` max 300, `persona`) and `packages/domain/src/api/v1/push.ts` (`pushDeviceRequestV1` with `token` 1–4096 chars, `platform: 'ios' | 'android'`, `locale: 'en' | 'ar'`; `pushPreferenceV1 { enabled }`) per `contracts/mobile-api.md`; add optional `briefs` to `creatorAccountV1` in `creator-account.ts` and optional `saidYes` to the match creator shape in `booking.ts`
- [X] T009 Register the endpoints `creatorBriefs`, `answerCreatorBrief`, `withdrawCreatorBrief`, `registerPushDevice`, `removePushDevice`, `pushPreference`, `setPushPreference` in `packages/domain/src/api/v1/endpoints.ts`; add examples `examples/creator-briefs.json`, `creator-briefs-answered.json`, `creator-brief-answer.json`, `push-device.json`, `push-preference.json`, and extend `creator-account.json` / a match example with the new optional fields; regenerate `specs/contracts/mobile-api/v1.schema.json` with `pnpm --filter @shoot/domain api:snapshot` and confirm the additive-only check passes
- [X] T010 [P] Add the message keys (problem codes) `inbox.errors.briefClosed`, `inbox.errors.notMatching`, `inbox.errors.reasonUnknown`, `inbox.errors.alreadyPicked`, `push.errors.tokenInvalid` to `packages/domain/src/api/v1/problems.ts` and `apps/web/messages/{en,ar}.json`

### Schema and migration

- [X] T011 Create `apps/web/src/modules/inbox/collections/BriefAnswers.ts` (slug `brief-answers`): `brief` (required, indexed), `creator` → creator-profiles (required, indexed), `persona` → personas (required), `decision` select `accepted` | `rejected` (required), `reason` text (only with `rejected`), `note` textarea max 300 (only with `rejected`), `answeredAt` date, `withdrawnAt` date nullable; unique compound index (`brief`, `creator`, `persona`); access read admin or the creator's own user, create/update/delete none; admin group "Brief builder", read-only. Module skeleton `apps/web/src/modules/inbox/index.ts`
- [X] T012 [P] Create `apps/web/src/modules/push/collections/PushDevices.ts` (slug `push-devices`): `user` (required, indexed), `token` (required, unique), `platform` select `ios` | `android` (required), `locale` select `en` | `ar` (required, default `en`), `lastSeenAt` date; access read admin, everything else none. Module skeleton `apps/web/src/modules/push/index.ts`
- [X] T013 Change `apps/web/src/modules/booking/collections/Notifications.ts`: `booking` no longer required; add `brief` → briefs (indexed); a `beforeValidate` hook requiring exactly one of `booking`/`brief`; event and channel options follow T007
- [X] T014 [P] Add `answers` (`join` on `brief-answers.brief`) to `apps/web/src/modules/brief/collections/Briefs.ts`; add `pushEnabled` (checkbox, default `true`, read/update self or admin) to `apps/web/src/modules/auth/collections/Users.ts`; add `quickMatch.inboxDays` (number, default 30, min 1) and the localised `brief-accepted` / `brief-new` templates (variables `{occasion}`, `{type}`, `{emirate}`, `{date}`, `{creator}`, never `{phone}` or `{client}`) to the site-settings global
- [X] T015 Register both collections in `apps/web/src/payload.config.ts`; run `pnpm --filter web payload generate:types`; create the migration with `pnpm db:migration:create brief_inbox` against the local database only; review it for data loss (only additions and the dropped `NOT NULL` on `notifications.booking_id`); add an access test for both collections in `apps/web/tests/integration/inbox-access.int.test.ts`
- [X] T016 [P] Seed the option set `brief-reject-reasons` (`not-free` "Not free that day", `too-far` "Too far", `not-my-work` "Not my kind of work", `other` "Other", with Arabic labels), `inboxDays: 30` and the new templates (en and ar) in the seed scripts under `apps/web/src/shared/payload/seed/`

### Design (gate for every UI task)

- [X] T017 Draw one canvas board for the inbox (open list with Accept / Not for me, "You said yes" and "Not for me" groups with Undo, the reject sheet with reason chips and note, the Up next "briefs" state) with the `impeccable` workflow in `specs/design-system/canvas/` and add it to `manifest.json` (`design-fidelity` skill); website variant in "The Brief Bar" world. **Owner approves the board before T025 and T031**

**Checkpoint**: domain green, schema migrated locally, contracts snapshot updated, board approved.

## Phase 3: User Story 1 — See the briefs that match me (P1) 🎯 MVP

**Goal**: a live creator sees matching open briefs in Up next and on the inbox, web and app.
**Independent test**: one live creator, matching and non-matching briefs; only matching ones show, without contact details.

- [X] T018 [P] [US1] Write failing integration tests `BI-US1-S1`, `BI-US1-S2`, `BI-US1-S3`, `BI-US1-S4`, `BI-US2-S6`, `BI-SC-002`, `BI-SC-001` in `apps/web/tests/integration/inbox-queries.int.test.ts` (inbox read for a creator with 200 open briefs completes in < 2 s on the test database; open window, wrong type/emirate/blocked/booked/filter, named-creator brief, hidden profile, no contact fields in the view, "went to another creator")
- [X] T019 [P] [US1] Write failing unit tests `BI-US1-S1`, `BI-US1-S4`, `BI-US1-S5`, `BI-US1-S6` for the `briefs` kind in `apps/web/src/modules/auth/account-home.test.ts`
- [X] T020 [US1] Implement `apps/web/src/modules/inbox/queries.ts`: `inboxView(user, locale, now)` (≤ 200 open briefs newest first, `briefFacts` with the landing slots, the creator's public summary from `getPublicCreators(locale, {listedOnly: true})`, one `availability-blocks` query for the creator over the briefs' dates, current answers, then `briefMatchesCreator` and `inboxSections`; items carry `ref`, `persona`, `profession`, `occasion`, `sentence`, `emirate`, `date`, `sentAt`, `answer`, `outcome`, never client fields) and `briefsSummary(user, locale, now)` → `{count, soonest}`; export through `index.ts` (import `booking`, `brief`, `creators` only through their `index.ts`)
- [X] T021 [US1] Add `{ kind: 'briefs'; count; brief }` to `NextUp` and the order answer → briefs → profile → job → clear in `apps/web/src/modules/auth/account-home.ts`; load `briefsSummary` in `apps/web/src/app/(site)/[locale]/account/page.tsx` for providers
- [X] T022 [P] [US1] Write failing component test `BI-US1-S1` in `apps/web/src/modules/auth/components/AccountHome.inbox.test.tsx`, then render the `briefs` case in `NextUpPanel` (`AccountHome.tsx`): count, the soonest brief's occasion, type, emirate, date, one action to `/account/inbox`; keys `account.next.briefsTitle`, `briefsBody`, `briefsAction` in `apps/web/messages/{en,ar}.json` (ICU plurals, Arabic forms)
- [X] T023 [US1] Create `apps/web/src/app/(site)/[locale]/account/inbox/page.tsx` (provider only, else redirect to `/account`) and `apps/web/src/modules/inbox/components/{InboxList,BriefCard}.tsx` rendering open briefs (read-only in this story), empty state, en/ar, light/dark, logical CSS, per the approved board; messages `inbox.*`
- [X] T024 [P] [US1] Write failing contract/integration test `BI-US1-S3`, `BI-US1-S7` in `apps/web/tests/integration/mobile-api-inbox.int.test.ts`, then implement `creatorBriefsV1` handler in `apps/web/src/modules/inbox/api.ts` (`defineHandler`, auth required, provider only → 403 `creators.errors.notProvider`, `private, no-store`) and route `apps/web/src/app/(payload)/api/mobile/v1/me/creator/briefs/route.ts` (one-line re-export); add `briefs` to `creatorAccount` in `apps/web/src/modules/booking/commands/creator.ts`
- [X] T025 [P] [US1] App data: `apps/mobile/lib/features/creator_account/domain/entities/inbox.dart` (Equatable: `BriefItem`, `CreatorInbox`, `RejectReason`), models in `data/models/creator_account_models.dart` (`CreatorInboxModel.fromJson` over `creator-briefs.json`; `CreatorAccountModel` reads optional `briefs`), `briefs()` in the remote data source and repository; model tests in `test/features/creator_account/data/`
- [X] T026 [US1] App Up next: write failing `bloc_test` `BI-US1-S1`, `BI-US1-S5`, `BI-US1-S6` in `test/features/creator_account/cubit/account_cubit_test.dart`; add `UpNextKind.briefs` with order answerRequest → briefs → finishProfile → markDelivered → none in `presentation/cubit/account_cubit.dart`; render it in `_UpNext` (`presentation/pages/account_page.dart`) with a `TopHit` to `AppRoutes.accountInbox`
- [X] T027 [US1] App inbox (read): `InboxCubit` in `presentation/cubit/inbox_cubit.dart` (`load`, states loading/failed/loaded); `InboxPage`/`InboxView` in `presentation/pages/inbox_page.dart` per the board; route `/account/inbox` (`creatorOnly`) in `creator_account_routes.dart` and `AppRoutes` (`accountInbox`, table entry `auth: true, built: true`); register in `creator_account_injection.dart`; ARB keys `inbox*` in `app_{en,ar}.arb` (no profession words); tests `BI-US1-S7` in `test/features/creator_account/cubit/inbox_cubit_test.dart` and `presentation/inbox_page_test.dart` (en and ar)

**Checkpoint**: US1 complete on web and app.

## Phase 4: User Story 2 — Accept a brief (P1)

**Goal**: creators accept; step 2 lists acceptors first; a picked acceptor starts confirmed.
**Independent test**: two creators accept one brief; step 2 shows both first with "said yes"; the client picks one and accepts the quotation; that assignment is `confirmed`.

- [X] T028 [P] [US2] Write failing tests `BI-US2-S1`, `BI-US2-S2`, `BI-US2-S7`, `BI-US2-S9` in `apps/web/tests/integration/inbox-commands.int.test.ts` (accept records once, idempotent repeat, two creators, closed/booked → `inbox.errors.briefClosed`, no longer matching → `inbox.errors.notMatching`, withdraw before picked, `inbox.errors.alreadyPicked` after)
- [X] T029 [US2] Implement `apps/web/src/modules/inbox/commands/answer-brief.ts` (`answerBrief(ctx, {ref, persona, decision, reason?, note?})`: re-check open (R2) and, for accept, matching (R1); upsert on the unique (`brief`, `creator`, `persona`) row, clearing `withdrawnAt`; returns the inbox view) and `commands/withdraw-answer.ts`; server actions `answerBriefAction`, `withdrawBriefAction` in `modules/inbox/actions.ts` revalidating `/account` and `/account/inbox`
- [X] T030 [US2] Web UI: Accept (primary) and Withdraw on `BriefCard.tsx`, "You said yes" group with `outcome` labels (open / went to another creator / booked you / closed) in `InboxList.tsx`; component test `BI-US2-S1` in `apps/web/src/modules/inbox/components/InboxList.test.tsx`
- [X] T031 [P] [US2] Mobile endpoints: handlers `answerCreatorBriefV1` (POST) and `withdrawCreatorBriefV1` (DELETE `?persona=`) in `modules/inbox/api.ts`, route `apps/web/src/app/(payload)/api/mobile/v1/me/creator/briefs/[ref]/answer/route.ts`; contract cases in `mobile-api-inbox.int.test.ts`
- [X] T032 [P] [US2] Write failing tests `BI-US2-S3`, `BI-US2-S4`, `BI-US2-S5`, `BI-US2-S8`, `BI-US4-S4` in `apps/web/tests/integration/booking-match-acceptors.int.test.ts`
- [X] T033 [US2] Step 2: in `apps/web/src/modules/booking/match.ts` `getMatchPage` load the brief's current accepted answers (through the inbox module's `index.ts`) and apply `acceptorsFirst` per section after `matchCreators`; carry `saidYes` through `views.ts` `matchView`, `components/CreatorPickRow.tsx` (a "Said yes" mark, messages `booking.match.saidYes` en/ar) and the mobile `commands/match.ts` (`saidYes` optional field)
- [X] T034 [US2] Preconfirm: in `apps/web/src/modules/booking/commands/client-actions.ts` `acceptQuotation`, after `startAssignments`, apply `preconfirm` for creators with a current accepted answer for that persona; call `blockDateFor` for them (a taken date puts the row back to `pending` with its `respondBy`); if `allConfirmed`, apply `confirm` right after `accept`; the existing `booking-*.int.test.ts` suites stay green
- [X] T035 [US2] App accept: `answer(ref, persona, accept)` and `withdraw(ref, persona)` in the data source and repository; `InboxCubit.accept` / `withdraw` with the `_run` busy/failure pattern of `BookingsCubit`; buttons on the inbox card; tests `BI-US2-S1`, `BI-US2-S7`, `BI-US2-S9` in `inbox_cubit_test.dart` and `inbox_page_test.dart`
- [X] T036 [P] [US2] App step 2: read optional `saidYes` in the quick_match match model and show the "said yes" mark on the creator card in `apps/mobile/lib/features/quick_match/` (ARB `quickMatchSaidYes`); widget test `BI-US2-S3` in `test/features/quick_match/`

**Checkpoint**: MVP (US1 + US2) shippable without push.

## Phase 5: User Story 3 — Reject a brief (P2)

**Goal**: hide a brief for one creator, with an optional reason, undoable.
**Independent test**: reject with and without a reason; gone for that creator only; undo restores; admin reads the reason.

- [X] T037 [P] [US3] Write failing tests `BI-US3-S1`, `BI-US3-S2`, `BI-US3-S3`, `BI-US3-S4` in `inbox-commands.int.test.ts` (reason must be a `brief-reject-reasons` value else `inbox.errors.reasonUnknown`; note ≤ 300; other creators unaffected; no client notification row; undo while open)
- [X] T038 [US3] Extend `answer-brief.ts` for `reject` (reason and note only with `rejected`) and `withdraw-answer.ts` for undo; include `reasons` (option set `brief-reject-reasons`, localised, ordered) in `inboxView`
- [X] T039 [US3] Web: `apps/web/src/modules/inbox/components/RejectForm.tsx` (disclosure with reason radios and note, "Not for me" secondary action) and the "Not for me" group with Undo in `InboxList.tsx`; component test `BI-US3-S2` in `RejectForm.test.tsx`
- [X] T040 [US3] App: `presentation/widgets/reject_sheet.dart` modelled on `DeclineSheet` (reason chips from the API, optional note, send); `InboxCubit.reject` and undo; the rejected group; tests `BI-US3-S2`, `BI-US3-S4` in `inbox_cubit_test.dart` and `inbox_page_test.dart`

## Phase 6: User Story 4 — The client and the team know who accepted (P2)

**Goal**: acceptance reaches the admins (in-app + WhatsApp link), the member client (in-app + push) and every client (private link).
**Independent test**: after an acceptance, admin and client notification rows exist once each, the console provider logged one push per client device, and step 2 shows the creator.

- [X] T041 [P] [US4] Write failing tests for the push sender `BI-US5-S4` in `apps/web/src/modules/push/providers/fcm.test.ts` (JWT signed with RS256 via `node:crypto`, token cached until expiry, `messages:send` body, `UNREGISTERED`/`NOT_FOUND` deletes the device, network errors swallowed and logged without token or PII) and `apps/web/src/modules/push/push-text.test.ts` `BI-US4-S7`
- [X] T042 [US4] Implement `apps/web/src/modules/push/providers/{fcm,console,index}.ts` (`PushProvider.send({token, title, body, data}) → 'sent' | 'gone' | 'failed'`, chosen by `PUSH_PROVIDER`, `off` sends nothing) and `apps/web/src/modules/push/send.ts` (`pushToUser(payload, userId, message)`: skip when `users.pushEnabled` is false; one send per device in the device's `locale`; delete `gone` devices)
- [X] T043 [P] [US4] Write failing tests `BI-US4-S1`, `BI-US4-S2`, `BI-US4-S3`, `BI-US4-S5`, `BI-US4-S6`, `BI-US4-S7`, `BI-SC-005` in `apps/web/tests/integration/inbox-notify.int.test.ts` with the console provider
- [X] T044 [US4] Implement `apps/web/src/modules/inbox/commands/notify-brief.ts` (`notifyBrief(payload, brief, 'brief-accepted', {creatorId})`: admin in-app + WhatsApp-link rows; member client in-app row and `push` row then `pushToUser`, with `briefDedupeKey`; texts from site-settings templates, never phone, email or client name; push `data.path` = the brief's `/match/{ref}/{key}`); call it from `answerBrief` on a new acceptance inside `after()` from `next/server` (direct call in tests)
- [X] T045 [US4] Website: show `brief-accepted` notifications in the member's in-app list (`getMyNotifications` in `apps/web/src/modules/booking/queries.ts`, rendered on `/account`) with a link to the brief's step 2, and a "N creators said yes" line on the brief row of `apps/web/src/modules/brief/components/MyBriefs.tsx`. App: add optional `saidYes` (count) to the `/me/briefs` item shape (additive, `packages/domain/src/api/v1/brief.ts`), read it in `apps/mobile/lib/features/account/data/models/account_models.dart` and show it on the brief row in `apps/mobile/lib/features/account/presentation/`; tests `BI-US4-S3` in `inbox-notify.int.test.ts` and `test/features/account/`; messages en/ar, ARB `accountSaidYes`
- [ ] T046 [P] [US4] App tap routing: write failing test `BI-US4-S2` in `apps/mobile/test/core/push/push_tap_test.dart`, then route `data.path` through `safe_next` validation in `apps/mobile/lib/core/push/push_service.dart` (`onMessageOpenedApp`, `getInitialMessage`)

## Phase 7: User Story 6 — Choose whether to get pushes (P3)

**Goal**: the app registers devices once allowed, removes them on sign-out, and has an on/off switch.
**Independent test**: allow → device row; switch off → no sends; sign out → row gone.

- [X] T047 [P] [US6] Write failing tests `BI-US6-S2`, `BI-US6-S3` in `apps/web/tests/integration/push-devices.int.test.ts` (register, re-register moves a shared token to the caller, delete is 204 when unknown, preference read/write, auth required)
- [X] T048 [US6] Implement handlers `registerPushDeviceV1`, `removePushDeviceV1`, `pushPreferenceV1`, `setPushPreferenceV1` in `apps/web/src/modules/push/api.ts` and routes `apps/web/src/app/(payload)/api/mobile/v1/me/push/route.ts`, `me/push/devices/route.ts`, `me/push/devices/[token]/route.ts`
- [ ] T049 [US6] Add `firebase_core` and `firebase_messaging` (exact pins) to `apps/mobile/pubspec.yaml`; iOS: `aps-environment` in `ios/Runner/Runner.entitlements`, background mode `remote-notification` in `Info.plist`; Android: apply the `com.google.gms.google-services` plugin only when `android/app/google-services.json` exists in `android/app/build.gradle.kts` and `android/settings.gradle.kts`; git-ignore both config files; note the setup in `apps/mobile/README.md`. CI APK build still succeeds without the files
- [ ] T050 [US6] Implement `apps/mobile/lib/core/push/{push_service.dart,push_api.dart,push_cubit.dart}`: start Firebase (failure → push off, nothing else changes), ask permission once with a plain reason when the creator opens the inbox or a client sends a brief, register the token with the app language, re-register on `onTokenRefresh` and on language change; register in `lib/core/di/injection.dart`; unregister in `SessionCubit.signOut()` before `auth/logout` (`lib/core/auth/session_cubit.dart`)
- [ ] T051 [US6] Push switch on `apps/mobile/lib/features/menu/presentation/menu_page.dart` next to Theme and Appearance, signed in only, bound to `PushCubit` (`GET`/`PUT /me/push`); ARB keys `push*` en/ar
- [ ] T052 [P] [US6] Tests `BI-US6-S1`, `BI-US6-S2`, `BI-US6-S3` in `apps/mobile/test/core/push/push_cubit_test.dart`, `test/core/auth/session_cubit_test.dart` and `test/features/menu/menu_page_test.dart` with a fake messaging wrapper (no Firebase in tests)

## Phase 8: User Story 5 — Creators hear about new matching briefs (P3)

**Goal**: one push per matching live creator with push on, when a brief is saved.
**Independent test**: submit a brief; the console provider logged one push per matching creator device and none for others.

- [X] T053 [P] [US5] Write failing tests `BI-US5-S1`, `BI-US5-S2`, `BI-US5-S3`, `BI-US5-S4`, `BI-SC-005` in `apps/web/tests/integration/inbox-announce.int.test.ts`
- [X] T054 [US5] Implement `apps/web/src/modules/inbox/commands/announce-brief.ts` (`announceBrief(payload, briefId, now)`: live listed creators matching by R1, the named creator only when set; `brief-new` in-app + push rows with `briefDedupeKey`; `pushToUser` for each creator's user, `data.path = /account/inbox`)
- [X] T055 [US5] Call `announceBrief` inside `after()` right after `payload.create('briefs')` in `apps/web/src/modules/brief/actions.ts` (`submitBrief`) and `apps/web/src/modules/brief/commands/record-brief.ts` (`recordBrief`), not for replays; existing brief tests stay green

## Phase 9: Polish and gates

- [ ] T056 [P] Playwright journey `apps/web/tests/e2e/brief-inbox.spec.ts`: a creator accepts a matching brief on `/account/inbox`; the client's step-2 link shows them first with "Said yes"; en and ar
- [ ] T057 [P] Responsive and theme pass for `/account` Up next and `/account/inbox` at 360/768/1024/1440 px, en/ar, light/dark; impeccable detector on changed UI and the finish review returns `ship`; update `DESIGN.md` through the documenter
- [ ] T058 [P] App goldens for the inbox board (en-light, en-dark, ar-light, ar-dark) with `apps/mobile/tool/goldens.sh` and `pnpm fidelity` within the board's threshold; widget checks at 360, 768 and 1024 px (iPad); largest text size, VoiceOver and TalkBack labels on accept, reject and the switch
- [ ] T059 [P] Admin: `brief-answers` list columns (brief, creator, persona, decision, reason, answeredAt, and a computed "status now": listed / not free any more / profile hidden / withdrawn, for US2-S8), and the brief record shows `answers` (FR-011); check in `/admin` locally
- [ ] T060 Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:coverage` (domain 100 %, app ≥ 80 %), `pnpm check:scenarios`, and in `apps/mobile` `dart format --set-exit-if-changed lib test`, `flutter analyze`, `flutter test --coverage`; fix everything
- [ ] T061 Update `CLAUDE.md` (feature 019 paragraph: modules `inbox`, `push`, prefix `BI-`, `PUSH_PROVIDER`) and `specs/ROADMAP.md` status; device walkthrough of quickstart step 6 once the owner's Firebase files exist (else leave open, named)

## Dependencies

- Phase 1 → Phase 2 → stories. T017 (board approved) gates T023, T027, T030, T035, T039, T040.
- US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5). US2's step-2 work (T032–T034, T036) only needs Phase 2 and T029.
- US4 (Phase 6) needs T029. Its push rows work with the `console` provider; real delivery needs US6.
- US6 (Phase 7) needs T042 (server sender) for end-to-end; its endpoints (T047, T048) need only Phase 2.
- US5 (Phase 8) needs T042 and T020's matching.
- Polish last.

## Parallel examples

- Phase 2: T005, T007, T008, T010, T012, T016 together; then T006, T009, T011, T013, T014; then T015.
- US1: T018, T019, T024, T025 together; then T020 → T021 → T022/T023; T026 → T027.
- US2: T028, T031, T032, T036 together; T029 → T030/T035; T033 → T034.
- US4/US6: T041, T043, T046, T047 together.

## Implementation strategy

1. **MVP**: Phases 1–4 (see and accept, step 2 order and preconfirm) on web and app, with no push.
   Demo to the owner.
2. Add US3 (reject) and US4 (in-app + private link; push rows recorded with the console provider).
3. Add US6 and US5 (real push) once the owner's Firebase inputs exist; until then the `off` provider
   ships safely.
4. Polish and gates; open the PR against `main` referencing this spec and the task ids.
