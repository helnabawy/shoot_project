# Implementation Plan: Mobile Number Sign-In with a One-Time Code

**Branch**: `006-otp-signin` (spec directory; work happens on the current worktree branch) | **Date**: 2026-11-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-otp-signin/spec.md`

**Test-id prefix**: `PO-` (e.g. `PO-FR-015`, `PO-US1-S4`), next to 002's
`CP-`, 003's `QM-` and 005's `MP-`.

## Summary

Members sign in with a mobile number and a six-digit code, and the sign-in
sits at the **end of the brief flow**: step 3 "Your details" loses its
personal fields and saves a **booking draft** on the brief; step 3b asks
for the number under the booking summary (SMS or WhatsApp); step 3c takes
the code (plus a name and the legal acceptance on a first visit), signs
the person in, creates the booking and quotation from the draft and ends
on "Open WhatsApp". A standalone sign-in at `/login` serves the header's
account icon and professionals and is the only place the role is asked.
Email and password remain behind a quiet "Editor sign-in" footer link;
legacy members are asked once to verify a number. A first visit on a device
shows a splash and three learning steps (CMS content) on the still-static
landing page; after the first booking the account shows a one-time
"Finish your account" checklist.

Technical approach: **no new module and no new package**. The `auth`
module grows an `otp/` folder (codes, limits, senders, screens), the
`booking` module splits `requestQuotation` into `saveBookingDraft` +
`bookFromDraft`, the `landing` module gains the `first-visit` global and
the splash/steps components. Password-less sessions use Payload's own
exported primitives (`addSessionToUser`, `getFieldsToSign`, `jwtSign`) on
the existing Users collection with `loginWithUsername` (username = verified
E.164). **One new external service**, the SMS/WhatsApp vendor, reached over
plain `fetch` behind a `CodeSender` seam with a `log` implementation for
development and tests (Complexity Tracking). One additive migration
(`otp_signin`).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (unchanged)

**Primary Dependencies**: unchanged (Next.js 16.4.3, React 19.2.6, Payload 3.93.0, next-intl 4.14.9, next-themes 0.4.6, Tailwind 4.3.5, zod 4.6.7). **No new package**: Twilio is called over REST with `fetch`; hashes use `node:crypto`; country names use `Intl.DisplayNames`; the inline first-visit script is ~300 bytes of plain JavaScript.

**Storage**: PostgreSQL 17 via the Payload adapter. One additive migration (`otp_signin`): new `sign_in_codes`, `account_events`; new columns on `users` (`username`, `phone_verified_at`, `phone_verified_by`, `password_retired_at`, `last_sign_in_at`, `preferences_*`, `checklist_completed_at`; `email` nullable), `briefs` (`draft_*`), `site_settings` (`sign_in_*`); new global table `first_visit`; indexes on `bookings.client_whatsapp`, `briefs.contact_whatsapp`, `sign_in_codes.number/state/device_key`. No data loss, no backfill.

**Testing**: Vitest (domain unit at 100%, component, integration on Testcontainers PostgreSQL with the `log` sender and an outbox file), Playwright (`mobile`, `desktop`, `nojs`, `ar-mobile`, `dark`), Lighthouse CI for `/` in first-visit mode, `/` returning, and `/login`.

**Target Platform**: unchanged (one Next.js + Payload deployable, iOS Safari ≥ 16 and evergreen browsers; SMS autofill relies on `autocomplete="one-time-code"`).

**Project Type**: Web application in the existing pnpm monorepo.

**Performance Goals**: code request round trip < 1 s server time (one rate-limit read/write per key, one insert, one vendor call ≤ 10 s timeout but not awaited for the redirect beyond the vendor's 201); landing page with the first-visit overlay keeps LCP ≤ 2.5 s, CLS ≤ 0.1 (the overlay is positioned, not in flow), INP ≤ 200 ms; new client JS on the landing page ≤ 3 KB (steps controller + "Continue your booking" row) within the 200 KB budget; sign-in pages ≤ 6 KB of new client JS (code boxes, countdown, country sheet).

**Constraints**: works without JavaScript (plain forms; the code boxes degrade to one field; the first-visit overlay simply does not show); en/ar with LTR number and code fields; WCAG 2.1 AA; numbers and codes never in URLs, logs, error reports or public pages; codes stored as HMAC only; limits and copy are CMS settings; deterministic time (`now` injected everywhere; `E2E_CLOCK` for the dormant check); the `log` sender refused on non-local hosts.

**Scale/Scope**: hundreds of sign-ins a day at launch (daily cap default 500). 2 new collections, 1 new global, 1 settings tab, edits to `users`, `briefs`; 9 new or changed routes × 2 locales; 14 server actions; 6 domain files; 3 surface briefs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec clarified (session 2026-11-09, 18 answers, amended same day for sign-in at the end of the brief); no `NEEDS CLARIFICATION`; FR-019 nuance (WhatsApp template text) recorded in the spec before design | PASS — research §1–§14 |
| II. Performance budgets | Landing page stays static (first-visit state is a class set by an inline script, research §7); overlay is text and components; ≤ 3 KB new JS on `/`; Lighthouse CI adds `/` first-visit, `/` returning, `/login` | PASS by design |
| III. Test-first | Every scenario (80) mapped in `quickstart.md` with `PO-` ids; domain at 100%; `check:scenarios` covers the 006 table; the `log` sender makes codes readable to tests without weakening production | PASS by design |
| IV. Content in CMS | Limits, SMS text, WhatsApp template refs, allowed countries, pause switch, splash line, learning steps, checklist rows and facts are CMS data; role labels from the active audiences; seed is not a fallback | PASS — data-model |
| V. Modular monolith | `auth/otp` inside the auth module; booking imports the code step through `modules/auth/otp/index.ts`; landing owns `first-visit`; domain rules framework-free; multi-instance safe (limits in the database, sessions in Payload) | PASS — structure below |
| VI. Responsive, accessible, bilingual, themed | Verified 360/768/1024/1440 × en/ar × light/dark; number and code fields `dir="ltr"`, Western digits; 44 px targets; messages as text with `role="alert"`; reduced motion on splash, steps, countdown, sheet | PASS by design |
| VII. Secure by default | Explicit access on 2 new collections and the global; codes stored as HMAC with the server secret, compared in constant time; attempts counted before comparison; locks and limits in the database; the number never in an address, log or public page; unverified legacy numbers never grant access; `roles` field access unchanged; sessions are Payload's own | PASS |
| VIII. Simplicity | No new package; one new external service, justified below; two collections instead of arrays on users; `consumeAllowance` extended, not duplicated | PASS — Complexity Tracking |
| IX. Designed, not generated | Every screen has one primary action; the brief needs no account; the number is asked once, where it is useful; surface briefs written (`phone-otp`, `first-visit`, `account-checklist`); craft floor, detector, finish review and DESIGN.md tasks follow | PASS by design |

**Post-Phase-1 re-check (2026-11-09)**: the data model adds two
collections and one global, no service beyond the messaging vendor already
justified, no package. The only Payload behaviour used outside its public
operations is the trio of exported auth helpers (`addSessionToUser`,
`getFieldsToSign`, `jwtSign`), which `payload.login` itself uses. All gates
pass.

## Project Structure

### Documentation (this feature)

```text
specs/006-otp-signin/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1: walk-through + scenario → test map
├── contracts/
│   ├── routes-and-actions.md
│   └── code-sender.md
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/auth/             # 100 % covered
├── otp.ts            # newCode, hashInput, judgeAttempt, resendAllowedAt, isDormant
├── limits.ts         # limitKeys, limitWindows
├── checklist.ts      # checklistProgress
├── signin-flow.ts    # nextStep for the brief flow and the standalone flow (+ .test.ts, not scenario-bound)
├── schemas.ts (edit) # phoneSchema, codeSchema, welcomeSchema; loginSchema kept for editors
└── index.ts
packages/domain/src/contact/
├── phone.ts          # parsePhone (UAE rule, Arabic-Indic digits), maskNumber, formatNumber
├── countries.ts      # dial codes, UAE first; names via Intl.DisplayNames
└── index.ts (edit)

