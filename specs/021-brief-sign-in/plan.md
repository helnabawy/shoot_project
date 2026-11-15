# Implementation Plan: Sign in to send a brief

**Branch**: `021-brief-sign-in` (worktree `claude/021-brief-sign-in-11a95e`) | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/021-brief-sign-in/spec.md`

## Summary

A guest still builds a brief, but recording it needs a signed-in member while the new site-settings
switch `briefNeedsSignIn` is on (default on). On the website the brief server action validates the
guest's brief as today, then, instead of recording it, keeps it in a short-lived first-party cookie
(`shoot-brief`, one hour, answers only) and sends the guest to `/login?next=/brief/send&for=brief`.
The sign-in pages show the kept sentence, skip the client-or-creator question for a new number
(becomes a client), and finish on `GET /brief/send`, a route handler that records the kept brief as
the member through the same core as the action and redirects to Quick Match (or WhatsApp). The brief
builder restores its answers from the cookie when the guest comes back without sending, and shows the
server's message when the kept brief could not be sent. In the app, `GET brief-builder` gains an
additive `signInRequired` flag; the app's `BriefCubit` sends a signed-out person to the sign-in
screens (`?for=brief`), keeps the in-memory draft, and sends it automatically when the session signs
in. `POST briefs` answers `401 brief.errors.signInRequired` for a guest while the switch is on.

## Technical Context

**Language/Version**: TypeScript 5 strict (Node 24), Dart 3 / Flutter stable (pinned in `apps/mobile/README.md`)

**Primary Dependencies**: Next.js 16, React 19, Payload 3.93, next-intl 4.14, zod 4; Flutter with `flutter_bloc`, `go_router`, `get_it`, `dio` (all existing; no new package)

**Storage**: PostgreSQL via Payload: one new column on the `site-settings` global (`brief_needs_sign_in`), committed migration; the kept brief is a browser cookie (website) or memory (app), never a table

**Testing**: Vitest (domain unit 100 %, component tests for the builder and auth forms, integration against Testcontainers PostgreSQL for the action, the route handler, the login pages' actions and `POST briefs`), Playwright e2e for the guest journey, `flutter_test` / `bloc_test` / `mocktail` for the app

**Target Platform**: the website (mobile-first, works without JavaScript) and the Shoot app on iOS and Android

**Project Type**: web app + mobile app (modular monolith `apps/web`, framework-free rules in `packages/domain`, Flutter `apps/mobile`)

**Performance Goals**: landing JS ≤ 200 KB (no new client dependency; the cookie reader is a few hundred bytes); the home page stays static (signed-in state is learned in the browser through the existing `/api/session` request)

**Constraints**: v1 mobile API additive only; the kept brief holds no number, code or session (FR-017); every string in `messages/{en,ar}.json` and the ARB files; logical CSS only

**Scale/Scope**: 5 user stories, 17 FRs; ~15 web files, ~10 app files, 1 migration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Spec-driven | spec → plan → tasks → analyze → implement | Pass |
| II. Performance | home page stays static; no new client package; one cookie read on mount | Pass |
| III. Test-first | every `BS-` scenario mapped in quickstart.md, tests written first | Pass |
| IV. CMS | the switch is a site setting; trust-chip copy is CMS data (seed updated, live copy is the owner's edit); interface strings in message files | Pass |
| V. Modules | kept-brief rules in `packages/domain/src/brief/kept.ts`; `modules/brief` owns the cookie, the route handler re-exports from it; auth reads the intent through its own `pending` cookie | Pass |
| VI. Responsive / bilingual / themed | the login page's brief panel and the guest line use existing bar components and tokens; verified 360–1440, EN/AR, light/dark | Pass (verified in implementation) |
| VII. Secure | server re-validates the kept brief; cookie holds answers only, `SameSite=Lax`, `Secure` in production, one hour; `next` stays a same-site path (`safeNext`); recording without a member refused server-side on every channel | Pass |
| VIII. Simplicity | no draft collection, no new service; one switch (justified below) | Pass with justification |
| IX. Designed, not generated | **amended to 1.5.0 by this feature**: building stays account-free, sending may ask for sign-in, the brief is kept; WhatsApp stays open; one primary action per screen kept | Pass after amendment |

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/021-brief-sign-in/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/
│   ├── web-flow.md        # the action states, cookie, /login?for=brief, GET /brief/send
│   └── mobile-api.md      # briefBuilder.signInRequired, POST briefs 401
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/domain/src/
├── brief/kept.ts (+ kept.test.ts)            # encode/decode/freshness of the kept brief, field filter
└── api/v1/site.ts, problems.ts, examples/    # signInRequired flag, brief.errors.signInRequired

apps/web/src/
├── modules/site-settings/globals/SiteSettings.ts   # briefNeedsSignIn checkbox (default on)
├── modules/brief/
│   ├── actions.ts            # submitBrief: guest + switch on → keep and go to sign-in
│   ├── commands/send-brief.ts# the recording core shared by the action and GET /brief/send
│   ├── kept-cookie.ts        # server read/write/clear of `shoot-brief`
│   ├── send-route.ts         # GET /brief/send handler body
│   ├── commands/record-brief.ts # POST briefs: 401 for a guest when the switch is on
│   ├── wire.ts / api.ts      # signInRequired on GET brief-builder
│   └── components/BriefBuilder.tsx  # signIn state, restore from the kept brief, guest line
├── modules/auth/
│   ├── pending.ts            # intent: 'brief'
│   ├── actions.ts            # request/verify: brief intent signs a new number up as a client
│   └── components/{PhoneStep,CodeStep,KeptBrief}.tsx
├── app/(site)/[locale]/login/page.tsx          # brief mode (title, sentence, back link)
├── app/(site)/[locale]/brief/send/route.ts     # re-exports the brief module's handler
├── shared/components/SessionNav.tsx            # useSignedIn() for the guest line
└── migrations/<ts>_brief_sign_in.ts

apps/mobile/lib/
├── features/site/…/brief_builder.dart (+ model)  # signInRequired
├── features/brief/presentation/brief_cubit.dart  # signInNeeded, awaiting sign-in, send on sign-in
├── features/brief/brief_injection.dart           # session wiring
├── features/landing/presentation/landing_page.dart # opens sign-in, handles a late receipt
├── features/sign_in/…                             # for=brief: line on 20, client signup on 21
├── core/l10n/failure_message.dart + arb          # new problem code and lines
```

