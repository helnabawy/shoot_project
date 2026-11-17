# Quickstart: Creator offers (022)

Validation guide. Every scenario id below must have a test whose name contains it
(`pnpm check:scenarios`).

## Prerequisites

- Local PostgreSQL only (`apps/web/.env` points at production): `docker compose up -d postgres`, then
  run `pnpm db:migrate` and `pnpm seed` with `DATABASE_URI` set to a local database
  (for example `postgres://postgres:postgres@localhost:5432/shoot_offers`).
- `PUSH_PROVIDER=console`, `PAYMENT_PROVIDER=off` (or Stripe test keys).
- Admin → Site settings → Quick match: Quick Match on, **Creators offer prices** on, fee 10 %, range
  70–200 %.
- Two seeded live photographers in Abu Dhabi (A, B), one in Dubai only (C); a client member.

## Scenarios

| Id | Steps | Expected |
|---|---|---|
| OF-US1-S1 | Build "photographer, birthday, Abu Dhabi, 2 hours, date" | `offers-brief.int.test.ts`, `PriceStep.test.tsx`, `mobile-api-offers.int.test.ts`, `brief_cubit_price_test.dart` |
| OF-US1-S2 | Add a videographer | `offers-brief.int.test.ts`, `brief_cubit_price_test.dart` |
| OF-US1-S3 | Type a price under the floor, send | `offers.test.ts`, `offers-brief.int.test.ts`, `PriceStep.test.tsx`, `brief_cubit_price_test.dart` |
| OF-US1-S4 | No pin, or a pin outside the UAE | Asked to mark the place in the UAE |
| OF-US1-S4a | Search "Yas Marina Circuit" | Pin moves; "Yas Island, Abu Dhabi"; emirate Abu Dhabi |
| OF-US1-S4b | Drag the pin to another street | Area and emirate update |
| OF-US1-S4c | Use my location (allowed / refused) | Pin at the device; refused leaves search and drag |
| OF-US1-S5 | Duration with no package | `offers.test.ts` |
| OF-US1-S6 | Switch off, build a brief | `offers-brief.int.test.ts`, `PriceStep.test.tsx` |
| OF-US2-S1 | Send at AED 800; A opens inbox | `place.test.ts`, `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `inbox_offers_cubit_test.dart` |
| OF-US2-S1a | Creator with no starting point | Area and map, no distance, link to set it |
| OF-US2-S1b | After the booking is confirmed | A's booking shows the exact pin, address and Directions |
| OF-SC-008 | Read every creator endpoint before booking | No `lat`, `lng` or `address` of the pin anywhere |
| OF-US2-S2 | — | `offers-answers.int.test.ts` |
| OF-US2-S3 | — | `offers-answers.int.test.ts` |
| OF-US2-S4 | A's inbox open while a new brief is sent | `mobile-api-offers.int.test.ts`, `inbox_offers_cubit_test.dart`, `of-us4-offers.spec.ts` |
| OF-US3-S1 | A: Accept AED 800 | `offers-answers.int.test.ts`, `inbox_offers_cubit_test.dart` |
| OF-US3-S2 | B: Offer AED 950 | `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `inbox_offers_cubit_test.dart` |
| OF-US3-S3 | B: Offer AED 5,000 | `offers.test.ts`, `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `mobile-api-offers.int.test.ts` |
| OF-US3-S4 | B changes price 3 times, then a 4th | 3 accepted, 4th refused |
| OF-US3-S5 | A withdraws | Gone from the client's list |
| OF-US3-S6 | While the client's issued quotation includes A's offer, A changes price | Refused "the client is booking it"; allowed again after that quotation expires |
| OF-US3-S7 | A: Not for me | As 019 |
| OF-US3-S8 | Accept via API without amount | Recorded at AED 800 |
| OF-US4-S1 | Client opens step 2 before offers | `offers-match.int.test.ts`, `OffersResults.test.tsx`, `match_offers_cubit_test.dart` |
| OF-US4-S2 | Page open; B offers | `LiveRefresh.test.tsx`, `stamp_poller_test.dart`, `match_offers_cubit_test.dart`, `of-us4-offers.spec.ts` |
| OF-US4-S3 | A at 800, B at 950 | `offers.test.ts`, `offers-match.int.test.ts`, `OffersResults.test.tsx` |
| OF-US4-S4 | — | `offers.test.ts`, `offers-match.int.test.ts`, `OffersResults.test.tsx` |
| OF-US4-S5 | Client declines B | `offers-match.int.test.ts`, `mobile-api-offers.int.test.ts`, `match_offers_cubit_test.dart` |
| OF-US4-S6 | Two types, one accepted | `OffersResults.test.tsx` |
| OF-US4-S7 | Back from details, choose another | `offers-quote.int.test.ts`, `book_flow_cubit_test.dart`, `DetailsForm.offers.test.tsx` |
| OF-US4-S8 | Brief in an emirate with no creators | "No one free" + WhatsApp |
| OF-US4-S9 | Client member with app push | Push on B's offer opens step 2 |
| OF-US5-S1 | Accept A, details, quotation | `offers.test.ts`, `offers-quote.int.test.ts`, `QuotationView.test.tsx` |
| OF-US5-S2 | — | No add-ons, no promo field; date, duration and emirate fixed (board 49) |
| OF-US5-S3 | Signed out, Accept | Sign-in, back to quotation (021) |
| OF-US5-S4 | Accept quotation | Assignment confirmed, date held, A told; B "went to another creator" |
| OF-US5-S5 | A blocks the date, client accepts | Refused, back to offers |
| OF-US5-S6 | Pay online | Charges AED 880 |
| OF-US6-S1 | Switch off | All 003/019/020 tests pass unchanged |
| OF-US6-S2 | Switch off after sending | Brief continues as offers |
| OF-US6-S3 | Change fee to 15 % | Existing brief keeps 10 % |
| OF-US6-S4 | Admin opens brief | Budgets and offers with amounts and decisions |

## Commands

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:coverage            # domain 100 %
pnpm check:scenarios          # every OF- id above has a test
pnpm build && pnpm test:e2e   # OF-US4-S2 two-browser journey
```

