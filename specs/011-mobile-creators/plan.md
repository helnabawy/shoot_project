# Implementation Plan: Mobile creators

**Branch**: `claude/011-mobile-creators` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-mobile-creators/spec.md`

## Summary

Screens 15 (directory), 16 (profile), 17 (book this creator), 18 (work by specialty) and 19 (hire
page) of the Flutter app, at the website's paths. All data already comes from 008's read endpoints
(`creators`, `creators/{code}`, `work/{specialty}`, `hire/{slug}`) through `features/creators/`
(datasource, repository and models exist; this feature adds use cases, cubits, pages, routes and
strings). No web change.

- **Directory (15).** `DirectoryCubit` holds the query (type, place and specialty slugs), the pages
  loaded so far and the count; "Show more" appends page n+1; the cubit lives in a `ShellRoute` so
  filters and the scroll position survive a visit to a profile (FR-032). Filter chips come from
  the answer's `filters` (the API already hides the type group when one persona is active).
- **Profile (16).** `ProfileCubit` loads one profile; a sample viewer (full screen, swipe) and
  the actions (WhatsApp, share, links) go through injectable ports (`UrlOpener`, `ShareLink`).
- **Book (17) and Hire (19).** One feature-local `BriefCubit` drives the brief from
  `GET brief-builder` (the sentence, slots and options are CMS data). 17 fixes the creator and
  narrows the persona and place slots to the creator's types and emirates; 19 starts from the
  page's `preset` and leaves a word open when its preset is not an option any more (FR-051).
  A complete brief opens WhatsApp with the composed message and the creator line (the fallback the
  spec allows until feature 012; 012 replaces the single `BriefSubmit` port).
- **Specialty (18).** `SpecialtyCubit` over `getSpecialty`, emirate filter applied on the device
  (the page carries every listed creator), counts recomputed from what is shown.
- **Strings.** Interface text in both ARB files with the `mc` prefix; product words from the API.
- **Fidelity.** Screen goldens 15-19 in four variants plus the app's own baselines with the 007
  helpers.

## Technical Context

**Language/Version**: Dart 3.13 / Flutter 3.47.9 (pinned), `apps/mobile` only.

**Primary Dependencies**: existing (`flutter_bloc`, `go_router`, `get_it`, `dio`, `url_launcher`);
new: `share_plus` 13.3.1 (Complexity Tracking).

**Storage**: none (filters live in a cubit while the app is open).

**Testing**: `flutter_test`, `bloc_test`, `mocktail`; shared JSON examples from
`packages/domain/src/api/v1/examples/`; goldens via `tool/goldens.sh`; `pnpm check:scenarios`.

**Target Platform**: iOS (iPhone, iPad) and Android.

**Project Type**: mobile app (feature module).

**Performance Goals**: profile content after one request; lists page as the API pages; images
through `ShootImage` at the rendered size.

**Constraints**: one primary action per screen; touch targets 44; works at text scale 2 and 360 px;
motion ends within 5 s, none under reduced motion; no profession, place or price in code.

**Scale/Scope**: 5 screens, 1 viewer, about 10 new widgets, 5 cubits.

## Constitution Check

| Principle | Status |
|---|---|
| I Spec first | spec, plan, tasks exist before code |
| II Tests first | every task group starts with its failing tests; ids `MC-USn-Sm` |
| III Domain core / clean layers | domain (entities, use cases, brief rules) pure Dart; Dio only in data |
| V CMS data, no constants | words from API; ARB only for interface strings (R9) |
| VI Mobile-first, a11y, RTL, theme | logical edges, semantics per FR-064, four variants |
| VIII Package policy | one new package, justified below |
| IX Simple client flow | one `TopHit` per screen; no sign-in; no invented proof (no ratings, no prices) |

No violations. Post-design re-check: R1 and R2 keep "no invented data" by leaving unsupported facts
out, not by writing placeholders.

## Complexity Tracking

| Addition | Why | Simpler alternative rejected |
|---|---|---|
| `share_plus` 13.3.1 | FR-013 asks for the system share sheet | `Clipboard` only: not a share sheet; hand-written platform channels |
| Feature-local `BriefCubit` | 010 builds the landing brief in parallel and none is shared yet | waiting for 010 blocks 17 and 19; it reads only 008's `BriefBuilder` and moves to `core/` when 010 lands |

## Project Structure

```text
specs/011-mobile-creators/  spec.md plan.md research.md data-model.md quickstart.md tasks.md contracts/
apps/mobile/lib/features/creators/
  domain/  entities/ (existing)  usecases/  brief/ (pure rules)
  data/    (existing)
  presentation/
    cubit/    directory_cubit  profile_cubit  specialty_cubit  hire_cubit  brief_cubit
    pages/    directory_page  profile_page  book_page  specialty_page  hire_page  sample_viewer
    widgets/  creator_directory_card  creator_row  filter_chips  profile_panel  sample_grid
              brief_bar  faq_list
    creators_routes.dart
apps/mobile/lib/core/web/share_link.dart            ShareLink port (injectable)
apps/mobile/test/features/creators/...  apps/mobile/test/goldens/screens/{15..19}_*_golden_test.dart
```

Shared files edited additively: `app.dart` (one `...creatorsRoutes(...)` line), `app_routes.dart`
(`built: true` on five rows), `creators_injection.dart`, the two ARB files (a block of `mc*` keys
at the end), `pubspec.yaml` (one line), README package table (one row).
