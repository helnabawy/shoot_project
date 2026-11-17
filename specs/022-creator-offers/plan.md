# Implementation Plan: Creator offers

**Branch**: `claude/indrive-delivery-creator-flow-87a706` (worktree; feature `022-creator-offers`) | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: `specs/022-creator-offers/spec.md`, clarified 2026-11-17 (nine owner decisions).

## Summary

Behind a new switch "Creators offer prices", a brief carries the client's price per professional type
(pre-filled with today's price-rule suggestion, bounded by a range). It is announced to matching
creators in its emirate with that price. Each creator accepts it or offers another price (≤ 3
changes), or says not for me. The client's step 2 becomes a live list of offers (offer, fee, total)
with Accept (a pick) and Decline. Details, then a quotation of `offer` lines plus one `fee` line,
accepted when signed in; the creator's assignment starts confirmed; Stripe charges the total. Lists
update within 5 s by change-stamp polling plus foreground push. With the switch off nothing changes.

- **Domain** (`packages/domain/src/booking/offers.ts`): range, fee, quote, change rules, ordering,
  stamp; `LineKind` += `offer`, `fee`; events `offer-new`, `offer-declined`, `offer-lost`; v1 shapes.
- **Web**: `brief` (price step, budgets, emirate rule), `inbox` (amount on answers, decline, stamps,
  notifications), `booking` (offers branch of step 2, quotation from offers, pickAnother refused),
  `site-settings` (switch and numbers), a shared `LiveRefresh` component.
- **App**: brief price step; inbox card with price and an offer sheet; offers list on step 2; fee line
  on the quotation; foreground push events and stamp polling in `InboxCubit` and `MatchCubit`.

## Technical Context

**Language/Version**: TypeScript strict on Node 24; Dart / Flutter as pinned in `apps/mobile/README`.

**Primary Dependencies**: existing only: Payload 3.93, Next 16 (`after()`, server actions), next-intl,
zod, `defineHandler`, `quotePrice`, `matchCreators`, `briefMatchesCreator`, `preconfirm`,
`createQuotation`, `pushToUser`, `notify`; app: `flutter_bloc`, `get_it`, `firebase_messaging`
(already pinned). **No new package or service.**

**Storage**: PostgreSQL via Payload: new columns on `briefs` (group + array table), `brief_answers`,
`site_settings`; new select options on `quotations.lines.kind` and `notifications.event`. One
migration.

**Testing**: Vitest unit (domain 100 %), integration on Testcontainers (send with budgets, announce
with price, answer/change/decline/withdraw, step 2 offers, quotation from offers, preconfirm, payment
amount, stamps, mobile contract incl. old-shape requests), component tests (price step, BriefCard
offer form, offers list, LiveRefresh), Playwright two-browser journey (OF-US4-S2, OF-US2-S4); Flutter
`bloc_test` (BriefCubit price step, InboxCubit offer/poll/push, MatchCubit offers/poll/push) and
widget tests in en/ar; goldens after the boards are approved.

**Target Platform**: web (Vercel); iOS and Android.

**Project Type**: modular-monolith web app + Flutter app.

**Performance Goals**: a change is visible to the other side within 5 s in 95 % of cases (SC-001).
Stamp requests ≤ 2 small queries, < 150 ms p95; polling only while visible, stops after 30 min idle.
Landing JS unchanged except the price step inside the existing brief bar (budget ≤ 200 KB holds).

**Constraints**: v1 additive; switch off = byte-for-byte old behaviour (all 003/019/020/021 tests
untouched and green); no client contact before booking; creators never see the fee; professions from
content; production `.env` never used for migrations or tests.

**Scale/Scope**: 1 migration, 6 domain functions, 5 new endpoints + additive fields, 3 notification
events, 4 web surfaces changed, 4 app screens changed + 1 sheet, 4 canvas boards.

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1: pass, nothing to justify beyond notes.*

| Principle | Status | How |
|---|---|---|
| I Spec-driven | Pass | Spec clarified with the owner (9 decisions); supersedes "one fixed price" only while the switch is on; `PRODUCT.md`, `ROADMAP.md`, specs 003/019 annotated. |
| II Budgets | Pass | Landing gains one small step inside the existing brief bar; polling runs on signed-in or private pages only; no third-party script. |
| III Test-first | Pass | Every `OF-` scenario has a named test (quickstart); domain at 100 %. |
| IV Content in CMS | Pass | Switch, fee, range, templates are site settings; professions and labels from content. |
| V Modular | Pass | Changes stay in `brief`, `inbox`, `booking`, `site-settings`; cross-module imports via `index.ts`; rules in `packages/domain`. |
| VI Accessible, bilingual, themed | Pass | Number fields with labels and range hints, `inputmode="numeric"`, live region for new offers (`aria-live="polite"`), en/ar, light/dark, 360–1440 px. |
| VII Secure | Pass | Amounts re-checked on the server; decline authorised by the brief key; stamps reveal no data; creator sees only own amount; rate limit on stamp and prices endpoints via existing `X-Shoot-Install` limits. |
| VIII Simplicity | Justified | Answers extended instead of a new collection; polling instead of a realtime vendor. The map pin adds Google Maps Platform and two app packages (Complexity Tracking). |
| IX Designed | Pass | Boards 44–63 approved by the owner 2026-11-17 and in `manifest.json` (research R14); web surfaces through the impeccable gates; one primary action per screen (client: Accept on the top offer; creator: Accept {price}). |

## Project Structure

### Documentation

```text
specs/022-creator-offers/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/mobile-api.md
├── checklists/requirements.md
└── tasks.md   (next: /speckit-tasks)
```

### Source Code

```text
packages/domain/src/booking/offers.ts (+ .test.ts)            # R2, R5–R7, R9 rules
packages/domain/src/pricing/types.ts                          # LineKind += offer, fee
packages/domain/src/booking/notifications.ts                  # offer-new, offer-declined, offer-lost
packages/domain/src/api/v1/{site,brief,booking,inbox,endpoints}.ts + examples/
specs/contracts/mobile-api/v1.schema.json                     # regenerated, additive

apps/web/src/modules/site-settings/globals/quickMatch.ts      # offers group
apps/web/src/modules/brief/{collections/Briefs.ts,commands/send-brief.ts,commands/record-brief.ts,api.ts}
apps/web/src/modules/brief/components/{BriefBuilder.tsx,MatchPreview.tsx → PriceStep}
apps/web/src/modules/booking/{preview-action.ts,match.ts,views.ts,commands/issue-quotation.ts,commands/client-actions.ts,commands/match.ts,collections/Quotations.ts,collections/Notifications.ts}
apps/web/src/modules/booking/components/{MatchResults.tsx,OfferRow.tsx,QuotationView.tsx,DetailsForm.tsx}
apps/web/src/modules/inbox/{collections/BriefAnswers.ts,commands/answer-brief.ts,commands/decline-offer.ts,commands/withdraw-answer.ts,commands/announce-brief.ts,commands/notify-brief.ts,queries.ts,stamps.ts,actions.ts,api.ts,components/BriefCard.tsx,components/InboxList.tsx}
apps/web/src/shared/components/LiveRefresh.tsx                # from PaymentPending pattern
apps/web/src/app/(site)/[locale]/{match/[ref]/[key]/page.tsx,account/inbox/page.tsx,account/page.tsx}
apps/web/src/app/(payload)/api/mobile/v1/{brief-builder/prices,match/[ref]/[key]/offers/decline,match/[ref]/[key]/stamp,me/creator/briefs/stamp}/route.ts
apps/web/src/migrations/<ts>_creator_offers.ts
apps/web/messages/{en,ar}.json                                # offers.*, brief.price*, inbox.offer*
apps/web/src/shared/payload/seed/*                            # templates, settings defaults

apps/mobile/lib/core/push/{push_messaging.dart,push_service.dart}   # onMessage → events stream
apps/mobile/lib/features/brief/presentation/{brief_bar.dart,brief_cubit.dart} + data (prices)
apps/mobile/lib/features/creator_account/{data,domain,presentation/pages/inbox_page.dart,presentation/widgets/offer_sheet.dart,presentation/cubit/inbox_cubit.dart}
apps/mobile/lib/features/quick_match/{data,domain,presentation/pages/match_page.dart,presentation/pages/booking_page.dart,presentation/cubit/match_cubit.dart}
apps/mobile/lib/core/l10n/arb/app_{en,ar}.arb
specs/design-system/canvas/S0*/S07* boards 44–63 + manifest.json   # approved 2026-11-17
PRODUCT.md, specs/ROADMAP.md, CLAUDE.md, specs/003-*/spec.md, specs/019-*/spec.md   # annotations
package.json                                                  # check:scenarios += 022 quickstart
```

**Structure Decision**: no new module. Offers are creators' answers (`inbox`), the client's price is
part of the brief (`brief`), and the offers list and quotation are Quick Match (`booking`). A shared
`LiveRefresh` component sits in `shared/components` because inbox and booking pages both use it.

## Phase 0 and Phase 1 outputs

[research.md](research.md) (R1–R14), [data-model.md](data-model.md),
[contracts/mobile-api.md](contracts/mobile-api.md), [quickstart.md](quickstart.md).

## Delivery notes

- **Order**: domain → migration and schema → brief price (server) → answers with amounts and decline
  → step 2 offers and quotation → notifications → stamps and LiveRefresh → web UI → API contract →
  boards (gate) → app.
- **Owner gates**: boards 44–63 approved 2026-11-17 (including the place step, its states and the place rows);
  still open: a Google Maps Platform project with billing and the keys of research R15; the
  default fee and range before switching on in production. Until the keys arrive, `MAPS_PROVIDER=off`
  keeps the emirate list.
- **Rollout**: ship with the switch off; production gets the migration through the normal Vercel
  build; turn on in admin.
- **Database**: local Docker PostgreSQL or Testcontainers only.

## Complexity Tracking

One justified addition (the place, research R15) and two recorded choices:

| Choice | Why | Simpler or heavier alternative rejected because |
|---|---|---|
| Google Maps Platform (external service: Maps JS, Places, Geocoding, Static Maps) | The owner asked for a required map pin and chose Google (2026-11-17); UAE address and venue search must be good | OpenStreetMap search is weaker for UAE venues; a typed address cannot give creators distance |
| `google_maps_flutter` and `geolocator` (app packages, exact pins) | The app's pin picker and "Use my location" | A WebView map is slow and inaccessible; Places runs through the server so no Places SDK is added |
| `modules/maps` provider (`google`, `off`) | Tests and keyless environments must not call Google; `off` falls back to the emirate list | Calling Google inline would need network mocks in every brief test |
| Change-stamp polling (5 s, visible only) | Live lists on Vercel serverless without a new vendor (owner's choice) | SSE/WebSocket need a long-lived process; Ably/Pusher add a paid vendor and packages; full-page polling costs far more queries |
| Extend `brief-answers` with amounts | Reuses 019's uniqueness, access, outcomes and preconfirm | A new `offers` collection would duplicate them |
