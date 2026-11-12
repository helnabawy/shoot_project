# Implementation Plan: Mobile first visit and landing

**Branch**: `claude/010-first-visit-landing` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

## Summary

The Flutter app's front door: splash (01), three learning steps (02-04), the landing (05: hero with
the Brief Bar, occasion tiles, creator strip with Pause, creators band, closing) and the menu (06).
Almost all content already has an endpoint (`landing`, `brief-builder`, `site`, `creators`,
`personas`, feature 008) and a Dart repository (features `landing`, `site`, `creators`). The one
missing server piece is recording a brief: v1 has no brief endpoint, so this feature adds
`POST /api/mobile/v1/briefs` (additive). Everything else is app work.

- **Brief engine** (pure Dart, `features/brief/domain/`): the step machine of 001 FR-067 (answers,
  next unanswered step, persona-dependent option filtering, clearing answers that stop being
  offered, take-back, search across steps, past-date refusal in the business zone, sentence
  composition). Tested without Flutter.
- **BriefCubit** (app-scoped singleton, in memory: the half-built brief lives while the app is
  open); the Brief Bar widget renders it; screen 05 hosts it; occasion tiles and "Start your
  brief" drive it.
- **First visit**: `WelcomeCubit` and `/welcome/:step` (0 = splash, 1-3 = learning steps; the route
  table and `firstRunRedirect` already reserve it).
- **Landing**: a fixed app layout of the four designed sections fed by the CMS landing sections
  (research R2). `AmbientPause` gains an optional persisted state (R6).
- **Menu**: route `/menu` (full-screen page): language, theme, WhatsApp, legal, editor sign-in.

## Technical Context

**Language/Version**: Dart 3.13.7 / Flutter 3.47.9 (`apps/mobile`); TypeScript strict, Node 24.
**Primary Dependencies**: existing only (`flutter_bloc`, `get_it`, `go_router`, `dio`,
`url_launcher`, `shared_preferences`). No new package.
**Storage**: device `PreferencesStore` (`firstRun.welcomeSeen` exists; adds `landing.motionPaused`);
server: existing `briefs` collection, no migration.
**Testing**: `flutter_test`, `bloc_test`, `mocktail`; goldens via `tool/goldens.sh` (macOS); Vitest
for the endpoint contract; scenario ids `ML-US<n>-S<m>` in test names.
**Target Platform**: iOS and Android phones, iPad (centred 600 px column).
**Performance Goals**: bar tappable within 2.5 s (SC-002); splash <= 2 s; self-started motion on
01-04 and 06 ends within 5 s (FR-034).
**Constraints**: logical start/end only; 44 px targets; reduced motion = still; no content
constants (FR-052); fidelity thresholds 0.01 (0.02 text-heavy).
**Scale/Scope**: 6 screens, 1 endpoint, 4 cubits, a handful of feature widgets.

## Constitution Check

| Principle | Status | How |
|---|---|---|
| I Spec-driven | Pass | spec, plan, tasks, analyze precede code; the two clarifications are resolved in research R1, R2. |
| II Performance | Pass | no web bytes; one POST; landing reads cached public endpoints. |
| III Test-first | Pass | each task group starts with failing tests named by scenario id. |
| IV Content in CMS | Pass | hero, bar, tiles, creators, band, closing, learning text, WhatsApp number and message come from the API; only interface labels are in ARB. Splash artwork is brand art (spec Assumptions). `kMinStripCreators` is a layout constant, not content (R4). |
| V Modular | Pass | `features/{brief,welcome,landing,menu}`; wiring through each feature's `*_injection.dart` and `*_routes.dart`. |
| VI Accessible, bilingual, themed | Pass | semantics per FR-054, logical edges, four-variant goldens. |
| VII Secure | Pass | `POST briefs` is public by design (as the website action): visitor allowance (`consumeBriefAllowance`), duplicate window, server-side option validation, labels re-derived from the CMS, no PII logged. |
| VIII Simplicity | Pass | no new package; fixed layout rather than a block renderer. |
| IX Designed, not generated | Gate | boards are the authority; fidelity goldens; no invented proof (R1); one primary action per screen. |

## Project Structure

```text
specs/010-first-visit-landing/  spec.md plan.md research.md data-model.md quickstart.md tasks.md
                                contracts/{briefs-api.md, landing-composition.md}

packages/domain/src/api/v1/{brief.ts (+test), endpoints.ts (+briefRecord), examples/brief-*.json}
specs/contracts/mobile-api/v1.schema.json            # regenerated, additive
apps/web/src/modules/brief/{commands/record-brief.ts, api.ts (+recordBriefV1)}
apps/web/src/app/(payload)/api/mobile/v1/briefs/route.ts

apps/mobile/lib/
  core/motion/ambient_pause.dart            # + persisted state (additive)
  core/preferences/preferences_store.dart   # + landing.motionPaused (additive)
  core/l10n/arb/app_{en,ar}.arb             # + ml* keys (additive, prefixed)
  core/routing/{app_routes.dart,app_router.dart}   # flip built flags; splash target
  features/brief/{domain,data,presentation}        # engine, repository, BriefCubit, BriefBar
  features/welcome/{domain,presentation}           # splash, three steps, WelcomeCubit
  features/landing/presentation/                   # landing page and sections
  features/menu/presentation/                      # menu page
  features/{brief,welcome,landing,menu}/*_injection.dart, *_routes.dart
apps/mobile/test/ mirrors lib; test/goldens/screens/{01..06}_*_golden_test.dart
tools/design-fidelity/shipped.json                 # + 010-first-visit-landing (after goldens pass)
```

**Structure Decision**: home becomes the landing; `/welcome/:step` and `/menu` are feature route
lists passed through `routes:` (the shape 009 used), so sibling features append to the same lists.

## Complexity Tracking

| Addition | Why | Simpler rejected because |
|---|---|---|
| `POST /briefs` endpoint | The app must record a brief; v1 has none. | The website server action needs cookies and Next form state; a native app cannot call it. |
| Record-brief command duplicates the recording half of `brief/actions.ts` | Extracting a shared command means refactoring a file siblings may touch. | Widens the merge surface; follow-up task T060 records the extraction. |
