# Implementation Plan: Creator home

**Branch**: `023-creator-home` (to create; planned from `feat/phone-country-code`) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: `specs/023-creator-home/spec.md`, clarified 2026-11-17 (four owner decisions).

## Summary

A signed-in creator who opens `/` (or `/ar`) on the website, or starts the app, sees a creator home
instead of the client landing: who they are and whether they are live, three counts, one queue that
merges booking requests and matching briefs and shows a single request with Accept and Decline, their
next shoot, and three rows to manage bookings, availability and profile. A creator who is not live sees
their status and "Finish my profile". Everyone else keeps the static landing, untouched.

Nothing new is stored and no booking or matching rule changes. The work is one ordering rule, one read
model, one routing decision per client and two screens.

- **Domain** (`packages/domain/src/account/creator-home.ts`): `buildQueue`, `homeCounts`, `homeMode`,
  `NEXT_LIMIT`; v1 shapes `creator-home.ts` (`creatorHomeV1`, `homeItemV1`) and the endpoint
  `creatorHome`.
- **Web**: new module `modules/creator-home/` (query `creatorHome(ctx)`, two thin server actions over
  the existing commands, components, `api.ts`); `proxy.ts` swaps `/` for the creator route when the
  session token says `provider` (research R1); `users.accountType` gains `saveToJWT`; new route
  `(site)/[locale]/creator-home/page.tsx`; the landing's body moves into a shared `LandingContent`
  server component so the route can fall back to it; one menu row for creators.
- **App**: new feature `features/creator_home/` (model, data source, repository, cubit, page, widgets);
  the `/` route shows it for a signed-in provider, and the client landing for `/?view=client`; reuses the
  creator account's repositories for the two answers and its reject sheet.
- **Design**: boards 64 to 66 imported into `specs/design-system/canvas/` with manifest entries, then
  goldens and `pnpm fidelity`.

## Technical Context

**Language/Version**: TypeScript strict on Node 24; Dart / Flutter as pinned in `apps/mobile/README.md`.

**Primary Dependencies**: existing only: Next 16 (`proxy.ts`), Payload 3.93, next-intl, zod,
`defineHandler`, `answerRequest`, `answerBrief`, `creatorInbox`, `requestsOf`, `creatorAvailability`;
`flutter_bloc`, `get_it`, `go_router`. **No new package** on either side.

**Storage**: none new. No collection, no field, no migration. `saveToJWT` on `users.accountType`
changes the session token's payload only.

**Testing**: Vitest unit (domain 100 %: order, counts, mode); integration on Testcontainers PostgreSQL
(`creatorHome` read model, both actions against the commands, the API contract, scoping to the caller);
component tests (queue card in both kinds, empty, not-live, decline disclosure, en and ar); proxy unit
test (swap, no swap for guest / client / malformed token / `?view=client`); one Playwright journey
(creator lands on the home, answers three, guest still gets the cached landing); Lighthouse CI on `/`
unchanged. Flutter: `bloc_test` (load, answer, closed, offline), widget tests (page in en and ar, both
kinds, empty, not-live), router test (provider → home, others → landing), goldens for boards 64 and 65
through `tool/goldens.sh`, `pnpm fidelity`. `pnpm check:scenarios` gains this feature's quickstart.

**Target Platform**: web (Vercel, Linux); iOS (iPhone and iPad) and Android.

**Project Type**: modular-monolith web app + Flutter mobile app.

**Performance Goals**: creator home usable in ≤ 2.5 s on a mid-range phone (SC-006), CLS ≤ 0.1. Read =
the two existing reads (assigned bookings, open matching briefs) plus availability for today, run in
parallel. Landing budgets unchanged (SC-005): LCP ≤ 2.5 s, landing JS ≤ 200 KB, still static.

**Constraints**: the landing must stay statically generated; the proxy must add no database call;
v1 API additive only; no client contact details, no fees (FR-026); professions, reasons and durations
from content (FR-027); `apps/web/.env` targets production, so tests use local Docker or Testcontainers.