apps/web/src/
├── app/(site)/[locale]/
│   ├── page.tsx (edit)                          # splash + steps markup, "Continue your booking"
│   ├── how-it-works/page.tsx                    # the steps as a page
│   ├── login/page.tsx (edit)                    # standalone number screen
│   ├── login/code/page.tsx                      # standalone code screen (+ confirm identity)
│   ├── login/welcome/page.tsx                   # first-visit role + name
│   ├── login/editor/page.tsx                    # email + password (moved)
│   ├── register/page.tsx (edit)                 # permanent redirect → /login
│   ├── account/page.tsx (edit)                  # checklist panel, legacy reminder row
│   ├── account/number/page.tsx                  # see / add / change number
│   ├── account/number/code/page.tsx
│   ├── match/[ref]/[key]/details/page.tsx (edit) # no personal fields
│   ├── match/[ref]/[key]/number/page.tsx        # step 3b
│   ├── match/[ref]/[key]/code/page.tsx          # step 3c (+ saved state)
│   └── q/[ref]/[key]/page.tsx (edit)            # saved mode
├── app/(site)/[locale]/layout.tsx (edit)        # first-visit inline script, ThemeSync, footer link
├── app/(payload)/api/cron/bookings/route.ts (edit) # purge sign-in rows
├── modules/auth/
│   ├── collections/Users.ts (edit)              # loginWithUsername, new fields, hooks
│   ├── collections/{SignInCodes,AccountEvents}.ts
│   ├── otp/
│   │   ├── codes.ts        # createRequest, judge, markUsed/replaced/locked (Local API)
│   │   ├── limits.ts       # otpAllowance(): lock → paused/cap → device → number
│   │   ├── session.ts      # signInAs(user): addSessionToUser + getFieldsToSign + jwtSign + cookie
│   │   ├── accounts.ts     # createAccountFromNumber, verifyNumberOn(user), detachNumber, retirePassword
│   │   ├── state-cookie.ts # shoot-signin (signed), shoot-device, shoot-otp-channel (+ state-cookie.test.ts)
│   │   ├── sender.ts       # CodeSender type + getSender() from env
│   │   ├── senders/{twilio,log}.ts
│   │   ├── settings.ts     # readSignIn(payload) with defaults
│   │   ├── actions.ts      # requestCode, resendCode, switchChannel, changeNumber, verifyCode, completeWelcome, confirmIdentity
│   │   ├── components/{PhoneField,CountrySheet,CodeBoxes,ChannelLine,ResendCountdown,
│   │   │               NumberScreen,CodeScreen,WelcomeStep,ConfirmIdentity}.tsx
│   │   └── index.ts        # what booking and the pages import
│   ├── account-actions.ts  # setAccountEmail, setAccountPreferences, dismissChecklist
│   ├── components/{AccountChecklist,ThemeSync,EditorLoginForm}.tsx
│   ├── components/LoginForm.tsx → EditorLoginForm.tsx (moved)
│   ├── components/RegisterForm.tsx (removed; register redirects)
│   ├── actions.ts (edit)   # loginWithPassword: retired password, verify-number prompt
│   ├── session.ts (edit)   # lastSignInAt, locale preference redirect
│   ├── admin/ClearLockButton.tsx                # admin UI field component
│   └── admin/SendingToday.tsx                   # admin UI field: today's sends vs cap, failures, locks (FR-047)
├── modules/booking/
│   ├── actions.ts (edit)   # saveBookingDraft, bookFromDraft, verifyCodeAndBook
│   ├── draft.ts            # read/write/expire briefs.draft
│   ├── components/DetailsForm.tsx (edit)        # no name/WhatsApp
│   ├── components/{BookingSummary,SavedBooking}.tsx (+ .test.tsx)
│   ├── queries.ts (edit)   # getMyBookings matches client.whatsapp
│   └── quote-page.tsx (edit)                    # saved mode
├── modules/brief/
│   ├── collections/Briefs.ts (edit)             # draft group, contact.whatsapp index
│   ├── queries.ts (edit)   # getMyBriefs matches contact.whatsapp
│   └── components/BriefBuilder.tsx (edit)       # "Continue your booking" row (client island)
├── modules/landing/
│   ├── globals/FirstVisit.ts
│   ├── queries.ts (edit)   # getFirstVisit(locale) cached by tag `first-visit`
│   └── components/{Splash,LearningSteps,StepStage}.tsx
├── modules/site-settings/globals/SiteSettings.ts (edit)  # Sign-in tab
├── shared/components/Footer.tsx (edit)          # "How it works", "Editor sign-in"
├── shared/components/Header.tsx (edit)          # label "Sign in" (nav.login)
├── shared/components/FirstVisitScript.tsx       # the inline head script
├── shared/payload/rate-limit.ts (edit)          # windowMs parameter
├── shared/lib/env.ts (edit)                     # OTP_SENDER, TWILIO_*, OTP_OUTBOX_FILE
├── shared/payload/seed/{sign-in,first-visit,demo-accounts}.ts  # demo-accounts: opt-in e2e fixtures (legacy member, pre-feature booking)
├── migrations/<ts>_otp_signin.{ts,json}
└── payload.config.ts (edit)

