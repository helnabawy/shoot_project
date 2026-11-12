# Implementation Plan: Mobile client account

**Branch**: `claude/013-client-account` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

## Summary

Screens 24 (My account), 25 (Finish your account) and 26 (Your bookings) in `apps/mobile`, at `/account`,
`/account/finish`, `/account/bookings`. The server gains four additive v1 endpoints (module
`apps/web/src/modules/account/`, rules in `packages/domain/src/account/`): `GET me/account`,
`GET me/bookings`, `GET me/briefs`, `PATCH me`. Up next, row statuses, the upcoming/past split and the
finish checklist are computed on the server by pure domain rules (100 % tested) so the app only renders
them. The app feature `features/account/` follows the clean layers (entities, repository interface,
use cases, cubits, pages); booking pages are feature 012's and are reached through a route
(`/account/bookings/:ref`) with a stub destination until 012 lands.

## Technical Context

- Server: TypeScript strict, Payload 3.93 Local API, zod 4 (`packages/domain/src/api/v1`), `defineHandler`.
- App: Flutter stable (pinned), cubits, get_it, ARB (en, ar), `core/widgets` catalogue (007), go_router.
- Tests: Vitest (domain, wire, handlers; integration against PostgreSQL), `flutter_test`, `bloc_test`, `mocktail`, goldens (macOS).
- Schema: `users.accountFinishDismissedAt` (date), `site-settings.accountAbout` (localized text array, max 4); one migration.
- Performance: account home is one request (`me/account`); lists page at 20; no offline storage of personal data.

## Constitution Check

| Principle | Result |
|---|---|
| Spec first, tests first, scenario ids `MK-` | Tasks write tests before code; `pnpm check:scenarios` covers `MK-`. |
| Content in the CMS | "What your account does" lines are `site-settings.accountAbout`; labels/statuses are ARB keys; no profession, price or place in the app. |
| Default-deny access | New endpoints use `auth: 'required'`; every read filters `member = user.id`; no collection access changes. |
| Modular monolith | New module `account` exposes `api.ts` and `index.ts`; it reads bookings/briefs through the Local API. |
| No new package/service | None added. |
| Designed not generated | Canvas boards 24/25/26 are the authority; states without a board become app baselines. |
| API additive only | New endpoints and problem codes only; snapshot updated. |

No violations; Complexity Tracking is empty.

## Project Structure

```text
packages/domain/src/account/        up-next.ts, finish.ts, status.ts (+ tests)
packages/domain/src/api/v1/account.ts, examples/me-account*.json, me-bookings.json, me-briefs.json
apps/web/src/modules/account/       api.ts, commands/*, wire.ts, index.ts
apps/web/src/app/(payload)/api/mobile/v1/me/{account,bookings,briefs}/route.ts, me/route.ts (+PATCH)
apps/web/src/migrations/<ts>_account_finish.{ts,json}
apps/mobile/lib/features/account/{domain,data,presentation}, account_injection.dart
apps/mobile/test/features/account/
```

Shared files touched additively: `endpoints.ts`, `problems.ts`, `v1.schema.json`, `app_routes.dart` (flip
`built`), `app.dart` (register `accountRoutes`), `injection.dart` (one line), ARB files, `api_decoders.dart`.

## Design decisions

See [research.md](research.md), [data-model.md](data-model.md), [contracts/account-api.md](contracts/account-api.md),
[quickstart.md](quickstart.md).
