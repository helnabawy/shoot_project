# Quickstart: Creator home (023)

Run everything against the **local** database only. `apps/web/.env` points at the production
database; before any command below, point `DATABASE_URI` at the local Docker PostgreSQL (with the
owner's consent) or run the Testcontainers suites, which start their own database.

## Prerequisites

```bash
nvm use
docker compose up -d postgres
pnpm install
pnpm db:migrate        # no new migration in this feature
pnpm seed
PUSH_PROVIDER=console pnpm dev
```

Sign out and in again as the creator after pulling this feature: the session token gains the account
type only when it is next issued (research R1).

## Walkthrough

1. Open `http://localhost:3000/` signed out: the landing, as before.
2. Sign in as a live creator (seeded provider). `/` now shows the creator home; the address bar still
   reads `/`. `/ar` shows it in Arabic, right to left.
3. In another browser send a brief that matches the creator, and accept a quotation that assigns them.
   Reload `/`: "To answer" reads 2, the booking request is the card ("1 of 2"), the brief is a "Next" row.
4. Accept: the brief becomes the card ("1 of 1"), "Coming up" rises by one, and the booking is confirmed
   on `/account/bookings`.
5. Decline the brief: the reason step opens; submit without a reason. The card becomes "You are up to
   date". `/account/inbox` lists the brief under "Not for me".
6. Open `/?view=client`: the landing, with the brief builder.
7. Sign in as a creator with an incomplete profile: status "Not live yet", the missing steps and
   "Finish my profile"; no queue.
8. App (`apps/mobile`, simulator, `--dart-define=API_BASE_URL=http://localhost:3000`): sign in as the
   live creator; the app opens on the creator home. Answer a request; pull to refresh. The menu's
   "Book a shoot" opens the client landing (`/?view=client`).

## Scenario → test mapping

Every scenario is covered by a test whose name starts with its id; `pnpm check:scenarios` checks that each file named here carries it.

| Id | Scenario | Tests |
|---|---|---|
| CH-US1-S1 | One booking and two briefs: the booking is the card, "1 of 3", two Next rows | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_cubit_test.dart`, `creator_home_model_test.dart`, `creator_home_page_test.dart`, `view.test.ts` |
| CH-US1-S2 | Accept a booking: confirmed, next becomes the card, counts move | `creator-home-actions.int.test.ts`, `creator-home.spec.ts`, `creator_home_cubit_test.dart`, `creator_home_page_test.dart` |
| CH-US1-S3 | Accept a brief: accepted, To answer falls, Coming up unchanged | `creator-home-actions.int.test.ts`, `creator_home_cubit_test.dart` |
| CH-US1-S4 | Decline opens the existing reason step; with, without a reason, and backing out | `CreatorHome.test.tsx`, `creator-home-actions.int.test.ts`, `creator-home.int.test.ts`, `creator-home.spec.ts`, `creator_home_cubit_test.dart`, `creator_home_page_test.dart` |
| CH-US1-S5 | The note under the buttons differs for a booking and a brief | `CreatorHome.test.tsx`, `creator_home_page_test.dart` |
| CH-US1-S6 | Order: bookings by nearest deadline, then briefs newest first | `creator-home.int.test.ts`, `creator-home.test.ts` |
| CH-US1-S7 | Last answer: "You are up to date", no Accept or Decline | `CreatorHome.test.tsx`, `creator_home_model_test.dart`, `creator_home_page_test.dart`, `view.test.ts` |
| CH-US1-S8 | Answering a request that is no longer open records nothing and moves on | `creator-home-actions.int.test.ts`, `creator_home_cubit_test.dart`, `creator_home_page_test.dart` |
| CH-US2-S1 | A signed-in creator sees the creator home at `/` and `/ar`, and in the app | `creator-home.spec.ts`, `creator_home_route_test.dart`, `proxy.creator-home.test.ts`, `token-hint.test.ts` |
| CH-US2-S2 | Guest, client, editor and admin get the landing unchanged, still from cache | `creator-home.spec.ts`, `creator_home_route_test.dart`, `proxy.creator-home.test.ts` |
| CH-US2-S3 | The menu takes a creator to the client landing | `SessionNav.test.tsx`, `creator-home.spec.ts`, `creator_home_route_test.dart` |
| CH-US2-S4 | Signing in or out switches the home without a reload | `creator-home.spec.ts`, `creator_home_route_test.dart` |
| CH-US2-S5 | A push or link to a booking or brief still opens that page | `creator_home_route_test.dart`, `proxy.creator-home.test.ts` |
| CH-US3-S1 | Identity row: photo or stand-in, name, professions from content, code, Live | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator_home_page_test.dart`, `view.test.ts` |
| CH-US3-S2 | The three counts equal the lists they open | `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_model_test.dart`, `creator_home_page_test.dart` |
| CH-US3-S3 | Next shoot shows the nearest confirmed booking and opens it | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator_home_page_test.dart`, `view.test.ts` |
| CH-US3-S4 | No upcoming booking: no Next shoot section | `CreatorHome.test.tsx`, `creator_home_page_test.dart` |
| CH-US3-S5 | Manage rows; Availability says Free today or Busy today | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_page_test.dart`, `view.test.ts` |
| CH-US3-S6 | A creator with nothing: zeros, up to date, Manage; nothing invented | `CreatorHome.test.tsx`, `creator_home_page_test.dart` |
| CH-US4-S1 | Incomplete profile: Not live yet, missing steps, Finish my profile | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_page_test.dart` |
| CH-US4-S2 | In review: the review message, no primary action | `CreatorHome.test.tsx`, `creator-home.spec.ts`, `creator-home.test.ts`, `creator_home_page_test.dart` |
| CH-US4-S3 | Not live: no queue, no counts, no Accept or Decline | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_model_test.dart`, `creator_home_page_test.dart` |
| CH-US4-S4 | Approved profile: the live home on the next open | `creator-home.int.test.ts` |
| CH-US4-S5 | Paused or suspended: the status and its wording, no queue, no primary action | `CreatorHome.test.tsx`, `creator-home.int.test.ts`, `creator-home.test.ts`, `creator_home_page_test.dart` |

Also proved: the endpoint's contract and examples (`MR-` style contract test for `creatorHome`), no
client contact or price in the response (FR-026), the caller sees only their own data (FR-025),
goldens for boards 64, 65 and 67 with the Arabic dark check against 66 (FR-030), and the creator
home's `private, no-store` response.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm check:scenarios
pnpm build && pnpm test:e2e
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test --coverage
tool/goldens.sh && cd ../.. && pnpm fidelity
```

Lighthouse CI on `/` must report the same landing numbers as before the feature.