apps/web/messages/{en,ar}.json     # signin.*, account.number.*, account.checklist.*, firstVisit.*, footer.*
apps/web/tests/{integration,e2e,fixtures}   # otp-*.int.test.ts, first-visit.int.test.ts, po-us1…us10 specs, otp outbox helper
scripts/check-scenario-tests.mjs (edit)     # add the 006 table to `check:scenarios`
.impeccable/surfaces/{phone-otp,first-visit,account-checklist}.md
```

**Structure Decision**: no new module. Sign-in belongs to `auth` (it owns
Users and sessions); the booking draft and the saved state belong to
`booking` (they are booking steps that *call* the code step through
`modules/auth/otp/index.ts`); the first-visit global and screens belong to
`landing` (they render on the landing page). Cross-module imports go
through each module's `index.ts` only.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| **External service: SMS/WhatsApp messaging vendor (Twilio Programmable Messaging)**, research §5 | The spec requires codes delivered by SMS or WhatsApp to the person's phone (FR-017); no platform primitive sends messages | Email codes (rejected by the owner); WhatsApp-only through Meta's API (no SMS, and SMS is the default channel); Twilio Verify (vendor-owned code rules conflict with FR-016's CMS settings). Mitigation: one `CodeSender` seam, REST over `fetch` (no SDK), a `log` sender for every non-production environment, vendor swap = one file |
| `sign-in-codes` and `account-events` collections | Each code request is a row with its own state, attempts and delivery outcome (FR-012, FR-013, FR-041), and admin actions on accounts need an audit trail (FR-016, FR-037) | Arrays on `users` (concurrent requests overwrite each other; requests exist before an account does); reusing `booking-events` (different subject and access) |
| `loginWithUsername` on Users with username = E.164 | An account must be identified by a verified number with no email and no usable password (FR-001, FR-021) while editors keep email + password | `disableLocalStrategy` (removes editor passwords); a synthetic email per number (false data, leaks into admin); a second auth collection (two user tables, two sessions) |
| Inline first-visit script in `<head>` (~300 bytes) | The splash must be the first paint and never show twice, on a page that must stay static (FR-026, Principle II) | Cookie-dependent server rendering (breaks static caching); a redirect to a welcome page (crawlers, deep links, locale negotiation) |
| `consumeAllowance(…, windowMs)` parameter | Per-number (15 min), lock (15 min) and daily (24 h) windows differ from the existing hourly window (FR-015) | A second rate-limit helper or collection (duplicate logic for the same table) |
| Booking draft on `briefs` (hidden group) | Details must survive until the code verifies without creating a booking or account (FR-007, FR-022) | A pre-verification booking state (a booking before an account; a new clock job); query-string state (add-ons and promo in history; lost on a closed tab) |