**Scale/Scope**: 0 collections, 0 migrations, 1 endpoint, 1 web route + 1 proxy rule + 1 menu row,
1 app screen + 1 route rule + 1 menu row, 1 cubit, 2 canvas boards with goldens (+1 Arabic dark check).

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1: pass, with one justified addition.*

| Principle | Status | How |
|---|---|---|
| I Spec-driven | Pass | Spec clarified with the owner (four answers); the design was approved as boards 64 to 66 before planning. |
| II Budgets | Pass | The landing stays static: routing happens in the proxy from the token, with no database call (R1). The creator home is a signed-in, server-rendered page; its only client JS is the decline disclosure's progressive enhancement. Lighthouse CI on `/` must not move. |
| III Test-first | Pass | Every `CH-` scenario has a named test (quickstart.md); domain at 100 %; integration against Testcontainers; the proxy rule has its own unit test. |
| IV Content in CMS | Pass | Professions, emirates, occasions, durations and reject reasons come from content; static strings in `messages/{en,ar}.json` and the ARB files. No new content type. |
| V Modular | Pass | New `creator-home` module; it imports `booking`, `inbox`, `creators` and `auth` only through their `index.ts`; rules in `packages/domain`; the app reads only the API. |
| VI Accessible, bilingual, themed | Pass | en/ar, light/dark, 360/768/1024/1440; real buttons and links, 44 px targets, the position and counts announced; the decline step works without JavaScript on the website. |
| VII Secure by default | Pass | The token hint only chooses a route; the route and the endpoint verify the session and are provider-only, scoped to the caller. No new access rule because nothing new is stored. The hint decode never trusts or logs the token. |
| VIII Simplicity | Justified | One proxy rule and `saveToJWT` on one field; see Complexity Tracking. No package, no service, no stored entity. |
| IX Designed | Pass | Boards 64 to 67 are the authority for the app (pixel diff; 67, the not-live home, is drawn and approved before that state is built); the website gets a surface brief first, then builds the same layout in "The Brief Bar" with the impeccable gates. One primary action: Accept (or Finish my profile). |

## Project Structure

### Documentation (this feature)

```text
specs/023-creator-home/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/mobile-api.md  contracts/web.md
├── checklists/requirements.md
└── tasks.md   (next: /speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/account/creator-home.ts (+ .test.ts)     # buildQueue, homeCounts, homeMode, NEXT_LIMIT
packages/domain/src/api/v1/creator-home.ts (+ .test.ts)      # creatorHomeV1, homeItemV1
packages/domain/src/api/v1/endpoints.ts                      # creatorHome (GET /me/creator/home)
packages/domain/src/api/v1/examples/creator-home*.json       # live, clear, not-live
specs/contracts/mobile-api/v1.schema.json                    # regenerated, additive

apps/web/src/proxy.ts (+ proxy.test.ts)                      # R1: swap `/` for a provider token
apps/web/src/shared/auth/token-hint.ts (+ .test.ts)          # accountTypeHint(cookie): 'provider' | null
apps/web/src/modules/auth/collections/Users.ts               # accountType: saveToJWT
apps/web/src/modules/landing/components/LandingContent.tsx   # the landing page's body, extracted
apps/web/src/app/(site)/[locale]/page.tsx                    # renders LandingContent (no behaviour change)
apps/web/src/app/(site)/[locale]/creator-home/page.tsx       # dynamic, noindex
apps/web/src/modules/creator-home/
├── queries.ts            # creatorHome(ctx): CreatorHomeV1
├── actions.ts            # answerBookingFromHome, answerBriefFromHome
├── api.ts  index.ts
├── components/{CreatorHome,HomeSummary,RequestCard,DeclineStep,NextRows,NextShoot,ManageRows,NotLive}.tsx
└── tests/*.int.test.ts, components/*.test.tsx
apps/web/src/modules/{booking,inbox,creators,auth}/index.ts  # export answerRequest, requestsOf view, answerBrief, onAccepted, RejectForm, profile status, the profile step panel
apps/web/src/shared/components/{MobileMenu,SessionNav}.tsx   # "Book a shoot" and "Creator home" rows for providers
.impeccable/surfaces/creator-home.md                         # surface brief, written before any web component
apps/web/src/app/(payload)/api/mobile/v1/me/creator/home/route.ts
apps/web/messages/{en,ar}.json                               # creatorHome.*
apps/web/e2e/creator-home.spec.ts

apps/mobile/lib/features/creator_home/
├── data/{models/creator_home.dart, datasources/creator_home_remote.dart, repositories/creator_home_repository.dart}
├── presentation/{cubit/creator_home_cubit.dart, pages/creator_home_page.dart, widgets/*.dart, creator_home_routes.dart}
apps/mobile/lib/core/routing/{app_router.dart, app_routes.dart}   # `/` builder by account type and `?view=client`
apps/mobile/lib/features/menu/presentation/menu_page.dart         # "Book a shoot" row for providers
apps/mobile/lib/core/l10n/*.arb                                   # creatorHome*
apps/mobile/test/features/creator_home/**, test/goldens/creator_home_*

specs/design-system/canvas/{S14-creator-home,S14b-creator-home-clear,S14-creator-home-ar}.dc.html
specs/design-system/canvas/manifest.json                     # screens 64, 65, 67 (+66 as the ar-dark check)
```