**Structure Decision**: existing modules only; the website's route handler lives in `app/(site)/[locale]/brief/send/route.ts` (like `guides/feed`) and re-exports from `modules/brief`.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Site-settings switch `briefNeedsSignIn` | The amendment weakens a core conversion rule; the owner needs to undo it without a release (Principle IV), and the switch lets the v1 endpoint stay `auth: optional` honestly (guests allowed when off) | Hard-coding the rule: no way back without a deploy, and the endpoint's declared auth would change (breaking v1) |
| Non-HttpOnly cookie `shoot-brief` | Keeps the brief through a full-page sign-in round trip, works without JavaScript, and lets the static page's builder restore answers (FR-008) | A server draft collection: a table, access rules and clean-up for data that lives one hour. `sessionStorage`: no JavaScript-free path and the server cannot send it after sign-in. HttpOnly cookie: the static builder could not restore answers without making every page dynamic |
| `GET /brief/send` route handler with a side effect | Sign-in ends in a redirect (GET); the brief must be recorded on arrival, and cookies can only be changed in a route handler or action | Recording inside `verifyCodeAction`: couples auth to briefs and duplicates the app path. A page with an auto-submit form: needs JavaScript. Risk is bounded: it records only the caller's own kept brief, as themselves, within the duplicate window |

## Amendment 2026-11-15: sign in to accept the quotation

