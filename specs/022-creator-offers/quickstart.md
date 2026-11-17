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
| OF-US1-S1 | Build "photographer, birthday, Abu Dhabi, 2 hours, date" | Price step shows the suggestion and range |
| OF-US1-S2 | Add a videographer | Two price boxes, each with its suggestion |
| OF-US1-S3 | Type a price under the floor, send | Refused, message names the range |
| OF-US1-S4 | No pin, or a pin outside the UAE | Asked to mark the place in the UAE |
| OF-US1-S4a | Search "Yas Marina Circuit" | Pin moves; "Yas Island, Abu Dhabi"; emirate Abu Dhabi |
| OF-US1-S4b | Drag the pin to another street | Area and emirate update |
| OF-US1-S4c | Use my location (allowed / refused) | Pin at the device; refused leaves search and drag |
| OF-US1-S5 | Duration with no package | Empty box, any price ≥ AED 1 |
| OF-US1-S6 | Switch off, build a brief | No price step, flow as before |
| OF-US2-S1 | Send at AED 800; A opens inbox | Card with price, area, rough map, "about N km"; no client contact, no exact pin or address |
| OF-US2-S1a | Creator with no starting point | Area and map, no distance, link to set it |
| OF-US2-S1b | After the booking is confirmed | A's booking shows the exact pin, address and Directions |
| OF-SC-008 | Read every creator endpoint before booking | No `lat`, `lng` or `address` of the pin anywhere |
| OF-US2-S2 | — | C (Dubai) and a creator blocked that day get nothing |
| OF-US2-S3 | — | A gets one push with type, emirate, date, price (console log) |
| OF-US2-S4 | A's inbox open while a new brief is sent | Card appears ≤ 5 s without reload |
| OF-US3-S1 | A: Accept AED 800 | "You offered AED 800" |
| OF-US3-S2 | B: Offer AED 950 | Offer recorded |
| OF-US3-S3 | B: Offer AED 5,000 | Refused, range named |
| OF-US3-S4 | B changes price 3 times, then a 4th | 3 accepted, 4th refused |
| OF-US3-S5 | A withdraws | Gone from the client's list |
| OF-US3-S6 | After the client accepted A's quotation, A changes price | Refused "client has accepted" |
| OF-US3-S7 | A: Not for me | As 019 |
| OF-US3-S8 | Accept via API without amount | Recorded at AED 800 |
| OF-US4-S1 | Client opens step 2 before offers | "Sent to 2 creators", price shown |
| OF-US4-S2 | Page open; B offers | Appears ≤ 5 s without reload |
| OF-US4-S3 | A at 800, B at 950 | A first, marked "at your price" |
| OF-US4-S4 | — | Each card shows offer, fee 10 %, total |
| OF-US4-S5 | Client declines B | B gone; B notified; B cannot offer again |
| OF-US4-S6 | Two types, one accepted | Continue unavailable until both |
| OF-US4-S7 | Back from details, choose another | Allowed |
| OF-US4-S8 | Brief in an emirate with no creators | "No one free" + WhatsApp |
| OF-US4-S9 | Client member with app push | Push on B's offer opens step 2 |
| OF-US5-S1 | Accept A, details, quotation | Lines: offer AED 800, fee AED 80, total AED 880 |
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
