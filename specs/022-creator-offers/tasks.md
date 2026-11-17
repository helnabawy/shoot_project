---
description: "Task list for feature 022 creator offers"
---

# Tasks: Creator offers

**Input**: `specs/022-creator-offers/` (spec clarified and design-reviewed 2026-11-17, plan, research R1–R14,
data-model, contracts/mobile-api.md, quickstart with 37 `OF-` scenarios).

**Tests**: Required (constitution III). Every `OF-` scenario in quickstart.md has a test whose name carries
its id, written first and failing before the code it covers. Integration tests run on Testcontainers
PostgreSQL; local commands use the Docker PostgreSQL, never `apps/web/.env`'s production database.

**Switch-off rule**: every task keeps the fixed-price flow unchanged when "Creators offer prices" is off
or a brief's `offers.mode` is `fixed`. All existing 003/019/020/021 tests stay green without edits (SC-005).

**Skills**: `payload-cms` (fields, migration, seeds), `nextjs-frontend` + `ui-design` + `impeccable` (web
UI), `mobile-api-contract` (endpoints, shapes), `flutter-mobile` + `design-fidelity` (app, boards 44–63),
`persona-extensibility` (no profession in code or ARB), `testing-strategy` (before every test).

## Format: `- [ ] Tnnn [P?] [USn?] Description with path`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task).
- **[USn]**: the spec's user story.

## Phase 1: Setup

- [ ] T001 Run `nvm use && pnpm install` in the worktree, start `docker compose up -d postgres`, and confirm every local command sets `DATABASE_URI` to a local database (for example `postgres://postgres:postgres@localhost:5432/shoot_offers`), never the production URL in `apps/web/.env`
- [ ] T002 [P] Append `node scripts/check-scenario-tests.mjs specs/022-creator-offers/quickstart.md` to the `check:scenarios` script in `package.json`
- [ ] T003 [P] Annotate the superseded "one fixed price" statements, each with "while 'Creators offer prices' is off; see spec 022": `PRODUCT.md` (fixed price lines), `specs/003-quick-match-booking/spec.md` (clarification on one price, FR-003), `specs/019-creator-brief-inbox/spec.md` (clarification 1, FR-007); add 022 to `specs/ROADMAP.md` and the feature list in `CLAUDE.md` (module paths, test-id prefix `OF-`)

## Phase 2: Foundational (blocks every story)

### Domain rules (tests first)

- [ ] T004 [P] Write failing unit tests in `packages/domain/src/booking/offers.test.ts` for every rule below, named with `OF-US1-S3`, `OF-US1-S5`, `OF-US3-S3`, `OF-US3-S4`, `OF-US4-S3`, `OF-US4-S4`, `OF-US5-S1`, `OF-SC-004` (fee 10 % of AED 800 = AED 80; AED 950 → AED 95; sum of per-offer fees equals the fee line)
- [ ] T005 Implement `packages/domain/src/booking/offers.ts` (data-model "Domain"): `offersOn({ quickMatchEnabled, offersEnabled })`; `offerRange(suggestedFils | null, { minPercent, maxPercent })` → `{ min, max }` rounded to whole dirhams, or `{ min: 100, max: null }` when there is no suggestion; `inRange(amount, range)`; `feeOf(amountFils, feePercent)` rounded to whole dirhams; `offerQuote(picks, feePercent)` → `FrozenQuote` with one `offer` line per pick and one `fee` line equal to the sum of per-offer fees, `discount` 0; `canChange(answer, picked)` / `canWithdraw(answer, picked)` → `ok` | `tooManyChanges` (revisions already 3) | `declined` | `picked`; `sortOffers` (total ascending, then earlier `answeredAt`); `offerStamp(parts)` (stable short hash). Export from `packages/domain/src/booking/index.ts`; 100 % coverage
- [ ] T006 [P] Add `'offer' | 'fee'` to `LineKind` in `packages/domain/src/pricing/types.ts` and handle them wherever `LineKind` is switched on (grep `LineKind` in `packages/domain/src`), with tests
- [ ] T007 [P] Add events `offer-new` (audience client), `offer-declined` and `offer-lost` (audience creator) to `NOTIFICATION_EVENTS` and `AUDIENCES` in `packages/domain/src/booking/notifications.ts`; extend `briefDedupeKey` with optional `answerId` and `revisions` → `brief:<briefId>:<event>:<audience>:<channel>:<recipient>:<answerId>:<revisions>`; tests in `notifications.test.ts`
- [ ] T008 [P] Add `emirateOf(value, custom, locations, { cityToEmirate })` to `packages/domain/src/booking/matching.ts` (emirate slug → its id; city slug → its parent emirate only when `cityToEmirate`; custom or unknown → null) with tests; fixed-mode callers pass `cityToEmirate: false` so their result is unchanged (research R4)

### API shapes (contracts/mobile-api.md)

