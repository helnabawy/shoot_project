# Implementation Plan: Mobile creator account

**Branch**: `claude/014-creator-account` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

## Summary

Screens 27 to 32 of the app (My account, My profile in three states, Availability, Bookings) for a
signed-in creator, at the website's paths. The web app already holds every rule (002 editor, 003
availability and creator answers); the app cannot call server actions, so this feature adds an
additive group of creator endpoints under `/api/mobile/v1/me/creator/…` backed by commands. The app
side is one feature, `features/creator_account/`, built from the 007 widget catalogue.

- **Rules**: reused from `packages/domain/src/creators` (`profileStrength`, `missingForReview`,
  `identity*`, `PROFILE_STEPS`, limits) and `packages/domain/src/booking` (`respond`, assignments);
  nothing is re-implemented. New domain code is only the wire contract
  (`api/v1/creator-account.ts`), at 100 % coverage.
- **Server**: commands in `modules/creators/commands/` and `modules/booking/commands/`, each taking
  `ActorContext`; handlers in `modules/creators/api-account.ts` and `modules/booking/api-creator.ts`.
  The web server actions stay as they are (their regression tests unchanged); the commands use the same
  Payload calls so behaviour is identical (Complexity Tracking).
- **App**: domain (entities, repository contracts, use cases), data (models decoding the shared JSON
  examples, datasource, repository), presentation (cubits, six pages). Routes `/account`,
  `/account/profile`, `/account/availability`, `/account/bookings`, `/account/bookings/:ref`.
- **Uploads**: JSON with base64 (`contentType`, `filename`, `data`) because `defineHandler` reads JSON
  bodies only. Picking a photo, camera or file needs `image_picker` and `file_picker`; they are not
  added (owner decision, see Complexity Tracking); the app depends on a `FilePicker` port whose
  platform implementation is the open item.

## Technical Context

TypeScript strict, Node 24; Dart 3.13.7 / Flutter 3.47.9; zod 4.6.7; Payload 3.93; Vitest (unit,
integration on Testcontainers PostgreSQL); `flutter_test`, `bloc_test`, `mocktail`. Performance: the
profile and bookings reads are single calls (one find per collection, ids batched); the availability
toggle answers the window only. Scale: one creator's data, under 100 bookings.

## Constitution Check

| Principle | Status |
|---|---|
| I Spec first | spec, plan, tasks before code |
| IV Content in the CMS | professions, specialties, emirates, languages, countries come from the profile endpoint's `options`; step names and state lines are interface strings (ARB) built from codes |
| V One deployable | endpoints inside the web app, additive v1 only |
| VII Secure by default | creator-only (`accountType === 'provider'`), own rows only, the client's number and others' gender never in any answer, identity files never returned (state and note only) |
| VI/VIII Responsive, accessible, themed, bilingual | 44 px targets, labels, RTL, 5 s motion cap |
| IX Designed not generated | boards 27 to 32 are the authority; one primary action per screen |
| Tests first | every `MW-USn-Sm` has a named test |

## Complexity Tracking

| Item | Why | Simpler alternative rejected |
|---|---|---|
| Commands mirror action bodies instead of refactoring `actions.ts` | the web actions read FormData, cookies and redirects; touching them risks 002/003 regressions while sibling features change shared files | refactor now: larger blast radius, merge conflicts |
| Base64 JSON uploads | `defineHandler` parses JSON only (008); 5 MB max keeps bodies near 7 MB | multipart: new wrapper path, a 008 change |
| `image_picker`, `file_picker` (not added) | camera, library, file access | none; a `FilePicker` port keeps the app testable; owner approves the packages |

## Project Structure

```text
packages/domain/src/api/v1/creator-account.ts (+ examples/creator-*.json)
apps/web/src/modules/creators/{commands/*,api-account.ts}
apps/web/src/modules/booking/{commands/*,api-creator.ts}
apps/web/src/app/(payload)/api/mobile/v1/me/creator/**/route.ts
apps/mobile/lib/features/creator_account/{domain,data,presentation,creator_account_injection.dart}
apps/mobile/test/features/creator_account/**
```
