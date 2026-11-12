# Implementation Plan: Mobile Quick Match and booking

**Branch**: `claude/012-mobile-quick-match` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: `specs/012-mobile-quick-match/spec.md` (screens 07–14 and 40).

## Summary

The app gets Quick Match steps 2–4 and the booking pages, with the website's business rules and no
new rules of its own.

- **Server.** The website's booking server actions (`modules/booking/actions.ts`) keep their
  bodies in new `modules/booking/commands/` files that both the actions and the new mobile API
  call (008's extraction rule): `match` (step 2 read), `issue-quotation`, `accept-quotation`,
  `confirm-delivery`, `report-problem`, `fresh-quotation`, `pick-another`, plus a read model
  `quotation-view`. The website's actions become thin wrappers; their behaviour is unchanged and
  the existing integration suites (`booking-*.int.test.ts`) stay green.
- **API.** Eight additive endpoints under `/api/mobile/v1` (contracts/booking-api.md), registered
  in 008's registry and the JSON-schema snapshot, through `defineHandler`. The private key is in
  the path (as the website's `/q/{ref}/{key}`), so no account is needed to read or act; the issue
  endpoint requires a token (the number step is feature 009's).
- **Schema.** `bookings` gains a `details` group (start time, duration option, venue, note) and
  a migration; the quotation already freezes lines and totals.
- **App.** `apps/mobile/lib/features/quick_match/` (clean layers, cubits, get_it): the match
  cubit and screens 07/08, the details cubit and screen 09, the sign-in-at-the-end flow reusing
  009's `core/auth` and the OTP widgets for screens 10/11, the quotation cubit and the one
  booking-status screen (12, 13, 14, 40 and the board-less states) with its report sheet. The
  routes the table already lists (`/match/:ref/:key[/details|/number|/code]`, `/q/:ref/:key`)
  become built; deep links work through the `/ar` prefix handling already in the router.
- **Fidelity.** Screens join the golden and pixel-diff check through 007's pipeline.

## Technical Context

**Language/Version**: TypeScript strict on Node 24; Dart 3.13.7 / Flutter 3.47.9.

**Primary Dependencies**: existing only. `defineHandler`, `quotePrice`, `matchCreators`,
`applyTransition`/`applyChange` (003), 009's `request-code`/`verify-code` commands and
`SessionCubit`, `url_launcher` (009), 007's widgets (`SnapCarousel`, `StepStrip`, `OtpCodeInput`,
`PhoneField`, `QuoteLines`, `StatusBadge`, `ProgressBar`, `SummaryRow`, `TopHit`, `Money`).
**No new package** on either side.

**Storage**: PostgreSQL via Payload; migration for `bookings.details_*`. Device: nothing new
(details are kept only while the app is open, per spec).

**Testing**: Vitest unit (domain contract, wire mappers), integration on Testcontainers PostgreSQL
(`mobile-api-booking-*.int.test.ts`), `flutter_test`/`bloc_test`/`mocktail`, goldens through
`tool/goldens.sh`, `pnpm check:scenarios` for `MQ-` ids. (The website's 003 tests use `QM-`.)

**Target Platform**: web API (Linux); iOS and Android.

**Performance Goals**: step 2 answers in < 2 s p95 (SC-002): the website's step-2 queries plus one
gallery query; the answer is per person and date-dependent, so not cached.

**Constraints**: payments never in the app (FR-034); no phone in logs; creator never sees the
client's phone (FR-018); API v1 additive only; copy and prices from the API (FR-042).

**Scale/Scope**: 8 endpoints, 1 migration, 9 screens + 1 sheet, 3 cubits.

## Constitution Check

| Principle | Status | How |
|---|---|---|
| I Spec-driven | Pass | spec, plan, tasks, analyze, implement. FR-024's clarification is resolved by a default in research R1 and flagged for the owner. |
| II Budgets | Pass | No web payload change; the app adds no package. |
| III Test-first | Pass | Each scenario `MQ-USn-Sm` has a named test (quickstart.md). |
| IV Content in CMS | Pass | Prices, includes, durations, places, personas, payment copy and windows come from the API; the app holds interface strings only. |
| V Modular | Pass | Commands in `modules/booking/commands/`, adapters in `modules/booking/api.ts`, rules unchanged in `packages/domain`. App feature isolated under `features/quick_match/`. |
| VI Accessible, bilingual, themed | Pass | Four variants; 44 px; carousel operable by taps and semantics actions. |
| VII Secure by default | Pass | Key checked in constant time (existing `keyMatches`); issue needs a Bearer token; double tap idempotent; creator never sees the phone; issue is rate limited (existing `quoteLimitPerHour`). |
| VIII Simplicity | Pass | No new package, collection or service; one migration (four nullable columns). |
| IX Designed | Pass | Boards are the authority; pixel diff. |

No violations; Complexity Tracking is empty.

## Project Structure

```text
packages/domain/src/api/v1/booking.ts        # zod shapes (matchV1, quotationRequestV1, bookingViewV1 ...)
packages/domain/src/api/v1/examples/*.json   # one example per answer
apps/web/src/modules/booking/commands/       # match.ts issue-quotation.ts accept-quotation.ts ...
apps/web/src/modules/booking/wire.ts         # mappers to the v1 shapes
apps/web/src/modules/booking/api.ts          # defineHandler adapters
apps/web/src/app/(payload)/api/mobile/v1/match/** and quotations/**  # route.ts re-exports
apps/web/src/migrations/<ts>_booking_details.ts
apps/mobile/lib/features/quick_match/{data,domain,presentation}/ + quick_match_injection.dart
apps/mobile/lib/core/routing/app_routes.dart  # flip built: true (additive)
apps/mobile/lib/core/l10n/arb/app_{en,ar}.arb # additive keys, prefix quickMatch*
```

## Phase 0 and Phase 1 outputs

[research.md](research.md), [data-model.md](data-model.md), [contracts/booking-api.md](contracts/booking-api.md),
[quickstart.md](quickstart.md).
