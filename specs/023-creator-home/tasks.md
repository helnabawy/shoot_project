# Tasks: Creator home

**Input**: `specs/023-creator-home/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: required (constitution Principle III). Each test is written first, fails, then the code
makes it pass. A test's name starts with the scenario id it proves (`CH-US1-S2 …`).

**Paths**: `W` = `apps/web/src`, `D` = `packages/domain/src`, `M` = `apps/mobile`.

**Local database only**: `apps/web/.env` points at production. Integration tests use Testcontainers;
anything else uses the local Docker PostgreSQL.

## Phase 1: Setup

- [x] T001 Create branch `023-creator-home` from `main` once `feat/phone-country-code` has merged (if it has not, branch from it and rebase after) and confirm `.specify/feature.json` names `specs/023-creator-home`
- [x] T002 Re-read research R9 against feature 022: if `specs/022-*` exists on the base branch, list in `specs/023-creator-home/research.md` the fields a brief item gains and the wording of the Accept note; otherwise record "022 not merged" there
- [X] T003 [P] Add `specs/023-creator-home/quickstart.md` to the `check:scenarios` script in `package.json`
- [x] T004 [P] Re-export boards 64 to 66 from the Shoot design canvas into `specs/design-system/canvas/` as `S14-creator-home.dc.html`, `S14b-creator-home-clear.dc.html`, `S14-creator-home-ar.dc.html`, and update `specs/design-system/canvas/canvas.json`
- [x] T005 Add manifest entries in `specs/design-system/canvas/manifest.json` via `build-manifest.mjs`: screen 64 (`S14-creator-home`, 360×1120, feature `023-creator-home`, variants en-light, en-dark, ar-light, ar-dark, boxes `header: .hd`, `wordmark: .wm`, `topHit: .top`, `stats: .stats`, `card: .panel`), screen 65 (`S14b-creator-home-clear`, 360×780), and 66 as the designer check for 64's derived `ar-dark`; add the Arabic strings to `specs/design-system/canvas/strings.ar`. *Done 2026-11-17 together with 67 (canvas version `1794949986-fae6`): boards copied as they are on the canvas, entries added to the repo's `canvas.json` only for 64 to 67 (feature 022's boards 44 to 63 stay on their branch), `build-manifest.mjs` maps 64, 65, 67 to `023-creator-home` and 66 to 64's `ar-dark`; boxes as built: 64, 65 and 66 `stats` and `card`, 67 `card`. Re-done the same day (canvas `1794950460-927b`) after 64 and 67 became stills of their first state; their working versions are the "Play · …" boards `S14-creator-home-play` and `S14c-creator-home-not-live-play`, which the builder skips. The builder also keeps screen 06 without `topHit` (`DROPPED_BOXES`), which a plain rebuild would have undone. Strings in `strings.ar/S14-creator-home.json`, `S14b-creator-home-clear.json`, `S14c-creator-home-not-live.json`, not yet in `board_strings_test.dart` (add them with T051).*
- [x] T069 Write the website's surface brief `.impeccable/surfaces/creator-home.md` with the impeccable skill, from boards 64 to 66 and `.impeccable/surfaces/account-home.md` (constitution IX); no web component task starts before it
- [x] T070 Draw board 67, the not-live home (`S14c-creator-home-not-live.dc.html`, 360 px, same style: identity row with the status badge, the step panel of boards 27 and 28, "Finish my profile", the Availability and My profile rows), add it to the Shoot design canvas, get the owner's approval, then import it and add manifest screen 67. *Drawn and on the canvas 2026-11-17, with a Tweaks switch `state` (`incomplete` | `review`) showing the in-review state on the same board; approved by the owner and imported the same day (see T005). The golden covers `incomplete`; the review state is proved by widget test.*

## Phase 2: Foundational (blocks every story)

**Domain rule and shapes**

- [x] T006 [P] Write failing unit tests in `D/account/creator-home.test.ts`: `CH-US1-S6` order (bookings by `respondBy` ascending, ties by `ref`; then briefs by `sentAt` descending, ties by `ref`), `homeCounts`, `homeMode` for every value of `ProfileStatus` in `D/creators/types.ts` (`live` and `live-with-changes` → `live`; `in-review` → `review`; `paused` and `suspended` → `paused`; `draft` or no profile → `incomplete`), with an exhaustive switch, `NEXT_LIMIT === 5`
- [x] T007 Implement `buildQueue`, `homeCounts`, `homeMode`, `NEXT_LIMIT` in `D/account/creator-home.ts` and export them from `D/account/index.ts` (100 % coverage)
- [x] T008 [P] Write failing schema tests in `D/api/v1/creator-home.test.ts`: `homeItemV1` is a discriminated union on `kind`; a booking item requires `respondBy` and `client`, allows `time` and `length` to be `null`; a brief item allows `date` to be `null` and has no `client`; `counts` is optional; unknown keys carrying phone, email or price are rejected by `.strict()`
- [x] T009 Implement `creatorHomeV1` and `homeItemV1` in `D/api/v1/creator-home.ts` exactly as `contracts/mobile-api.md` lists them (`mode: 'live' | 'incomplete' | 'review' | 'paused'`, `today: 'free' | 'blocked' | 'booked'`, reusing `needV1`, `rejectReasonV1` and `imageV1` for `photo`) and export from `D/api/v1/index.ts`
- [x] T010 [P] Add examples `D/api/v1/examples/creator-home.json` (live, one booking and two briefs, a next shoot), `creator-home-clear.json` (live, empty queue, `next: null`), `creator-home-not-live.json` (`incomplete`, two needs, no `counts`)
- [x] T011 Register `creatorHome` in `D/api/v1/endpoints.ts` (`GET /api/mobile/v1/me/creator/home`, auth required, output `creatorHomeV1`, the three examples), regenerate `specs/contracts/mobile-api/v1.schema.json` and confirm the snapshot test shows additions only

**Read model**

- [x] T012 Check the cap on `requestsOf` in `W/modules/booking/commands/creator.ts`; if assigned bookings are limited, add `countDone(ctx, user)` there for the Completed count (research R6) and note the result in `research.md`. *Result: the read is limited to 100 bookings sorted by date, oldest first, the same list `/account/bookings` and the app already use, so a creator with more than 100 active bookings would see the oldest 100. Left as it is so the home and the bookings page agree; recorded in research R6. A count query for Completed is a follow-up if a creator reaches the limit.*
- [x] T013 Export from `W/modules/booking/index.ts` what the home needs (`answerRequest`, the waiting / upcoming / done view, `creatorAvailability`), from `W/modules/inbox/index.ts` (`answerBrief`, `onAccepted`, the reject form component) from `W/modules/creators/index.ts` (profile status and needs for the signed-in creator) and from `W/modules/auth/index.ts` (the profile step panel the account home uses). *Done for booking, inbox and creators (`answerRequest`, `creatorAvailability`, `homeRequests`, `answerBrief`, `onAccepted`, `occasionsOf`); the `auth` export lands with T044.*
- [x] T014 Write failing integration test `apps/web/tests/integration/creator-home.int.test.ts` (the repo keeps integration tests there, not under the module): `CH-US3-S2` counts equal the lists; a booking item carries `time` from `startTime` and `length` as the duration option's label in the request language; `client` is first name and initial only; the response contains no phone, email or price (FR-026); another creator's requests never appear (FR-025); a non-provider gets `creators.errors.notProvider`; a provider with no profile yet gets `mode: 'incomplete'`; the landing's queries are not called for a provider
- [x] T015 Implement `creatorHome(ctx)` in `W/modules/creator-home/queries.ts` (the three reads in parallel, then `buildQueue` and `homeCounts`) and `W/modules/creator-home/index.ts`
- [X] T016 [P] Add `creatorHome.*` strings (title pattern "{occasion} in {emirate}", kinds, labels, the two Accept notes, counts, position "{n} of {total}", "Next", "You are up to date", not-live and review messages, "no longer open", "not sent, try again", "Book a shoot") to `apps/web/messages/en.json` and `apps/web/messages/ar.json`, the Arabic written in Arabic

**Checkpoint**: domain and read model green; stories can start.

## Phase 3: User Story 2 - A creator lands on the creator home (P1)

Done first on the website because the other web stories are reached through it.

**Goal**: `/` and `/ar` show the creator home to a signed-in creator and the unchanged static landing to everyone else; the app opens on it for a creator.

**Independent test**: open `/` as a guest, a client, a creator and an editor; only the creator sees the creator home, and the guest's response is still the cached landing.

- [X] T017 [P] [US2] Write failing unit tests in `W/shared/auth/token-hint.test.ts`: returns `'provider'` for a token whose payload has `accountType: 'provider'`; `null` for no cookie, a seeker, an editor, a malformed token, a non-JSON payload and an oversized cookie; never throws
- [X] T018 [US2] Implement `accountTypeHint(cookieValue)` in `W/shared/auth/token-hint.ts` (base64url decode of the payload segment only, no verification, no logging)
- [X] T019 [US2] Add `saveToJWT: true` to `accountType` in `W/modules/auth/collections/Users.ts`; run `pnpm --filter web payload generate:types` and confirm `pnpm db:migration:create` reports no schema drift
- [X] T020 [P] [US2] Write failing tests in `W/proxy.test.ts`: `CH-US2-S1` a provider token on `/` and `/ar` is handed to next-intl as `/creator-home` and `/ar/creator-home` with `x-pathname` still `/` or `/ar`; `CH-US2-S2` guest, client, editor, admin and malformed token are untouched; a provider who also holds the editor role is swapped; `?view=client` is untouched; no other path is touched
- [X] T021 [US2] Implement the swap in `W/proxy.ts` (research R1)
- [X] T022 [US2] Extract the landing page's body into `W/modules/landing/components/LandingContent.tsx` and render it from `W/app/(site)/[locale]/page.tsx` with no change in output (existing landing tests and Lighthouse stay green)
- [X] T023 [US2] Create `W/app/(site)/[locale]/creator-home/page.tsx`: `force-dynamic`, `robots: noindex`, verify with `getCurrentUser()`; a provider gets `<CreatorHome>` (a placeholder until US1); not a provider and `x-pathname` is `/` or `/ar` → `<LandingContent>`; not a provider on a direct visit → redirect to `/`
- [X] T024 [P] [US2] Write failing component test `W/modules/creator-home/components/menu-row.test.tsx` (`CH-US2-S3`) and add the "Book a shoot" row for providers linking to `/?view=client`, plus a "Creator home" row linking to `/creator-home`, in `W/shared/components/MobileMenu.tsx` and `W/shared/components/SessionNav.tsx` (extend the session summary in `W/modules/auth/session.ts` with the account type if the menu does not have it)
- [X] T025 [US2] Write `apps/web/e2e/creator-home.spec.ts`: `CH-US2-S1` creator sees the home at `/` with the address bar unchanged, in en and ar, and a `Cache-Control: private, no-store` response; `CH-US2-S2` a guest's `/` is served from cache (same cache header as before); `CH-US2-S4` signing out on the home shows the landing and signing in as a creator shows the home, with no manual reload and no stored landing shown; going back to the home after answering on `/account/inbox` shows the current queue (FR-029)
- [ ] T026 [US2] Check whether the web session token is re-issued on use; record the finding in `research.md` R1 and, if it is not, confirm the "Creator home" menu row covers creators signed in before release

**Checkpoint**: routing proven on the website.

## Phase 4: User Story 1 - Answer what is waiting, one request at a time (P1) — MVP

**Goal**: one card, Accept and Decline, the queue moves on.

**Independent test**: a creator with one booking request and two matching briefs answers all three from the home; each answer shows on `/account/bookings` and `/account/inbox`.

- [X] T027 [P] [US1] Write failing integration test `apps/web/tests/integration/creator-home-parity.int.test.ts`: `answerRequest` and the website's `respondToAssignment` give the same booking state, assignment and blocked date for confirm, decline with a reason, and a date already taken (research R3); fix any difference in `W/modules/booking/commands/creator.ts`
- [X] T028 [P] [US1] Write failing integration tests in `apps/web/tests/integration/creator-home-actions.int.test.ts`: `CH-US1-S2` accept a booking; `CH-US1-S3` accept a brief (Coming up unchanged, client notified through `onAccepted`); `CH-US1-S4` decline a booking with and without a reason (max 200) and a brief with a reason from `reasons[]`, with a note (max 300) and with neither; an unknown reason is refused with `inbox.errors.reasonUnknown`; `CH-US1-S8` a closed brief and an expired request record nothing and return the problem code
- [X] T029 [US1] Implement `answerBookingFromHome` and `answerBriefFromHome` in `W/modules/creator-home/actions.ts` (fields per `contracts/web.md`; revalidate `/`, `/account`, `/account/bookings`, `/account/inbox`; return to the home with `?error=<key>` on a problem)
- [X] T030 [P] [US1] Write failing component tests `W/modules/creator-home/components/RequestCard.test.tsx` in en and ar: `CH-US1-S1` booking card (kind, title, date and time, length, client, reference, answer-by badge, "1 of 3"); brief card (date or "Date to agree", needs, sent, reference; no client); `CH-US1-S5` the note differs by kind; exactly one primary button; both buttons are real `<button>`s of at least 44 px
- [X] T031 [US1] Implement `RequestCard.tsx` in `W/modules/creator-home/components/` to board 64 with "The Brief Bar" tokens and logical CSS
- [X] T032 [P] [US1] Write failing component test `W/modules/creator-home/components/DeclineStep.test.tsx` (`CH-US1-S4`): Decline opens the step without JavaScript; a brief shows the content reasons and the note; a booking shows one optional reason field; backing out submits nothing
- [X] T033 [US1] Implement `DeclineStep.tsx` reusing the inbox module's reject form for a brief
- [X] T034 [P] [US1] Write failing component test `W/modules/creator-home/components/NextRows.test.tsx`: the following requests as rows marked "Next" with no buttons; more than `NEXT_LIMIT` shows a "See all" row to the right list; `CH-US1-S7` an empty queue shows "You are up to date" and no Accept or Decline
- [X] T035 [US1] Implement `NextRows.tsx` and the empty state, and compose `CreatorHome.tsx` (card, decline step, next rows, an `aria-live` region for `?error=` messages) into `W/app/(site)/[locale]/creator-home/page.tsx`
- [X] T036 [US1] Extend `apps/web/e2e/creator-home.spec.ts`: a creator answers three requests from the home (accept booking, accept brief, decline brief with no reason) and each shows on `/account/bookings` and `/account/inbox`

**Checkpoint**: the MVP works on the website.

## Phase 5: User Story 3 - See where I stand at a glance (P2)

**Goal**: identity, three counts, next shoot, Manage.

**Independent test**: compare the counts, next shoot and availability hint with the bookings and availability pages for a known creator.

- [X] T037 [P] [US3] Write failing component tests `W/modules/creator-home/components/HomeSummary.test.tsx`: `CH-US3-S1` photo or stand-in tile, name, professions from content, code, status; the three counts as links (`#answer`, `/account/bookings`); `CH-US3-S6` zeros render as 0
- [X] T038 [US3] Implement `HomeSummary.tsx` (identity row and counts) in `W/modules/creator-home/components/`
- [X] T039 [P] [US3] Write failing component tests `W/modules/creator-home/components/NextShoot.test.tsx` and `ManageRows.test.tsx`: `CH-US3-S3` the nearest confirmed booking with day tile, title, date, time, length and payment badge linking to `/account/bookings/{ref}`; `CH-US3-S4` no section when `next` is `null`; `CH-US3-S5` three rows and "Free today" / "Busy today" from `today`
- [X] T040 [US3] Implement `NextShoot.tsx` and `ManageRows.tsx` and add them to `CreatorHome.tsx`
- [X] T041 [US3] Extend `apps/web/tests/integration/creator-home.int.test.ts`: `CH-US3-S5` `today` is `blocked` on a blocked business day (Asia/Dubai), `booked` on a shoot day, otherwise `free`; `next` is the earliest upcoming confirmed booking