- [ ] T009 [P] Add the optional fields to the zod shapes: `siteV1.offersEnabled` (`packages/domain/src/api/v1/site.ts`); `briefBuilderV1.offers { enabled, minPercent, maxPercent }`, new `briefPricesRequestV1 { values, custom }` and `briefPricesV1 { prices: [{ persona, suggestedFils | null, minFils, maxFils | null }], emirate | null }`, `briefRecordRequestV1.budgets?: { persona, amountFils }[]` (`brief.ts`); `matchV1.mode?`, `matchV1.sentTo?`, `matchSectionV1.budgetFils?`, `matchSectionV1.offers?: [{ creator, amountFils, feeFils, totalFils, atYourPrice, answeredAt }]`, `offerDeclineRequestV1 { persona, creator }`, `quotationIssueRequestV1.expect?`, `stampV1 { stamp }` (`booking.ts`); `briefItemV1.budgetFils?`, `range? { minFils, maxFils }`, `offerFils?`, `revisionsLeft?`, `declined?`, `briefAnswerRequestV1.amountFils?` (accept only) (`inbox.ts`); `creatorAccountV1.briefs.soonest.budgetFils?` (`creator-account.ts`); `lines[].kind` accepts `offer` and `fee` in `bookingViewV1`
- [ ] T010 Register `briefPrices` (`POST brief-builder/prices`, auth none), `offerDecline` (`POST match/{ref}/{key}/offers/decline`, auth optional), `matchStamp` (`GET match/{ref}/{key}/stamp`), `creatorBriefsStamp` (`GET me/creator/briefs/stamp`, auth required) in `packages/domain/src/api/v1/endpoints.ts`; add examples `examples/brief-prices.json`, `match-offers.json`, `match-offers-waiting.json`, `offer-decline.json`, `stamp.json`, `creator-briefs-offers.json`, `quotation-offer-fee.json`; run `pnpm --filter @shoot/domain api:snapshot` and confirm the additive-only check passes (FR-025)
- [ ] T011 [P] Add the problem codes `brief.errors.budgetRange`, `brief.errors.emirateRequired`, `offers.errors.outOfRange`, `offers.errors.tooManyChanges`, `offers.errors.declined`, `offers.errors.amountChanged`, `offers.errors.pickFromOffers` to `packages/domain/src/api/v1/problems.ts` and English and Arabic text in `apps/web/messages/{en,ar}.json`

### Schema and migration

- [ ] T012 Add the group `quickMatch.offers` to `apps/web/src/modules/site-settings/globals/quickMatch.ts`: `enabled` checkbox default `false` (description: effective only when Quick Match is on), `feePercent` number "default 10, 0–50", `minPercent` number "default 70, 10–100", `maxPercent` number "default 200, 100–500", a validation `minPercent ≤ 100 ≤ maxPercent`; expose `offers` from `readQuickMatch` in `apps/web/src/modules/booking/settings.ts`
- [ ] T013 [P] Add to `apps/web/src/modules/brief/collections/Briefs.ts`: group `offers` with `mode` select `fixed` | `offers` (default `fixed`, read-only in admin), `feePercent`, `minPercent`, `maxPercent`, `sentTo` (numbers, read-only); array `budgets` with `persona` → personas (required), `suggestedFils` number nullable, `amountFils` number required; admin shows them under the brief
- [ ] T014 [P] Add to `apps/web/src/modules/inbox/collections/BriefAnswers.ts`: `amountFils` number nullable ("offers mode, `accepted` only"), `revisions` number default 0 (max 3), `clientDecision` select `declined` nullable, `clientDecidedAt` date nullable; the existing `beforeValidate` hook refuses `amountFils` on `rejected`; admin list shows amount, revisions and decision (US6-S4)
- [ ] T015 [P] Add `offer` and `fee` to `lines[].kind` options in `apps/web/src/modules/booking/collections/Quotations.ts`; the `notifications.event` options follow T007 automatically
- [ ] T016 Run `pnpm --filter web payload generate:types`; create the migration with `pnpm db:migration:create creator_offers` against the local database only; review it for data loss (additions only, new enum values); extend `apps/web/tests/integration/inbox-access.int.test.ts` so a creator cannot read another creator's `amountFils`
- [ ] T017 [P] Seed `quickMatch.offers` defaults (off, 10, 70, 200) and en/ar templates for `offer-new` (client in-app and push), `offer-declined`, `offer-lost` (creator in-app and push), and add `{price}` to the `brief-new` and `brief-accepted` templates, in `apps/web/src/shared/payload/seed/`; update the templates' admin description in `quickMatch.ts` with `{price}`

### Live refresh plumbing (research R9)