**Input**: spec.md, Clarifications session 2026-11-15 (the owner: *"I meant to list the available
creators and ask the user to login before accepting the quotation in guest mode"*).

### Summary

The brief gate stays in the code but is **off by default**: `briefNeedsSignIn` defaults to `false`, the
rule reads `=== true` (a missing value is off), and migration `brief_sign_in_off` sets the column
default to false and turns the live value off. Guests brief, see step 2 and (website) get a quotation
from step 3 with no account, as before 021. Sign-in moves to **accepting**: the shared command
`acceptQuotation` (`modules/booking/commands/client-actions.ts`, used by the website action and
`POST quotations/{ref}/{key}/accept`) refuses a caller with no member (`signInRequired`) and claims an
unowned booking (and its unowned brief) for the member in the same accept transition; a booking owned
by someone else is refused (`otherAccount`). The pure decision lives in
`packages/domain/src/booking/claim.ts`. The website's accept action sends a guest to
`/login?next=/q/{ref}/{key}&for=accept`; the login and code pages gain an `accept` intent (title, no
role question, a new number becomes a client) and return to `next`, the quotation, where Accept is one
tap. The quotation page shows a guest line under Accept. The API maps the refusals to
`401 booking.errors.signInRequired` and `409 booking.errors.otherAccount` (new problem codes, additive;
declared auth stays `optional`). In the app, `BookingViewCubit` turns that 401 into a one-shot
`signInNeeded`; the booking page opens `/login?next=/q/{ref}/{key}&for=accept`; the sign-in flow treats
`for=accept` like `for=brief` (client sign-up, no role question) with its own line on screen 20; the
router's existing `next` handling brings the person back to the quotation.

### Design decisions

| Decision | Choice | Rejected |
|---|---|---|
| The switch | Keep `briefNeedsSignIn`, same meaning, default off, live value off by migration | Retire it (removes a tested owner lever and ~25 files of 021 for no user gain); give it a new meaning (an old name for a new rule confuses the admin) |
| Accept gate | Always on, no switch (Principle VIII): an accepted booking must belong to an account | A second switch: no owner asked for one; a member flow is unaffected either way |
| Where the claim happens | Inside the accept transition (`member` in the transition's data), brief claimed after success | At sign-in (the sign-in would need to know about bookings, and a person who signs in but never accepts would own a quotation they did not take) |
| After sign-in | Back on the quotation, Accept one tap | Auto-accept: accepting starts the creators' clock; the person sees the price again first |
| App step 3 | Unchanged: 09 → 10 → 11 → quotation for the member (canvas, 012 R5) | Guest quotations in the app: needs new fields on board 09 and a new request body; left as an owner decision |
| Problem codes | `booking.errors.signInRequired` (401), `booking.errors.otherAccount` (409) | Reusing `api.errors.unauthorized`: the app could not tell "sign in to accept" from an expired token |

### Constitution check (amendment)

Principle IX (1.5.0) already says building needs no account and that a step may ask for sign-in with
what was built kept; the amendment moves that step later and keeps the quotation (it is a record behind
its private link). Principles II (no new client code on the landing; the quotation page is dynamic
already), IV (copy in seed and message files), V (claim rule in `packages/domain`, the booking module
owns the command; auth only learns a new intent value), VII (server-side refusal on every channel,
`next` through `safeNext`), VIII (no new switch, collection or service). All pass.

### Files (amendment)

```text
packages/domain/src/booking/claim.ts (+ claim.test.ts)       # who may accept, what is claimed
packages/domain/src/api/v1/problems.ts                       # booking.errors.signInRequired, booking.errors.otherAccount
apps/web/src/modules/site-settings/globals/SiteSettings.ts   # briefNeedsSignIn default false, description
apps/web/src/migrations/<ts>_brief_sign_in_off.ts            # column default false, live value off
apps/web/src/modules/brief/sign-in-rule.ts                   # === true; pages use the rule
apps/web/src/modules/booking/commands/client-actions.ts      # acceptQuotation: sign-in and claim
apps/web/src/modules/booking/actions.ts                      # guest accept → /login?…&for=accept
apps/web/src/modules/booking/api.ts                          # 401 / 409 mapping
apps/web/src/modules/booking/{quote-page.tsx,components/BookingStatus.tsx}, q/[ref]/[key]/page.tsx  # guest line
apps/web/src/modules/auth/{pending.ts,actions.ts,components/{PhoneStep,CodeStep}.tsx}, login/page.tsx, login/code/page.tsx  # intent accept
apps/web/messages/{en,ar}.json, apps/web/src/shared/payload/seed/content.ts
apps/mobile/lib/core/error (ProblemCode), core/l10n (messages, ARB)
apps/mobile/lib/features/quick_match/presentation/{cubit/booking_view_cubit.dart,pages/booking_page.dart}
apps/mobile/lib/features/sign_in/presentation/{cubit/*,pages/number_page.dart,widgets/sign_in_parts.dart}
```