## Phase 6: User Story 4 - A creator who is not live yet knows what to do (P2)

**Goal**: status, reason and one action for a creator who cannot receive requests.

**Independent test**: sign in with an incomplete profile and with one in review; check status, message and the single action.

- [X] T042 [P] [US4] Extend `apps/web/tests/integration/creator-home.int.test.ts`: `CH-US4-S3` a not-live creator gets an empty queue and no `counts`; `CH-US4-S4` after approval the live home is returned
- [X] T043 [P] [US4] Write failing component test `W/modules/creator-home/components/NotLive.test.tsx`: `CH-US4-S1` "Not live yet", the missing steps, primary "Finish my profile" → `/account/profile`; `CH-US4-S2` "In review" with no primary action; `CH-US4-S5` paused and suspended show the profile rules' wording with no queue and no primary action; Availability and My profile rows remain
- [X] T044 [US4] Implement `NotLive.tsx` (reusing the profile step panel the account home uses) and switch on `mode` in `CreatorHome.tsx`

## Phase 7: API and app (all stories on the phone)

**Endpoint**

- [X] T045 [P] Write failing contract test `apps/web/tests/integration/creator-home.int.test.ts` (the endpoint's tests live in the same file): `GET /api/mobile/v1/me/creator/home` returns `creatorHomeV1` for a provider in en and ar; `401 auth.errors.signInRequired` without a token; `403 creators.errors.notProvider` for a client; `Cache-Control: private, no-store`; each example file parses
- [X] T046 Implement `getCreatorHomeV1` in `W/modules/creator-home/api.ts` with `defineHandler` and the route `W/app/(payload)/api/mobile/v1/me/creator/home/route.ts`

**App data and state**

- [X] T047 [P] Write failing model tests `M/test/features/creator_home/creator_home_model_test.dart` decoding the three example files; an item with an unknown `kind` is skipped; an unknown `mode` reads as incomplete without the action
- [X] T048 Implement `M/lib/features/creator_home/data/models/creator_home.dart`, `datasources/creator_home_remote.dart` and `repositories/creator_home_repository.dart`, and register them in `M/lib/core/di/`
- [X] T049 [P] Write failing `bloc_test`s `M/test/features/creator_home/creator_home_cubit_test.dart`: load; `CH-US1-S2` and `CH-US1-S3` accept then reload; `CH-US1-S4` decline with and without a reason; `CH-US1-S8` a `409` shows "no longer open" and reloads; a network failure keeps the card and shows the retry message; reload on resume and on pull to refresh
- [X] T050 Implement `M/lib/features/creator_home/presentation/cubit/creator_home_cubit.dart` using the creator account's bookings and inbox repositories for the two answers
- [X] T051 [P] Add `creatorHome*` strings to the app's ARB files under `M/lib/core/l10n/` (en and ar); profession, occasion, emirate and length labels come from the API only

**App screen**

- [X] T052 [P] Write failing widget tests `M/test/features/creator_home/creator_home_page_test.dart` in en and ar: `CH-US1-S1`, `CH-US1-S5`, `CH-US1-S7`, `CH-US3-S1`, `CH-US3-S3`, `CH-US3-S4`, `CH-US3-S5`, `CH-US3-S6`, `CH-US4-S1`, `CH-US4-S2`, `CH-US4-S5`; Decline opens the reject sheet (`CH-US1-S4`); semantics labels on the counts and the position
- [X] T053 Implement the widgets in `M/lib/features/creator_home/presentation/widgets/` (identity row, counts strip, request card, next rows, next shoot row, manage rows, up-to-date and not-live panels) from the `core/widgets` catalogue, to boards 64 and 65
- [X] T054 Implement `M/lib/features/creator_home/presentation/pages/creator_home_page.dart` with pull to refresh, the arrive motion tier only, and the existing `reject_sheet.dart` (a one-field variant for a booking's optional reason)
- [X] T055 [P] Write failing router tests `M/test/core/routing/creator_home_route_test.dart`: `CH-US2-S1` a signed-in provider's `/` builds the creator home; seeker, guest and unknown build the landing; `CH-US2-S4` the page switches when the session changes; `CH-US2-S5` a deep link to a booking or brief opens that page; first-run welcome is unchanged; `/?view=client` builds the landing for a provider
- [X] T056 Implement the `/` builder rule (provider → creator home unless `view=client`) in `M/lib/core/routing/app_router.dart` and `app_routes.dart`, with `M/lib/features/creator_home/presentation/creator_home_routes.dart`
- [X] T057 [P] Write failing widget test for the menu (`CH-US2-S3`) and add the "Book a shoot" row for providers in `M/lib/features/menu/presentation/menu_page.dart`
- [ ] T058 Reload the home when a push for a new request arrives while it is in front, through the existing hook in `M/lib/core/push/`
- [X] T059 Add goldens for screens 64, 65 and 67 in `M/test/goldens/` (en-light, en-dark, ar-light, ar-dark), run `M/tool/goldens.sh --update` on macOS with the pinned Flutter, then `pnpm fidelity` within 0.01 and the ±1 px geometry gate; the ar-dark render is also checked against board 66; the booking decline sheet is covered by widget test only. The renderer stubs the canvas runtime; 64 and 67 are therefore stills of their first state (no placeholders, no conditionals), and all four boards were rendered at their sizes with every box resolving once (2026-11-17). Keep each "Play · …" board in step with its still when either changes

## Phase 8: Polish

- [ ] T060 [P] Run the impeccable gates on the website's creator home (craft floor, detector, finish review) at 360, 768, 1024 and 1440 px, en and ar, light and dark, and update `DESIGN.md` with the documenter
- [ ] T061 [P] Accessibility pass: keyboard order, focus ring, `aria-live` messages, VoiceOver and TalkBack on the app screen at the largest text size
- [ ] T062 [P] Arabic copy review of `apps/web/messages/ar.json` and the Arabic ARB by an Arabic writer
- [ ] T063 Run Lighthouse CI on `/` and confirm the landing's numbers and JS size are unchanged (SC-005); measure the creator home against SC-006
- [ ] T064 Run `pnpm typecheck && pnpm lint && pnpm test && pnpm check:scenarios && pnpm test:coverage`, `pnpm build && pnpm test:e2e`, and in `apps/mobile` `dart format --set-exit-if-changed lib test && flutter analyze && flutter test --coverage`
- [ ] T065 [P] Document the feature in `CLAUDE.md` and `specs/ROADMAP.md` (module, endpoint, test-id prefix `CH-`, the proxy rule, what stays open)
- [ ] T066 Walk through `specs/023-creator-home/quickstart.md` on the website and on an iPhone and an Android device, and record what was not checked in this file
- [ ] T067 Optional: move the website's `respondToAssignment` in `W/modules/booking/actions.ts` onto `answerRequest` so the booking page and the home share one path (only if T027 found no difference)
- [ ] T068 Owner: capture the baseline of expired booking requests for the four weeks before release (SC-004)

## Dependencies

- Phase 1 → Phase 2 → everything else. T069 gates every web component task (T024, T031 onward); T070 gates the app's not-live state (part of T053) and its golden in T059.
- US2 (Phase 3) before US1, US3 and US4 on the website: they render inside the route T023 creates.
- US1, US3 and US4 are independent of each other once T023 and T015 exist; they touch different components and meet only in `CreatorHome.tsx` (T035, T040, T044, in that order).
- Phase 7's endpoint (T045, T046) needs only Phase 2. The app screen needs T004, T005 and T046.
- T059 needs T053 to T056. T064 and T066 come last.

## Parallel examples

- Phase 2: T006 and T008 and T010 and T016 together; then T007 and T009.
- US2: T017 and T020 and T024 (tests) together; T022 alongside T018.
- US1: T027, T028, T030, T032 and T034 (all tests, different files) together.
- After Phase 2, one person can take the website (Phases 3 to 6) while another takes the endpoint and the app's data layer (T045 to T051).

## Implementation strategy

1. **MVP**: Phases 1 to 4 on the website: a creator lands on the home and answers the queue. Ship behind nothing else; the account's Up next stays as the other way in.
2. Add US3 and US4 (Phases 5 and 6): the home is complete on the website.
3. Endpoint and app (Phase 7), proved by goldens and the pixel diff.
4. Polish (Phase 8), then the owner's walkthrough.

Counts: 70 tasks (T069 and T070 were added to Setup after the consistency check and keep their numbers). Setup 7, Foundational 11, US2 10, US1 10, US3 5, US4 3, API and app 15, Polish 9.

## Implementation notes (2026-11-18)

- Tests live where the repo keeps them: integration in `apps/web/tests/integration/creator-home*.int.test.ts`, e2e in `apps/web/tests/e2e/creator-home.spec.ts`, the proxy rule in `apps/web/src/proxy.creator-home.test.ts` (the 008 `proxy.test.ts` is unchanged).
- Decline opens a server-rendered step through the link `/?decline=<ref[:persona]>#answer`, not a disclosure; it works without JavaScript.
- No `/landing` route: a creator reaches the client page with `/?view=client`.
- Open: T026, T058 (push while in front: the app reloads on resume only), T060–T068 (impeccable gates, a11y and Arabic review, Lighthouse, docs, device walkthrough, owner items), `pnpm fidelity` for boards 64, 65 and 67, and the 008 contract snapshot now holds `creatorHome`.