- [ ] T018 [P] Write failing component test `OF-US4-S2` for `apps/web/src/shared/components/LiveRefresh.test.tsx` (polls a given server action every 5 s while `document.visibilityState` is `visible`, pauses when hidden, stops after 30 minutes with no change, calls `router.refresh()` only when the stamp changes), then implement `LiveRefresh.tsx` from the pattern in `apps/web/src/modules/booking/components/PaymentPending.tsx`
- [ ] T019 [P] Add `events` (a broadcast `Stream<PushEvent>` with `event` and `path`) to `apps/mobile/lib/core/push/push_service.dart`, fed by `FirebaseMessaging.onMessage` in `push_messaging.dart` (`NoPushMessaging` emits nothing); unit test in `apps/mobile/test/core/push/` (`OF-US4-S9` foreground event)
- [ ] T020 [P] Add a reusable `StampPoller` in `apps/mobile/lib/core/network/stamp_poller.dart` (5 s `Timer.periodic` while started, stops on `AppLifecycleState.paused`, calls `onChanged` only when the stamp differs) with tests using fake async

**Checkpoint**: domain green at 100 %, schema migrated locally, snapshot additive, boards 44–63 already approved.

## Phase 2b: The place — map pin, private until booked (research R15; serves US1, US2, US5)

Added 2026-11-17 after the owner's decision (required Google Maps pin; creators see area, rough map and
distance only). Task ids continue from T068 so the ids above stay stable; run this phase after Phase 2
and before Phase 3.

- [ ] T068 Owner input: a Google Maps Platform project with billing, and the keys `GOOGLE_MAPS_BROWSER_KEY` (Maps JS + Places, referrer-restricted), `GOOGLE_MAPS_SERVER_KEY`, `GOOGLE_MAPS_URL_SECRET` (Static Maps signing), `GOOGLE_MAPS_IOS_KEY`, `GOOGLE_MAPS_ANDROID_KEY`; document them and `MAPS_PROVIDER` (`google` | `off`, unset: `google` when the server key is set) in `.env.example`, `apps/web/src/shared/lib/env.ts` (server key required only when `google`) and `apps/mobile/README.md`. Nothing below blocks on the keys: tests use `off` and a fake provider
- [ ] T069 [P] Write failing unit tests `OF-SC-008`, `OF-US2-S1`, `OF-US1-S4` in `packages/domain/src/booking/place.test.ts`, then implement `packages/domain/src/booking/place.ts`: `snapPublic(lat, lng)` (0.02° grid), `distanceKm(from, to)` (haversine, whole km), `insideUae(lat, lng)`, `placeForCreator(place, base, bookingState)` returning `{ area, emirate, publicLat, publicLng, distanceKm | null }` before `confirmed` and adding `lat`, `lng`, `address` from `confirmed` on; 100 % coverage
- [ ] T070 [P] Create `apps/web/src/modules/maps/` with a provider interface (`autocomplete`, `details`, `reverse`, `staticMapUrl`) and providers `google` (REST over `fetch`, no SDK; Static Maps URL signed with HMAC-SHA1 from `node:crypto`) and `off`, chosen by `MAPS_PROVIDER` (same shape as `modules/push/providers`); a `fake` provider for tests; unit tests for URL signing and response mapping (area = `sublocality`/`neighborhood`/`locality`, emirate = `administrative_area_level_1`)
- [ ] T071 Schema: group `place` on `briefs` (`lat`, `lng`, `placeId`, `address`, `area` localized, `emirate` → locations, `publicLat`, `publicLng`, `source` select `search` | `drag` | `device` | `fallback`) with field access so `lat`, `lng`, `address` are readable only by the brief's member and admins; group `base` (`lat`, `lng`, `area` localized) on `creator-profiles`, readable by its owner and admins; `googleName` on `locations` seeded for the seven emirates; include in the `creator_offers` migration (T016) or a follow-up `creator_offers_place` migration; regenerate types
- [ ] T072 [P] Mobile API shapes and endpoints (contracts "The place"): `POST places/autocomplete`, `GET places/{placeId}`, `POST places/reverse` in `apps/web/src/modules/maps/api.ts` + routes (auth none, rate-limited per install); `place?` on `POST briefs`; `maps?` on `GET brief-builder`; `place?` on `briefItemV1`; `place?` on the creator booking view; `base?` on the creator profile; problem `brief.errors.placeOutside`; examples and snapshot (additive)
- [ ] T073 [US1] Write failing integration tests `OF-US1-S4`, `OF-US1-S4a`, `OF-US1-S4b` in `apps/web/tests/integration/offers-place.int.test.ts` (fake provider), then in `send-brief.ts` / `record-brief.ts` (offers mode, maps on): require a pin, refuse outside the UAE `brief.errors.placeOutside`, reverse-geocode on the server, set `emirate` from `googleName`, compute `publicLat/Lng`, store `place`; the brief's `location` selection is set from the emirate so travel pricing and matching work unchanged; maps off: the emirate question stays (fallback)
- [ ] T074 [US1] Web place step per boards 57–63 (states 58–63) in `apps/web/src/modules/brief/components/PlaceStep.tsx` replacing the emirate slot when offers and maps are on: Google Maps JS + Places loaded by a dynamic script only when the step opens, search field with results as rows, draggable pin, "Use my location" (`navigator.geolocation`, only on tap), area and emirate under the map, Arabic map language under `/ar`; failure → emirate rows and a typed area; component tests `OF-US1-S4a`, `OF-US1-S4c` with a fake map; Lighthouse confirms landing JS unchanged
- [ ] T075 [US1] App place step per boards 57–63 (states 58–63): add exact-pinned `google_maps_flutter` and `geolocator` to `apps/mobile/pubspec.yaml` (platform keys from dart-defines, iOS `NSLocationWhenInUseUsageDescription` en/ar, Android permission), `PlacePicker` widget in `apps/mobile/lib/features/brief/presentation/place_picker.dart` using the server's places endpoints, `BriefCubit` place state; cubit and widget tests `OF-US1-S4a`, `OF-US1-S4b`, `OF-US1-S4c` with a fake map
- [ ] T076 [US2] Write failing integration test `OF-SC-008` in `apps/web/tests/integration/offers-place-privacy.int.test.ts` that reads every creator-facing read (inbox, Up next, `me/creator/briefs`, `me/creator/account`, `brief-new` push and in-app text, step 2 data for other creators) for a brief with a pin and asserts no `lat`, `lng` or `address` of the pin before `confirmed`; then add `place` (via `placeForCreator`, `mapUrl` from `staticMapUrl` of the public point with a 1.5 km circle) to inbox items in `apps/web/src/modules/inbox/queries.ts` and `{area}` to the `brief-new` template variables
- [ ] T077 [US2] Inbox card place row per revised board 51 (static map image with circle, "{area}, {emirate} · about {n} km from you", or "Set where you start from" link) in `apps/web/src/modules/inbox/components/BriefCard.tsx` and `apps/mobile/lib/features/creator_account/presentation/pages/inbox_page.dart`; tests `OF-US2-S1`, `OF-US2-S1a` (web component, Flutter widget, en and ar)
- [ ] T078 [US2] Creator starting point: "Where you start from" on the profile editor (`apps/web/src/app/(site)/[locale]/account/profile/`, app `creator_account` profile page) using the same picker, saved to `creator-profiles.base`; tests `OF-US2-S1a`
- [ ] T079 [US5] Booked creator: exact pin, address, details address line and "Directions" on the creator's booking (web `CreatorBookingRow.tsx` / booking page, app `bookings_page.dart`) only from `confirmed` on; details pre-fill the address line from `place.address` (board 49); tests `OF-US2-S1b`, `OF-US5-S4`