**Structure Decision**: the existing layout. A new web module, not more code in `auth` or `booking`,
because the home reads from three modules and owns none of their rules. A new app feature folder for
the same reason; the two answers go through the repositories `creator_account` already has.

## Phases

1. **Foundation**: domain rule and v1 shape with examples and snapshot; canvas import and manifest.
2. **US2 routing (web)**: `token-hint`, proxy rule, `saveToJWT`, `LandingContent` extraction, the route
   with its fallback; e2e proof that a guest still gets the cached landing. Done first on the web
   because every other web story is reached through it.
3. **US1 queue (web)**: read model, card, actions, decline step, next rows, empty state.
4. **US3 and US4 (web)**: summary, next shoot, manage rows, not-live home; menu row.
5. **API**: `creatorHome` endpoint, contract tests.
6. **App**: model and repository, cubit, page and widgets to the boards, router rule, menu row,
   goldens and fidelity.
7. **Polish**: Arabic review, accessibility pass, Lighthouse on `/`, docs (`CLAUDE.md`, ROADMAP).

## Risks

| Risk | Mitigation |
|---|---|
| The proxy swap breaks next-intl's locale handling or the landing's caching | Unit test on the proxy; e2e checks the guest's response is the cached landing and the creator's address bar stays `/`; fall back to the hint-cookie alternative in R1 if `as-needed` cannot take a swapped request. |
| Existing creator sessions have no `accountType` in the token | Menu row to the creator home for providers; check whether the token refreshes on use (R1). |
| `answerRequest` and the website's `respondToAssignment` have drifted | One integration test runs both on the same fixture before the home's action is written (R3). |
| Feature 022 lands first and changes what answering a brief means | R9; one task re-reads the item shape and the Accept note against 022 before coding. |
| Completed count is capped by the bookings read | R6; switch to a count query if `requestsOf` is limited. |

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| A routing rule in `proxy.ts` driven by `accountType` in the session token | The landing must stay static (Principle II, SC-005) while `/` shows a different page to creators (FR-001, FR-004) | Reading the session in the landing makes it dynamic for everyone; a second hint cookie must be kept in step with every sign-in and sign-out path; a client-side redirect flashes the wrong page and adds landing JS |
| New web module `creator-home` and app feature `creator_home` | The home composes `booking`, `inbox`, `creators` and `auth` and belongs to none of them | Putting it in `auth` (where the account home sits) grows a module that already reaches into three others and blurs the account home the owner asked to keep unchanged |