```bash
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test --coverage
```

Manual: run both sides at 360 px in English and Arabic, light and dark; repeat on the iOS simulator
against the local server with a foreground push.

## Review scenarios (added with tasks T080–T091)

| Id | Steps | Expected |
|---|---|---|
| OF-EC-01 | Let the shoot date pass with offers open | Offers show "Closed" to both sides; answers, declines and quotations refused `inbox.errors.briefClosed` |
| OF-EC-03 | Creator A offers as photographer and videographer on one brief | Two offers, both acceptable, one assignment per type |
| OF-FR-012 | Read A's booking, list, account and notifications after a AED 950 offer is booked | `offers-quote.int.test.ts` |
| OF-FR-026 | Audit the new code, ARB and message keys | No profession named outside content |
| OF-SC-002 | Tap the `brief-new` push | Inbox opens on that brief; "Accept {price}" is the next tap |
| OF-SC-006 | Replay the released app's requests on an offers brief | Whole journey succeeds without errors |

## Operator settings (T090)

Everything is off until the owner turns it on, in this order:

1. **Maps (optional).** For a pilot, `MAPS_PROVIDER=osm` uses OpenStreetMap with no key (no map image on creator
   cards; the public servers allow light use only). Or create a Google Maps Platform project with billing, enable Geocoding, Places and Static
   Maps, and set `MAPS_PROVIDER=google`, `GOOGLE_MAPS_SERVER_KEY`, `GOOGLE_MAPS_BROWSER_KEY` (restricted to the
   site's addresses) and `GOOGLE_MAPS_URL_SECRET` (see `apps/web/.env.example`). Without them the place is the
   emirate list and nothing else changes.
2. **Fee and range.** In admin, Site settings, Quick Match, Offers: the service fee percentage (default 10), the
   lowest and highest offer as a percentage of the usual price (default 70 and 200). Sent briefs keep the numbers
   they were sent with.
3. **The switch.** Turn on "Creators offer prices" (Quick Match must be on). Turning it off returns new briefs to
   the fixed-price flow; briefs already sent with offers keep working.

Local demo: on a local database only (never the production `DATABASE_URI`), `SEED_DEMO_CREATORS=1 SEED_DEMO_OFFERS=1
pnpm seed` creates the demo creators and turns the switch on (refused on non-local hosts); `PUSH_PROVIDER=console` prints
the pushes.

## Scenario → test mapping

Read by `pnpm check:scenarios` (T002): each file must exist and carry the id in a test name.

| Id | Scenario | Tests |
|---|---|---|
| OF-US1-S1 | Price step shows the suggestion and range | `offers-brief.int.test.ts`, `PriceStep.test.tsx`, `mobile-api-offers.int.test.ts`, `brief_cubit_price_test.dart` |
| OF-US1-S2 | One price box per professional type | `offers-brief.int.test.ts`, `brief_cubit_price_test.dart` |
| OF-US1-S3 | Out-of-range price refused | `offers.test.ts`, `offers-brief.int.test.ts`, `PriceStep.test.tsx`, `brief_cubit_price_test.dart` |
| OF-US1-S4 | No pin or pin outside the UAE refused | `place.test.ts`, `offers-brief.int.test.ts`, `offers-place.int.test.ts` |
| OF-US1-S4a | Search moves the pin; area and emirate shown | `offers-place.int.test.ts`, `PlaceStep.test.tsx` |
| OF-US1-S4b | Dragging updates area and emirate | `offers-place.int.test.ts` |
| OF-US1-S4c | Use my location, allowed and refused | `PlaceStep.test.tsx` |
| OF-US1-S5 | No suggestion: any amount ≥ AED 1 | `offers.test.ts` |
| OF-US1-S6 | Switch off: no price step | `offers-brief.int.test.ts`, `PriceStep.test.tsx` |
| OF-US2-S1 | Card with price, area, rough map, no contact or pin | `place.test.ts`, `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `inbox_offers_cubit_test.dart` |
| OF-US2-S1a | No starting point: no distance, link to set it | `BriefCard.offers.test.tsx` |
| OF-US2-S1b | Booked creator sees the exact pin and Directions | `offers-place-privacy.int.test.ts` |
| OF-US2-S2 | Non-matching creators get nothing | `offers-answers.int.test.ts` |
| OF-US2-S3 | One push with type, emirate, date, price | `offers-answers.int.test.ts` |
| OF-US2-S4 | Inbox updates without reload | `mobile-api-offers.int.test.ts`, `inbox_offers_cubit_test.dart`, `of-us4-offers.spec.ts` |
| OF-US3-S1 | Accept at the client's price | `offers-answers.int.test.ts`, `inbox_offers_cubit_test.dart` |
| OF-US3-S2 | Offer another price | `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `inbox_offers_cubit_test.dart` |
| OF-US3-S3 | Offer out of range refused | `offers.test.ts`, `offers-answers.int.test.ts`, `BriefCard.offers.test.tsx`, `mobile-api-offers.int.test.ts` |
| OF-US3-S4 | At most 3 changes | `offers.test.ts`, `offers-answers.int.test.ts` |
| OF-US3-S5 | Withdraw removes the offer | `offers-answers.int.test.ts` |
| OF-US3-S6 | Locked while an issued quotation includes it | `offers-answers.int.test.ts` |
| OF-US3-S7 | Not for me unchanged | `offers-answers.int.test.ts` |
| OF-US3-S8 | Accept without amount = client's price | `offers-answers.int.test.ts`, `mobile-api-offers.int.test.ts` |
| OF-US4-S1 | Waiting state with "sent to N" | `offers-match.int.test.ts`, `OffersResults.test.tsx`, `match_offers_cubit_test.dart` |
| OF-US4-S2 | Offers appear without reload | `LiveRefresh.test.tsx`, `stamp_poller_test.dart`, `match_offers_cubit_test.dart`, `of-us4-offers.spec.ts` |
| OF-US4-S3 | Lowest total first, "your price" mark | `offers.test.ts`, `offers-match.int.test.ts`, `OffersResults.test.tsx` |
| OF-US4-S4 | Offer, fee and total per card | `offers.test.ts`, `offers-match.int.test.ts`, `OffersResults.test.tsx` |
| OF-US4-S5 | Decline hides, notifies, blocks re-offer | `offers-match.int.test.ts`, `mobile-api-offers.int.test.ts`, `match_offers_cubit_test.dart` |
| OF-US4-S6 | Continue needs one pick per type | `OffersResults.test.tsx` |
| OF-US4-S7 | Choose another offer before accepting | `offers-quote.int.test.ts`, `book_flow_cubit_test.dart`, `DetailsForm.offers.test.tsx` |
| OF-US4-S8 | No match: "no one free" + WhatsApp | `offers-match.int.test.ts` |
| OF-US4-S9 | Push on a new offer opens step 2 | `offers-answers.int.test.ts` |
| OF-US5-S1 | Quotation: offer lines + fee line + total | `offers.test.ts`, `offers-quote.int.test.ts`, `QuotationView.test.tsx` |
| OF-US5-S2 | No add-ons or promo; place fixed | `offers-quote.int.test.ts`, `DetailsForm.offers.test.tsx` |
| OF-US5-S3 | Sign-in to accept (021) | `offers-quote.int.test.ts` |
| OF-US5-S4 | Starts confirmed; others told "went elsewhere" | `offers-quote.int.test.ts` |
| OF-US5-S5 | Unavailable creator refused at accept | `offers-quote.int.test.ts` |
| OF-US5-S6 | Payment charges the total | `offers-quote.int.test.ts` |
| OF-US6-S1 | Switch off: fixed flow unchanged | `offers-settings.int.test.ts` |
| OF-US6-S2 | Sent brief keeps offers mode | `offers-settings.int.test.ts` |
| OF-US6-S3 | Changed fee leaves sent briefs alone | `offers-brief.int.test.ts`, `offers-settings.int.test.ts` |
| OF-US6-S4 | Admin sees budgets and offers | `offers-settings.int.test.ts` |
| OF-SC-002 | Two taps from the push | `BriefCard.offers.test.tsx` |
| OF-SC-004 | Fee lines add up; offers within range | `offers.test.ts`, `offers-quote.int.test.ts` |
| OF-SC-006 | Released app's requests still work | `mobile-api-offers.int.test.ts` |
| OF-SC-008 | No exact pin in any creator read before booking | `place.test.ts`, `offers-place-privacy.int.test.ts` |
| OF-EC-01 | Offers close with the brief | `offers-answers.int.test.ts`, `offers-match.int.test.ts` |
| OF-EC-03 | One creator offering on two types | `offers-match.int.test.ts`, `offers-quote.int.test.ts` |
| OF-FR-012 | Creator views show the offer, never the fee | `offers-quote.int.test.ts` |
| OF-FR-026 | No profession named in code | `persona-audit.test.ts` |

App tests (`*_test.dart`) carry the same ids and are listed in each task; they join this table as they
are written.