## Phase 3: User Story 1 — The client names a price (P1) 🎯 MVP part 1

**Goal**: with the switch on, the brief ends with a price per type, checked on both sides.
**Independent test**: a photographer brief in Abu Dhabi for 2 hours shows AED 800 suggested, refuses AED 400, and is saved with the chosen price.

- [ ] T021 [P] [US1] Write failing integration tests `OF-US1-S1`, `OF-US1-S2`, `OF-US1-S3`, `OF-US1-S4`, `OF-US1-S5`, `OF-US1-S6`, `OF-US6-S3` in `apps/web/tests/integration/offers-brief.int.test.ts` (suggestion per type, range, budget out of range refused `brief.errors.budgetRange`, custom place refused `brief.errors.emirateRequired`, a city resolves to its emirate, no suggestion → any amount ≥ AED 1, switch off → no budgets and `mode: fixed`, fee and range frozen on the brief)
- [ ] T022 [US1] Add `suggestedPrices(answers, locale)` to `apps/web/src/modules/booking/match.ts` (per persona `quotePrice(rules, { personaIds: [p], duration, location })`, then `offerRange`) and export it; use it in a new branch of `previewMatches` (`apps/web/src/modules/booking/preview-action.ts`) that returns prices instead of creators when offers are on
- [ ] T023 [US1] In `apps/web/src/modules/brief/commands/send-brief.ts` (`recordPrepared`) and `record-brief.ts`: when `offersOn`, resolve the emirate with `emirateOf(..., { cityToEmirate: true })` or refuse `brief.errors.emirateRequired`; recompute suggestions; fill a missing budget with the suggestion (older app, FR-025); refuse an out-of-range amount; store `offers.mode = 'offers'`, the frozen `feePercent`, `minPercent`, `maxPercent` and `budgets`; with offers off store `mode: 'fixed'` and nothing else changes
- [ ] T024 [P] [US1] Write failing component tests `OF-US1-S1`, `OF-US1-S3`, `OF-US1-S6` in `apps/web/src/modules/brief/components/BriefBuilder.price.test.tsx`, then build the price step per board 44 in `apps/web/src/modules/brief/components/PriceStep.tsx` and wire it into `BriefBuilder.tsx` after the last slot when offers are on (labelled number field per type with − / + of AED 50, range hint, four quick amounts, posted as `budget.<personaSlug>` whole AED, primary action "Send to {professionals}" with the amount); messages `brief.price.*` en/ar
- [ ] T025 [US1] Implement `POST brief-builder/prices` in `apps/web/src/modules/brief/api.ts` + route `apps/web/src/app/(payload)/api/mobile/v1/brief-builder/prices/route.ts`; add `offers` to `GET brief-builder`; accept `budgets` in `POST briefs`; contract tests `OF-US1-S1`, `OF-US1-S3` in `apps/web/tests/integration/mobile-api-offers.int.test.ts`
- [ ] T026 [P] [US1] App data: `BriefPrices` entity and model, `prices(values, custom)` in the brief remote data source and repository (`apps/mobile/lib/features/brief/data/`, `domain/`), `budgets` in the send request; model tests over `brief-prices.json` in `apps/mobile/test/features/brief/data/`
- [ ] T027 [US1] App UI: price step state in `BriefCubit` (`apps/mobile/lib/features/brief/presentation/brief_cubit.dart`: load prices when the last slot is answered and offers are on, clamp to range, refuse send out of range) and the step in `brief_bar.dart` per board 44; ARB keys `briefPrice*` in `apps/mobile/lib/core/l10n/arb/app_{en,ar}.arb`; cubit tests `OF-US1-S1`, `OF-US1-S3`, `OF-US1-S4` and widget tests in en and ar

