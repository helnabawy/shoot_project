# Quickstart & Validation: Mobile Number Sign-In with a One-Time Code

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/routes-and-actions.md](contracts/routes-and-actions.md), [contracts/code-sender.md](contracts/code-sender.md) | **Model**: [data-model.md](data-model.md)

## Prerequisites

Everything from feature 001's quickstart (Node 24 via `nvm use`, pnpm,
Docker, `apps/web/.env`). New variables (`contracts/code-sender.md`):

```bash
OTP_SENDER=log                      # local and CI only; refused on non-local hosts
OTP_OUTBOX_FILE=.otp-outbox.jsonl   # optional; where the log sender writes codes
# Production: OTP_SENDER=twilio plus TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM
```

## Setup and run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter web payload migrate      # includes the otp_signin migration
pnpm --filter web seed                 # Sign-in settings + templates, First visit global
SEED_DEMO_CREATORS=1 pnpm --filter web seed   # local/e2e only: creators to book
pnpm --filter web dev                  # http://localhost:3000
tail -f apps/web/.otp-outbox.jsonl     # codes the log sender "sent"
```

## Manual walk-through (fifteen minutes)

1. **First visit (US6)**: open `/` in a fresh private window: the splash,
   then step 1 of 3 ("Say it in one line") with a mini Brief Bar as the
   illustration; "Next" twice, "Start a brief": the landing page. Reload:
   nothing shows. Footer → "How it works": the steps again. Edit a step's
   title in `/admin` → First visit: live within a minute. Open a creator
   profile in another fresh window: no steps.
2. **Brief flow sign-in (US1, US3, US5)**: build a brief, pick a creator,
   step 3 asks for date (if any), extras, promo, "Continue · AED …": no
   name or number. Step 3b shows the summary above the number field;
   type `050 123 4567`; tap "Prefer WhatsApp?" then back to SMS; "Send
   code". Step 3c: masked number, "Change number", six boxes, "Sent by
   SMS", countdown. Read the code from the outbox, type it, enter a name,
   the acceptance statement links Terms and Privacy; submit: "Your booking
   is saved" and one Top Hit "Open WhatsApp" (wa.me link with the sentence
   and reference); "See your quotation" opens `/q/…`. `/account` shows the
   booking. Sign out, repeat with the same number: no name asked. Repeat
   signed in: step 3 goes straight to the saved state.
3. **Codes (US2)**: request a code, enter a wrong one three times ("2 tries
   left", "1 try left", then "Too many tries. Sign in again in 15 minutes");
   as admin, open the user → "Clear lock"; request again. Set
   `codeLifetimeMinutes` to 1 in Sign-in settings, request, wait a minute,
   submit: "That code expired. We sent a new one." Request 3 codes in a row
   for one number: the fourth is refused with the waiting time. Set
   `dailyCap` to 1: the next request from any number says sign-in by code
   is briefly unavailable and still offers WhatsApp.
4. **Delivery (US3)**: use `+971 50 999 0001`: "We couldn't send the code"
   with "Try WhatsApp instead"; `+971 50 999 0003` on WhatsApp: SMS is
   offered. Edit the SMS template: the outbox shows the new text.
5. **Standalone (US4, US5)**: header account icon → `/login`: number →
   code → welcome with two rows ("I need a photographer or videographer" /
   "I'm a photographer or videographer"), name, acceptance; choose the
   professional row: `/account/profile` opens. Rename a persona in
   `/admin`: the row label changes. `/register` redirects to `/login`.
   Visit `/account/bookings` signed out: sign in, you return there.
6. **Fallback and legacy (US8)**: footer → "Editor sign-in" → email +
   password: an editor reaches `/admin`. A member created before this
   feature (seed one with a password in the e2e fixtures): after login,
   `/account/number?first=1` asks to add a number; skip: `/account` shows a
   quiet reminder; add and verify: the next password login is refused and
   the number signs them in.
7. **Account (US7, US9)**: `/account` after the first booking: "Finish your
   account 2 of 4", "Add email" primary; add an email (3 of 4), set Arabic
   + dark (4 of 4, site switches to `/ar`, theme dark on this device; the
   panel is gone). "Change number" → new number → code; try a number used by
   another account: refused.
8. **History (US10)**: with a booking recorded through the old flow (fixture)
   whose WhatsApp number equals your verified number: it appears in
   `/account/bookings`.
9. **Privacy (US9-S6)**: watch the address bar and server log through steps
   2–7: no number, no code anywhere.
10. Repeat 1, 2, 5 at `/ar` (number and code fields stay LTR with Western
    digits), in dark theme, at 360 px, and with JavaScript disabled (plain
    fields; no splash or steps; saved state on the quotation page).

**Launch checklist**: `OTP_SENDER=twilio` with all Twilio variables;
UAE sender id registered; WhatsApp sender approved and both
`whatsappTemplateRef`s set (otherwise WhatsApp is hidden); Sign-in
settings reviewed; `first-visit` copy reviewed in both languages; the
`.otp-outbox.jsonl` file absent from the deployment.

## Automated checks

```bash
pnpm typecheck && pnpm lint
pnpm --filter domain test:coverage           # 100 % on auth/otp, limits, checklist, signin-flow, contact/phone, countries
pnpm --filter web test                       # unit + component + integration (Docker)
pnpm check:scenarios                         # every PO- id below has its test
pnpm build && pnpm test:e2e                  # mobile, desktop, nojs, ar-mobile, dark
pnpm lhci                                    # / first visit, / returning, /login
```

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Files: `domain/…` under
`packages/domain/src`, `*.int.test.ts` under `apps/web/tests/integration`,
`*.test.tsx` next to the component, `po-*.spec.ts` under `apps/web/tests/e2e`.

| Id | Layer | Test file |
|----|-------|-----------|
| PO-US1-S1 details step asks only booking details | component, e2e | `DetailsForm.test.tsx`, `po-us1-brief-signin.spec.ts` |
| PO-US1-S2 step 3b: summary, purpose line, SMS preselected, Send code | component, integration | `NumberScreen.test.tsx`, `otp-brief-flow.int.test.ts` |
| PO-US1-S3 step 3c: number, change, boxes, channel, countdown; name + acceptance only for a new number | component, integration | `CodeScreen.test.tsx`, `otp-brief-flow.int.test.ts` |
| PO-US1-S4 correct code → account, booking + quotation saved, success, one action | integration, e2e | `otp-brief-flow.int.test.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US1-S5 Open WhatsApp carries brief + reference, stays signed in | unit, e2e | `domain/contact/whatsapp.test.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US1-S6 signed-in member: details → saved, no number or code | integration, e2e | `otp-brief-flow.int.test.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US1-S7 professional books as a client; role unchanged | integration | `otp-brief-flow.int.test.ts` |
| PO-US1-S8 leave at 3b/3c → resume at 3b within validity; nothing saved | integration, e2e | `otp-brief-flow.int.test.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US1-S9 sending paused / cap → still WhatsApp, brief recorded as a lead | integration | `otp-limits.int.test.ts` |
| PO-US1-S10 no sign-in prompt on landing, directory, profile, specialty, guides | e2e | `po-us1-brief-signin.spec.ts` |
| PO-US1-S11 Arabic 3b/3c: RTL copy, LTR fields, Western digits, 360 px | e2e (`ar-mobile`) | `po-us1-brief-signin.spec.ts` |
| PO-US1-S12 quotation page from the account; private link still works | integration, e2e | `otp-brief-flow.int.test.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US2-S1 wrong code → "2 tries left", field cleared, code still valid | unit, component, integration | `domain/auth/otp.test.ts`, `CodeScreen.test.tsx`, `otp-verify.int.test.ts` |
| PO-US2-S2 third wrong → locked 15 min; correct code and requests refused | unit, integration, e2e | `domain/auth/otp.test.ts`, `otp-verify.int.test.ts`, `po-us2-codes.spec.ts` |
| PO-US2-S3 expired code → message, auto-resend when allowed, else wait | unit, integration | `domain/auth/otp.test.ts`, `otp-verify.int.test.ts` |
| PO-US2-S4 countdown → Resend; new code, old invalid, attempts reset | unit, component, integration | `domain/auth/otp.test.ts`, `ResendCountdown.test.tsx`, `otp-request.int.test.ts` |
| PO-US2-S5 used code refused | integration | `otp-verify.int.test.ts` |
| PO-US2-S6 3 codes / 15 min per number → refused with time | unit, integration | `domain/auth/limits.test.ts`, `otp-limits.int.test.ts` |
| PO-US2-S7 10 codes / hour per device → refused regardless of number | unit, integration | `domain/auth/limits.test.ts`, `otp-limits.int.test.ts` |
| PO-US2-S8 settings change applies to the next request | integration | `otp-limits.int.test.ts` |
| PO-US2-S9 admin clears a lock; event recorded | integration, e2e | `otp-accounts.int.test.ts`, `po-us2-codes.spec.ts` |
| PO-US2-S10 daily cap → unavailable message, WhatsApp contact, owner can see | integration | `otp-limits.int.test.ts` |
| PO-US2-S11 messages as text beside the control, announced | component, e2e (axe) | `CodeScreen.test.tsx`, `po-us2-codes.spec.ts` |
| PO-US3-S1 SMS default; Prefer WhatsApp? switches line and channel | component, integration | `ChannelLine.test.tsx`, `otp-request.int.test.ts` |
| PO-US3-S2 code screen names the channel; resend keeps it | component, integration | `CodeScreen.test.tsx`, `otp-request.int.test.ts` |
| PO-US3-S3 delivery failure → other channel offered; send counted | integration | `otp-delivery.int.test.ts` |
| PO-US3-S4 last channel remembered on the device | integration, e2e | `otp-request.int.test.ts`, `po-us3-channel.spec.ts` |
| PO-US3-S5 template per language, brand + code + minutes, no sign-in link, editable | unit, integration | `domain/booking/notifications.test.ts`, `otp-delivery.int.test.ts` |
| PO-US4-S1 standalone number → code screen; no number in the address | integration, e2e | `otp-standalone.int.test.ts`, `po-us4-standalone.spec.ts` |
| PO-US4-S2 new number → welcome → account page / provider onboarding | integration, e2e | `otp-standalone.int.test.ts`, `po-us4-standalone.spec.ts` |
| PO-US4-S3 known number → signed in, account page or `next` | integration, e2e | `otp-standalone.int.test.ts`, `po-us4-standalone.spec.ts` |
| PO-US4-S4 invalid number → format message, nothing sent, announced | unit, component | `domain/contact/phone.test.ts`, `PhoneField.test.tsx` |
| PO-US4-S5 country sheet: UAE first, searchable, prefix changes, digits kept | unit, component | `domain/contact/countries.test.ts`, `CountrySheet.test.tsx` |
| PO-US4-S6 Change number → previous code invalid | integration | `otp-request.int.test.ts` |
| PO-US4-S7 header icon, account menu, old addresses → standalone; no password field | e2e | `po-us4-standalone.spec.ts` |
| PO-US4-S8 protected page → sign-in → back | e2e | `po-us4-standalone.spec.ts` |
| PO-US4-S9 signed-in member on `/login` → account | integration | `otp-standalone.int.test.ts` |
| PO-US4-S10 Arabic: RTL copy, LTR fields, prefix at start, 360 px | e2e (`ar-mobile`) | `po-us4-standalone.spec.ts` |
| PO-US4-S11 keyboard / screen reader: order, labels, focus, one field, no colour-only state | component, e2e (axe) | `CodeBoxes.test.tsx`, `po-us4-standalone.spec.ts` |
| PO-US4-S12 autofill fills six boxes and submits | component | `CodeBoxes.test.tsx` |
| PO-US4-S13 no scripting: plain fields complete both flows | e2e (`nojs`) | `po-us4-standalone.spec.ts`, `po-us1-brief-signin.spec.ts` |
| PO-US5-S1 welcome: two rows from active audiences, name, acceptance, Done | component, integration | `WelcomeStep.test.tsx`, `otp-standalone.int.test.ts` |
| PO-US5-S2 client row → account with role, name, acceptances | integration | `otp-standalone.int.test.ts`, `legal-acceptance.int.test.ts` |
| PO-US5-S3 professional row → Professional Terms, onboarding; account persists | integration, e2e | `otp-standalone.int.test.ts`, `po-us5-welcome.spec.ts` |
| PO-US5-S4 brief flow first visit: name only, client, acceptances | integration | `otp-brief-flow.int.test.ts` |
| PO-US5-S5 audience renamed / added → labels change | integration | `otp-standalone.int.test.ts` |
| PO-US5-S6 empty or short name refused | unit, component | `domain/auth/schemas.test.ts`, `WelcomeStep.test.tsx` |
| PO-US5-S7 leave welcome → no account; shown again next time | integration | `otp-standalone.int.test.ts` |
| PO-US5-S8 existing account never sees welcome; role not changeable | integration | `otp-standalone.int.test.ts` |
| PO-US5-S9 no step grants roles | integration | `otp-accounts.int.test.ts` |
| PO-US6-S1 splash first paint, replaced < 1 s, nothing to tap, budgets kept | e2e, Lighthouse | `po-us6-first-visit.spec.ts`, `lighthouserc.json` |
| PO-US6-S2 splash never twice on a device | e2e | `po-us6-first-visit.spec.ts` |
| PO-US6-S3 three steps: stage, 1 of 3, title, paragraph, dots, Next/Skip, Start a brief | component | `LearningSteps.test.tsx` |
| PO-US6-S4 Skip / finish → landing; never again on the device | e2e | `po-us6-first-visit.spec.ts` |
| PO-US6-S5 footer "How it works" shows the steps again | integration, e2e | `first-visit.int.test.ts`, `po-us6-first-visit.spec.ts` |
| PO-US6-S6 CMS edits live in 60 s; illustrations are components from live content | integration, component | `first-visit.int.test.ts`, `StepStage.test.tsx` |
| PO-US6-S7 Arabic, 360 px, dark, reduced motion | e2e (`ar-mobile`, `dark`) | `po-us6-first-visit.spec.ts` |
| PO-US6-S8 deep address: no steps | e2e | `po-us6-first-visit.spec.ts` |
| PO-US7-S1 checklist after the first booking: 2 of 4, facts, primary, Later | unit, component, integration | `domain/auth/checklist.test.ts`, `AccountChecklist.test.tsx`, `account-checklist.int.test.ts` |
| PO-US7-S2 add email → 3 of 4; duplicate refused plainly | integration | `account-checklist.int.test.ts` |
| PO-US7-S3 language + theme saved and applied on another device | integration, e2e | `account-checklist.int.test.ts`, `po-us7-checklist.spec.ts` |
| PO-US7-S4 all rows done → checklist gone everywhere | unit, integration | `domain/auth/checklist.test.ts`, `account-checklist.int.test.ts` |
| PO-US7-S5 Later hides on this device; nothing blocked | integration, e2e | `account-checklist.int.test.ts`, `po-us7-checklist.spec.ts` |
| PO-US7-S6 CMS text changes live | integration | `first-visit.int.test.ts` |
| PO-US7-S7 standalone-created account: checklist appears after first booking only | integration | `account-checklist.int.test.ts` |
| PO-US8-S1 quiet footer link → email + password form; admin sign-in unchanged | component, e2e | `Footer.test.tsx`, `po-us8-fallback.spec.ts` |
| PO-US8-S2 editor signs in with password; may add a number | integration, e2e | `otp-accounts.int.test.ts`, `po-us8-fallback.spec.ts` |
| PO-US8-S3 legacy member: one-time add-number prompt; then number signs in, password retired | integration, e2e | `otp-accounts.int.test.ts`, `po-us8-fallback.spec.ts` |
| PO-US8-S4 declines → let in, quiet reminder, never blocked | integration | `otp-accounts.int.test.ts` |
| PO-US8-S5 unverified stored number → new account; old not opened | integration | `otp-accounts.int.test.ts` |
| PO-US8-S6 admin sets a verified number; recorded; duplicate refused | integration | `otp-accounts.int.test.ts` |
| PO-US8-S7 five wrong passwords → lock; no email disclosure | integration | `auth.int.test.ts` |
| PO-US9-S1 account page shows the formatted number with Change number | component, integration | `AccountSummary.test.tsx`, `otp-accounts.int.test.ts` |
| PO-US9-S2 change number → verify new; old cannot sign in; notice sent | integration, e2e | `otp-accounts.int.test.ts`, `po-us9-number.spec.ts` |
| PO-US9-S3 number on another account → refused, nothing revealed | integration | `otp-accounts.int.test.ts` |
| PO-US9-S4 sign out → protected pages require sign-in | e2e | `po-us9-number.spec.ts` |
| PO-US9-S5 no member number on any public page | integration | `otp-privacy.int.test.ts` |
| PO-US9-S6 no number or code in addresses, history or logs | integration, e2e | `otp-privacy.int.test.ts`, `po-us9-number.spec.ts` |
| PO-US10-S1 pre-feature briefs/bookings with the same number listed; links work | integration, e2e | `otp-accounts.int.test.ts`, `po-us10-history.spec.ts` |
| PO-US10-S2 professional sees only bookings where they are the client | integration | `otp-accounts.int.test.ts` |
| PO-FR-020 dormant account → "Is this you?"; No detaches, Yes signs in | unit, integration | `domain/auth/otp.test.ts`, `otp-standalone.int.test.ts` |
| PO-FR-040 codes stored as HMAC only; never returned or logged | integration | `otp-privacy.int.test.ts` |
| PO-FR-041 sign-in rows purged after retention | integration | `booking-clock.int.test.ts` |
| PO-SC-008 Lighthouse ≥ 90 / ≥ 95 on `/` (first visit, returning) and `/login` | Lighthouse CI | all `po-*.spec.ts`, `lighthouserc.json` |
