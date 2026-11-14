# Implementation Plan: Creator brief inbox

**Branch**: `019-creator-brief-inbox` (own worktree) | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: `specs/019-creator-brief-inbox/spec.md`, clarified 2026-11-13 (five owner decisions).

## Summary

Live creators see the open client briefs that match them, using the Quick Match step 2 rules, and accept
or reject each one, on the website (`/account` Up next and a new `/account/inbox`) and in the app (the
creator account's Up next and a new inbox screen). Several creators may accept one brief. The client's
step 2 lists acceptors first, marked "said yes", and a picked acceptor's assignment starts confirmed when
the quotation is accepted. Rejections hide the brief for that creator, with an optional content reason,
and can be undone. Clients hear about acceptances by app push, in-app notification and the private link.
Matching creators get a push when a new brief arrives. Push is new: Firebase Cloud Messaging for iPhone
and Android, called from the server over HTTP with no Google SDK.

- **Domain** (`packages/domain/src/booking/inbox.ts`): `isBriefOpen`, `briefMatchesCreator` (wraps
  `matchCreators`), `inboxSections`, `acceptorsFirst`, `preconfirm`; new notification events and the
  `push` channel; v1 zod shapes `inbox.ts`, `push.ts`.
- **Web modules**: new `modules/inbox/` (collection `brief-answers`, queries, commands `answer-brief`,
  `withdraw-answer`, `announce-brief`, `notify-brief`, server actions, `api.ts`, components) and new
  `modules/push/` (collection `push-devices`, provider interface, `fcm` and `console` providers,
  `api.ts`). Changes in `booking` (step 2 ordering and `saidYes`, `acceptQuotation` preconfirm,
  notifications schema), `brief` (call `announceBrief` after create; `answers` join), `auth` (Up next
  kind `briefs`, `users.pushEnabled`).
- **App**: inbox page and cubit, Up next `briefs`, a reject sheet (in `features/creator_account/`), and
  `core/push/` (Firebase start-up, permission, token registration, tap routing, preference cubit, the
  switch on the menu page).

## Technical Context

**Language/Version**: TypeScript strict on Node 24; Dart 3.13.7 / Flutter 3.47.9 (pinned in the app
README).

**Primary Dependencies**: Existing: Payload 3.93, Next 16 (`after()` from `next/server`), next-intl,
zod, `defineHandler`, `matchCreators`, `briefFacts`, `notify`, `blockDateFor`, `applyTransition`.
**New (app only)**: `firebase_core` and `firebase_messaging`, exact pins (Complexity Tracking). Server:
no new package (FCM HTTP v1 through `fetch` with an RS256 JWT from `node:crypto`).

**Storage**: PostgreSQL via Payload: new `brief_answers` and `push_devices` tables, new columns on
`notifications`, `users` and `site_settings`, one committed migration. Device: the FCM token is held by
Firebase; the app stores nothing new.

**Testing**: Vitest unit (domain 100 %), integration on Testcontainers PostgreSQL (inbox, notify,
announce, push devices, step 2 acceptors, mobile API contract), component tests (Up next, inbox list,
reject form), one Playwright journey (creator accepts, client sees "said yes"); Flutter `bloc_test`
(inbox, account, push), widget tests (inbox page, reject sheet, Up next, menu switch) in en and ar, and
the board's golden through `tool/goldens.sh` with `pnpm fidelity`. `pnpm check:scenarios` gains
`specs/019-creator-brief-inbox/quickstart.md`.

**Target Platform**: web (Vercel, Linux); iOS (iPhone and iPad) and Android.

**Project Type**: modular-monolith web app + Flutter mobile app.

**Performance Goals**: account home and inbox respond in < 2 s p95 (SC-001). Inbox read = one open-briefs
query (≤ 200 rows), one blocked-days query for the creator, one answers query, the cached landing slots
and the public-creator summary, then matching in memory. Push sending never blocks a request (`after()`).

**Constraints**: no client contact details in inbox views or pushes (FR-004, FR-019); v1 additive only
(FR-012); professions and reasons from content (FR-013); `apps/web/.env` targets production, so
migrations, seeds and tests use local Docker or Testcontainers only.

**Scale/Scope**: 2 collections, 1 migration, 7 endpoints (+2 additive fields), 1 web page + Up next
kind, 1 app screen + 1 sheet + Up next kind + menu switch, 3 cubits, 1 canvas board.

## Constitution Check

*Gate before Phase 0, re-checked after Phase 1: pass, with one justified addition.*

| Principle | Status | How |
|---|---|---|
| I Spec-driven | Pass | Spec clarified with the owner; one assumption amended from R2 (window for briefs without a date) before planning. |
| II Budgets | Pass | `/account` and `/account/inbox` are signed-in pages, server-rendered; the inbox's only client JS is the reject form's disclosure. The landing page is untouched. |
| III Test-first | Pass | Every `BI-` scenario has a named test (quickstart.md); domain at 100 %; integration against Testcontainers. |
| IV Content in CMS | Pass | Reasons (option set), push and in-app texts (site-settings templates), the open window (`inboxDays`), professions and emirates are content. |
| V Modular | Pass | New `inbox` and `push` modules, cross-module imports through `index.ts`; rules in `packages/domain`; the app reads only the API. |
| VI Accessible, bilingual, themed | Pass | New UI in en/ar, light/dark, 360–1440 px, 44 px targets; app checked at the largest text size with VoiceOver and TalkBack. |
| VII Secure by default | Pass | Explicit access on both collections (default deny); the inbox is provider-only and scoped to the caller; tokens and service-account key never logged; push and inbox texts exclude PII; the FCM key comes from env, validated at start-up when `PUSH_PROVIDER=fcm`. The client's acceptance push carries the brief's step-2 path with its private key; it goes only to that member's own registered devices through FCM, and the same key is already in the WhatsApp message the client received. |
| VIII Simplicity | Justified | Two app packages and one external service (FCM); see Complexity Tracking. |
| IX Designed | Pass | One canvas board for the inbox, the reject sheet and the Up next state, drawn with impeccable and approved by the owner before the app builds to it; website page in "The Brief Bar" world through the impeccable gates. |

## Project Structure

### Documentation (this feature)

```text
specs/019-creator-brief-inbox/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/mobile-api.md
├── checklists/requirements.md
└── tasks.md   (next: /speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/booking/inbox.ts (+ .test.ts)          # R1, R2, R5 rules
packages/domain/src/booking/notifications.ts               # brief-accepted, brief-new, push channel
packages/domain/src/api/v1/{inbox,push}.ts, endpoints.ts, creator-account.ts (briefs?), booking.ts (saidYes?)
packages/domain/src/api/v1/examples/{creator-briefs*,push-*}.json
specs/contracts/mobile-api/v1.schema.json                  # regenerated, additive

apps/web/src/modules/inbox/
├── collections/BriefAnswers.ts
├── queries.ts            # openBriefsFor(creator), inboxView, briefsSummary
├── commands/{answer-brief,withdraw-answer,announce-brief,notify-brief}.ts
├── actions.ts  api.ts  index.ts
├── components/{InboxList,BriefCard,RejectForm}.tsx
└── tests/*.int.test.ts
apps/web/src/modules/push/
├── collections/PushDevices.ts
├── providers/{fcm,console,index}.ts   # PushProvider, chosen by PUSH_PROVIDER (same shape as auth/otp/providers)
├── send.ts  api.ts  index.ts
└── tests/
apps/web/src/modules/booking/{match.ts,views.ts,components/CreatorPickRow.tsx,commands/client-actions.ts,commands/match.ts,collections/Notifications.ts}
apps/web/src/modules/brief/{actions.ts,commands/record-brief.ts,collections/Briefs.ts}
apps/web/src/modules/auth/{account-home.ts,components/AccountHome.tsx,collections/Users.ts}
apps/web/src/app/(site)/[locale]/account/inbox/page.tsx
apps/web/src/app/(payload)/api/mobile/v1/me/creator/briefs/**, me/push/** (route.ts re-exports)
apps/web/src/migrations/<ts>_brief_inbox.ts
apps/web/messages/{en,ar}.json                              # account.next.briefs*, inbox.*
apps/web/src/shared/payload/seed/*                                         # reasons, templates, inboxDays
.env.example                                                # PUSH_PROVIDER, FCM_SERVICE_ACCOUNT

apps/mobile/lib/features/creator_account/
├── data/{models,datasources,repositories}                  # briefs + answer + withdraw
├── domain/entities/inbox.dart
└── presentation/{cubit/inbox_cubit.dart,pages/inbox_page.dart,widgets/reject_sheet.dart}, account_page.dart (UpNextKind.briefs)
apps/mobile/lib/core/push/{push_service.dart,push_api.dart,push_cubit.dart}
apps/mobile/lib/core/auth/session_cubit.dart               # unregister before logout
apps/mobile/lib/features/menu/presentation/menu_page.dart  # push switch
apps/mobile/lib/core/routing/app_routes.dart               # /account/inbox
apps/mobile/lib/core/l10n/arb/app_{en,ar}.arb              # inbox*, push* keys
apps/mobile/{ios/Runner/Runner.entitlements,ios/Runner/Info.plist,android/app/build.gradle.kts}
specs/design-system/canvas/<board>.html + manifest.json     # inbox board
package.json                                                # check:scenarios += 019 quickstart
```

**Structure Decision**: Two new web modules (`inbox`, `push`) because the inbox is neither the client's
brief nor a booking, and push will serve feature 018 later. The app keeps the inbox inside
`creator_account` (same screens family, same repository) and puts push in `core/` because both clients
and creators use it.

## Phase 0 and Phase 1 outputs

[research.md](research.md) (R1–R11), [data-model.md](data-model.md),
[contracts/mobile-api.md](contracts/mobile-api.md), [quickstart.md](quickstart.md).

## Delivery notes

- **Owner inputs before push can be proven on a device**: a Firebase project with the iOS and Android
  apps, an APNs key uploaded to it, the two config files, and the service-account JSON for Vercel
  (`FCM_SERVICE_ACCOUNT`, `PUSH_PROVIDER=fcm`). Until then everything runs and is tested with the
  `console` provider, and app builds without config files simply have push off.
- **Received 2026-11-13**: Firebase project `shoot-ba18c`; Android `google-services.json` and iOS
  `GoogleService-Info.plist` for `ae.shoot.mobile`, placed at `apps/mobile/android/app/` and
  `apps/mobile/ios/Runner/` and git-ignored (CI builds need them supplied as secrets, T049). The iOS
  plist still has to be added to the Runner target's resources in Xcode (T049). The web app config the
  owner sent is not used: there is no browser push. **Still missing**: the APNs key uploaded in the
  Firebase console, and the service-account JSON for `FCM_SERVICE_ACCOUNT`.
- **Database**: migration and seeds run against the local Docker PostgreSQL or Testcontainers only;
  production gets the migration through the normal Vercel build after merge.
- **Order**: domain → schema + migration → inbox reads → answers → step 2 / preconfirm → notifications
  → push server → app inbox → app push → design gates.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `firebase_core` + `firebase_messaging` (app) | The owner chose app push both ways (clarification Q4/Q5); iOS and Android push need the platform token and tap handling | Writing native APNs + FCM channels by hand is far more code; polling is not push |
| Firebase Cloud Messaging (external service) | One free service that delivers to both platforms | Direct APNs + FCM means two integrations; OneSignal/Expo add a third party and an SDK |
| `modules/push` provider interface (`fcm`, `console`) | Tests and local runs must not reach Google; the provider is swapped by env | Calling FCM inline would make every brief and accept test need network mocks |
| New `brief-answers` and `push-devices` collections | Per-creator answers need their own rows (unique, concurrent, access scoped to the creator); devices are many per user | Arrays on `briefs` / `users` cannot be scoped to one creator or updated concurrently |