## Phase 4: User Story 2 — Matching creators get the brief with its price (P1) 🎯 MVP part 2

**Goal**: the existing announcement carries the price; the inbox and Up next show it and refresh live.
**Independent test**: an Abu Dhabi creator gets a push with the price and sees the card; a Dubai creator and a blocked creator get nothing.

- [ ] T028 [P] [US2] Write failing integration tests `OF-US2-S1`, `OF-US2-S2`, `OF-US2-S3` in `apps/web/tests/integration/offers-announce.int.test.ts` (card fields include the budget for that persona and no client contact; non-matching creators get nothing; one push text with type, emirate, date, price; `offers.sentTo` set)
- [ ] T029 [US2] In `apps/web/src/modules/inbox/commands/announce-brief.ts` use `emirateOf(..., { cityToEmirate: mode === 'offers' })`, pass `{price}` (the persona's budget, formatted per locale) to the `brief-new` template, and store `offers.sentTo` = number of creators announced to
- [ ] T030 [US2] In `apps/web/src/modules/inbox/queries.ts` add `budgetFils`, `range`, `offerFils`, `revisionsLeft` and `declined` to inbox items of offers-mode briefs and `budgetFils` to `briefsSummary().soonest`; add `inboxStamp(user)` built from the open-brief ids and the creator's answers with `offerStamp`
- [ ] T031 [P] [US2] Write failing component tests `OF-US2-S1`, `OF-US3-S1` in `apps/web/src/modules/inbox/components/BriefCard.offers.test.tsx`, then show the client's price on `BriefCard.tsx` per board 51 (price row, primary "Accept {price}" on the first card, "Offer another price", "Not for me"), and the "You offered" group in `InboxList.tsx` (amount, Change with changes left, outcome badge: client choosing, booked you, client declined)
- [ ] T032 [US2] Mount `LiveRefresh` with a server action `inboxStamp` on `apps/web/src/app/(site)/[locale]/account/inbox/page.tsx` and `account/page.tsx` (providers); Up next text per board 53 in `apps/web/src/modules/auth/components/AccountHome.tsx` (`account.next.briefsPrice`), plus the "Briefs and offers" row (FR-016b)
- [ ] T033 [US2] Implement `GET me/creator/briefs/stamp` in `apps/web/src/modules/inbox/api.ts` + route; add the new item fields to `GET me/creator/briefs`; contract tests `OF-US2-S4` in `mobile-api-offers.int.test.ts`
- [ ] T034 [P] [US2] App: entity and model fields (`budgetFils`, `range`, `offerFils`, `revisionsLeft`, `declined`) in `apps/mobile/lib/features/creator_account/` data and domain; `InboxCubit` reloads on push events `brief-new`, `offer-declined`, `offer-lost` and polls `briefs/stamp` with `StampPoller` while the page is visible; cubit tests `OF-US2-S4`
- [ ] T035 [US2] App UI: price row and buttons on `_BriefCard` and the "You offered" rows in `apps/mobile/lib/features/creator_account/presentation/pages/inbox_page.dart` per board 51; Up next price and the "Briefs and offers" row in `account_page.dart` per board 53; ARB `inboxOffer*`, `caBriefsPrice`; widget tests in en and ar

## Phase 5: User Story 3 — The creator accepts the price or offers another (P1) 🎯 MVP part 3

**Goal**: answers carry an amount, within the range, changed at most 3 times, locked once picked.
**Independent test**: accept one brief at the client's price, counter another at AED 950; both show under "You offered"; AED 5,000 is refused.

- [ ] T036 [P] [US3] Write failing integration tests `OF-US3-S1`, `OF-US3-S2`, `OF-US3-S3`, `OF-US3-S4`, `OF-US3-S5`, `OF-US3-S6`, `OF-US3-S7`, `OF-US3-S8` in `apps/web/tests/integration/offers-answers.int.test.ts` (accept at budget; counter within range; out of range `offers.errors.outOfRange`; 4th change `offers.errors.tooManyChanges`; withdraw; change or withdraw after the client accepted the quotation `inbox.errors.alreadyPicked`; not for me unchanged; accept without amount = budget)
- [ ] T037 [US3] In `apps/web/src/modules/inbox/commands/answer-brief.ts`: for offers-mode briefs accept `amountFils` (default the persona's budget), check `inRange` against the brief's frozen range, apply `canChange` (increment `revisions` when the amount changes on a current accepted answer), refuse when `clientDecision` is `declined`; fixed-mode briefs ignore `amountFils`
- [ ] T038 [US3] In `apps/web/src/modules/inbox/commands/withdraw-answer.ts` extend the picked lock: refuse when any booking of the brief past `quoted` names the creator for that persona, as well as the existing `quoted` check
- [ ] T039 [US3] Server action and form: accept `amountFils` in `answerBriefAction` (`apps/web/src/modules/inbox/actions.ts`); build `apps/web/src/modules/inbox/components/OfferForm.tsx` per board 52 (number field with − / +, quick amounts, range and changes-left hint, "Send offer {amount}"), opened from "Offer another price" and "Change"; messages `inbox.offer.*`; component test `OF-US3-S2`, `OF-US3-S3`
- [ ] T040 [US3] Notify the client on a new or changed offer: `onOffer` in `apps/web/src/modules/inbox/commands/notify-brief.ts` (in-app and push `offer-new` to the brief's member, path `/match/{ref}/{key}`, dedupe by answer id and revisions); called from `answerBrief` instead of `onAccepted` for offers-mode briefs; test `OF-US4-S9` in `offers-answers.int.test.ts`
- [ ] T041 [US3] Accept `amountFils` in `POST me/creator/briefs/{ref}/answer` (`apps/web/src/modules/inbox/api.ts`); contract tests `OF-US3-S8` (old-shape request still works) in `mobile-api-offers.int.test.ts`
- [ ] T042 [US3] App: `accept(ref, persona, {amountFils})` in the inbox data source and repository; `apps/mobile/lib/features/creator_account/presentation/widgets/offer_sheet.dart` per board 52; `InboxCubit.offer`, `change`; error mapping for the new problem codes in `core/l10n/failure_message.dart`; cubit and widget tests `OF-US3-S2`, `OF-US3-S3`, `OF-US3-S4`

## Phase 6: User Story 4 — The client sees offers live and chooses (P1) 🎯 MVP part 4

**Goal**: step 2 becomes a live list of offers per type with Accept and Decline.
**Independent test**: two offers appear within 5 s without reload; declining one removes it and notifies the creator; accepting the other continues to details.

- [ ] T043 [P] [US4] Write failing integration tests `OF-US4-S1`, `OF-US4-S3`, `OF-US4-S4`, `OF-US4-S5`, `OF-US4-S6`, `OF-US4-S7`, `OF-US4-S8` in `apps/web/tests/integration/offers-match.int.test.ts` (waiting state with `sentTo`; order by total; fee and total per offer; decline hides, notifies `offer-declined`, blocks re-offer; continue needs one pick per type; change of pick allowed; `sentTo = 0` → no-one-free state; an offering creator who blocks the date disappears)
- [ ] T044 [US4] Add the offers branch to `getMatchPage` in `apps/web/src/modules/booking/match.ts` (research R8): per section `budgetFils` and current offers (accepted, not withdrawn, not declined, creator still listed and free on the date) with `feeOf` and `sortOffers`; `sentTo`; no nearby dates; fixed mode unchanged. Add `matchStamp(brief)` with `offerStamp`
- [ ] T045 [US4] Create `apps/web/src/modules/inbox/commands/decline-offer.ts` (authorised by the brief reference and key; sets `clientDecision: 'declined'`, `clientDecidedAt`; notifies the creator `offer-declined` in-app and push, path `/account/inbox`) and a server action in `apps/web/src/modules/booking/actions.ts`
- [ ] T046 [US4] Views: offer fields in `matchView` (`apps/web/src/modules/booking/views.ts`); `apps/web/src/modules/booking/components/OfferRow.tsx` and an offers mode in `MatchResults.tsx` per boards 45, 46, 47 (list, not rail; only the first offer's Accept is primary; "Your price" / "Their price" badges; waiting state with `sentTo`; two-type state with Continue disabled until each type has a pick; WhatsApp as secondary); `LiveRefresh` with `matchStamp` on `apps/web/src/app/(site)/[locale]/match/[ref]/[key]/page.tsx`; messages `offers.*`; component tests `OF-US4-S1`, `OF-US4-S3`, `OF-US4-S6`
- [ ] T047 [US4] Mobile API: offer fields on `GET match/{ref}/{key}` (and `sections[].creators` = offerers, `priceFils` = budget + fee for old apps, research R13); `POST match/{ref}/{key}/offers/decline`; `GET match/{ref}/{key}/stamp`; handlers in `apps/web/src/modules/booking/api.ts` + routes; contract tests `OF-US4-S5` and an old-app step 2 read in `mobile-api-offers.int.test.ts`
- [ ] T048 [P] [US4] App data: `MatchOffer` entity, model fields, `decline` and `stamp` in `apps/mobile/lib/features/quick_match/data/` and `domain/`; model tests over `match-offers.json`, `match-offers-waiting.json`
- [ ] T049 [US4] App UI: offers mode in `apps/mobile/lib/features/quick_match/presentation/pages/match_page.dart` per boards 45–47 (waiting, list with Accept and Decline, two types); `MatchCubit` holds offers, picks per type, declines, reloads on push `offer-new` for its path and polls the stamp while visible; ARB `qmOffer*`; cubit tests `OF-US4-S2`, `OF-US4-S5`, `OF-US4-S9`, widget tests in en and ar
- [ ] T050 [US4] Client account home per board 54: Up next "N offers" leading with the brief that has offers, and offer counts on brief rows, in `apps/web/src/modules/auth/account-home.ts`, `AccountHome.tsx`, `apps/web/src/modules/brief/components/MyBriefs.tsx` (count from `saidYesCounts` widened to current offers), and `apps/mobile/lib/features/account/presentation/pages/account_home_page.dart`; `meBriefs` gains `offers?` count (additive); tests named `OF-US4-S1` for the home summary

## Phase 7: User Story 5 — Quotation, acceptance and payment from the offers (P1) 🎯 MVP complete

**Goal**: the quotation is the chosen offers plus one fee line; accepting starts the booking confirmed; payment charges the total.
**Independent test**: accept a AED 950 offer at 10 %; quotation shows AED 950, AED 95, AED 1,045; after acceptance the booking is confirmed; "Pay AED 1,045" charges exactly that.

- [ ] T051 [P] [US5] Write failing integration tests `OF-US5-S1`, `OF-US5-S2`, `OF-US5-S3`, `OF-US5-S4`, `OF-US5-S5`, `OF-US5-S6` and `OF-SC-004` in `apps/web/tests/integration/offers-quote.int.test.ts` (lines and total; no add-ons or promo accepted; sign-in gate as 021; assignments confirmed, date held, `accepted` to the creator, `offer-lost` to the other offerers of that type; unavailable creator refused and back to offers; Stripe session amount equals the total; `expect` mismatch → `offers.errors.amountChanged`)
- [ ] T052 [US5] In `apps/web/src/modules/booking/commands/issue-quotation.ts` branch on `brief.offers.mode`: offers → read each pick's current offer, compare with `expect`, refuse `offers.errors.amountChanged`, build the quote with `offerQuote` (labels "{profession} · {creator}" in en and ar), ignore add-ons and promo; fixed → unchanged
- [ ] T053 [US5] In `apps/web/src/modules/booking/commands/client-actions.ts`: refuse `pickAnother` for offers-mode bookings with `offers.errors.pickFromOffers`; after a successful `acceptQuotation` on an offers-mode booking, notify `offer-lost` to every other current offer of the same persona (in-app and push, path `/account/inbox`); `preconfirm` already confirms the picked creators (verify, no change)
- [ ] T054 [US5] Details per board 49 in `apps/web/src/app/(site)/[locale]/match/[ref]/[key]/details/page.tsx` and `DetailsForm.tsx`: in offers mode show date, duration and emirate as one fixed row with "send a new brief" (FR-018a), no add-ons, no promo, carry `expect.<persona>` hidden fields, total = offers + fee; the 409 path renders board 48 (offer changed) on step 2 with the new amount; component tests `OF-US5-S2`, `OF-US4-S7`
- [ ] T055 [US5] Quotation per board 50: render `offer` and `fee` lines in `apps/web/src/modules/booking/components/QuotationView.tsx` ("{creator}'s offer, your price" / "Service fee {percent}%"), "VAT included", "Choose another offer" link back to step 2 instead of pick-another in `BookingStatus.tsx` for offers mode; component test `OF-US5-S1`
- [ ] T056 [US5] Mobile API: `expect` on `POST match/{ref}/{key}/quotation`, `offers.errors.*` problems, `offer`/`fee` lines in `bookingViewV1`; contract tests in `mobile-api-offers.int.test.ts`
- [ ] T057 [US5] App: details in offers mode in `apps/mobile/lib/features/quick_match/presentation/pages/details_page.dart` per board 49 (`BookFlowCubit` sends `expect`, handles `amountChanged` by returning to step 2 with board 48's notice); fee line and "Choose another offer" in `booking_page.dart` per board 50; ARB keys; cubit and widget tests `OF-US5-S1`, `OF-US5-S2`, `OF-US5-S5`

## Phase 8: User Story 6 — The team controls the model (P2)

**Goal**: the switch, fee and range are settings; existing briefs keep what they were sent with; admins see offers.
**Independent test**: toggle the switch and change the fee; new briefs follow, sent ones do not.

- [ ] T058 [P] [US6] Write failing integration tests `OF-US6-S1`, `OF-US6-S2`, `OF-US6-S3`, `OF-US6-S4` in `apps/web/tests/integration/offers-settings.int.test.ts` (switch off: brief, step 2, quotation, inbox identical to the fixed flow; a brief sent with offers on continues after switching off; changed fee leaves sent briefs at 10 %; admin can read budgets and every answer with amount, revisions and decision)
- [ ] T059 [US6] Read `brief.offers.mode` (never the live switch) in every offers branch: `getMatchPage`, `issueQuotation`, `answerBrief`, `announceBrief`, `inbox/queries.ts`, `client-actions.ts`; expose `offersEnabled` in `toWireSite` (`apps/web/src/modules/site-settings/wire.ts`) and the app's `site_info_model.dart`
- [ ] T060 [P] [US6] Admin: show `budgets` and the brief's answers (amount, revisions, decision) on the brief edit view via the existing `answers` join columns in `Briefs.ts`; `brief-answers` list columns per T014

## Phase 9: Polish and cross-cutting

- [ ] T061 [P] Playwright journey `OF-US4-S2` and `OF-US2-S4` in `apps/web/tests/e2e/of-us4-offers.spec.ts`: two browser contexts (client on `/match/{ref}/{key}`, creator on `/account/inbox`), creator offers, the client's page shows it within 5 s without reload; client declines, the creator's page updates; then accept → details → quotation → sign-in → accepted; repeat at 360 px in `/ar`
- [ ] T062 [P] Accessibility and theme pass on every new web surface at 360/768/1024/1440, en/ar, light/dark: labelled number fields with `inputmode="numeric"`, `aria-live="polite"` on the offers list and inbox, 44 px targets, focus rings, logical CSS only; impeccable detector and finish review per `ui-design`
- [ ] T063 [P] Goldens for the app screens of boards 44–54 and 57–63 through `apps/mobile/tool/goldens.sh` and `pnpm fidelity` (en-light, derived en-dark, ar-light, ar-dark; 55 and 56 validate the derived Arabic dark of 46 and 51)
- [ ] T064 [P] Performance: stamp handlers answer in < 150 ms p95 with ≤ 2 queries (integration timing test in `offers-match.int.test.ts`); landing JS stays ≤ 200 KB with the price step (Lighthouse CI)
- [ ] T065 Run `pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:coverage` (domain 100 %, app ≥ 80 %), `pnpm check:scenarios`, and in `apps/mobile` `dart format --set-exit-if-changed lib test`, `flutter analyze`, `flutter test --coverage`; fix what fails
- [ ] T066 Walk quickstart.md end to end on the local database with `PUSH_PROVIDER=console`, then on the iOS simulator against the local server (foreground push refreshes the list); record results in `specs/022-creator-offers/quickstart.md`
- [ ] T067 Owner gate before production: confirm the default fee (10 %) and range (70–200 %), then ship with the switch off and turn it on in admin

## Dependencies

- Phase 1 → Phase 2 → Phase 2b (place: T069–T072 first; T073–T075 with US1, T076–T078 with US2, T079 with US5) → stories. Phase 2's T005 blocks every server task; T016 (migration) blocks every integration test run.
- **US1 → US2 → US3 → US4 → US5**: each needs the previous one's data (a budget, then an announcement, then offers, then picks). US6 can start after US2 (T059 touches code written in US1–US5, so finish it last).
- Within a story: failing tests first, then server, then web UI, then mobile API, then app.
- T019 and T020 (push events, poller) block T034 and T049; T018 blocks T032 and T046.

## Parallel examples

- Phase 2: T004, T006, T007, T008, T009, T011 together (separate files); then T013, T014, T015 together.
- US1: T021 (integration tests), T024 (web component), T026 (app data) together after T022.
- US2: T028, T031, T034 together.
- US4: T043 and T048 together; T046 (web) and T049 (app) after T044 and T047.
- Polish: T061–T064 together.

## Implementation strategy

1. **MVP = US1–US5 on the website with the switch on in a local or staging environment**: a client names a price, creators answer, the client chooses and gets a payable quotation. The app tasks of each story (T026–T027, T034–T035, T042, T048–T050, T057) can follow in a second pass because older apps keep working (R13).
2. Then US6 hardening (mode frozen everywhere), the e2e journey and goldens.
3. Production: merge with the switch off, confirm fee and range with the owner (T067), switch on.
