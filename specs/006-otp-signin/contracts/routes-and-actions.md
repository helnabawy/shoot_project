# Contract: Routes, Server Actions, Cookies and Cache Tags

All pages exist under `/[locale]` (`en` unprefixed, `ar` under `/ar`). The
sign-in pages are dynamic, private (`robots: noindex`, `Referrer-Policy:
no-referrer`) and work without JavaScript. **No address, query string or
redirect ever carries a mobile number or a code**; state between screens is
a row id in an HttpOnly cookie. Unknown reference, wrong key and a key for
another record all render the same 404 (feature 003 rule).

## Pages

| Route | Who | Renders | Test ids |
|-------|-----|---------|----------|
| `/match/[ref]/[key]/details` (edited) | brief owner | Step 3: date (if missing), add-ons, promo, "Continue · {price}"; no personal fields | PO-US1-S1 |
| `/match/[ref]/[key]/number` | brief owner, not signed in | Step 3b: booking summary rows (sentence, creator per type, price), `PhoneField` (+971 default, country sheet), channel line, "Send code" | PO-US1-S2, S8, S9, S11 |
| `/match/[ref]/[key]/code` | brief owner with a pending request | Step 3c: masked number + "Change number", `CodeBoxes`, channel, countdown/resend; first visit adds the name field and the acceptance statement; success state with "Open WhatsApp" | PO-US1-S3 to S7, PO-US2-*, PO-US3-* |
| `/q/[ref]/[key]?saved=1` (edited) | quotation owner | Quotation page in saved mode: success message, "Open WhatsApp" Top Hit, then the quotation | PO-US1-S4 (no-JS), S12 |
| `/login` (edited) | anyone | Standalone number screen; signed-in → `/account` (or `next`) | PO-US4-S1, S4, S5, S7, S9 to S13 |
| `/login/code` | visitor with a pending request | Standalone code screen; dormant account → "Is this you, {first name}?" | PO-US4-S2, S3, S6, PO-US2-* |
| `/login/welcome` | visitor whose code verified a new number | Role rows (from active audiences), name, acceptance, "Done" | PO-US5-S1 to S3, S5 to S9 |
| `/register` (edited) | anyone | Permanent redirect to `/login` (keeps `next`) | PO-US4-S7 |
| `/login/editor` | anyone | The email-and-password form (moved from `/login`); footer "Editor sign-in" link | PO-US8-S1, S2, S7 |
| `/account/number` | signed-in | See the verified number; "Change number" → number screen in `change-number` mode; `?first=1` is the one-time "add your number" prompt for legacy members | PO-US8-S3, S4, PO-US9-S1 to S3 |
| `/account/number/code` | signed-in with a pending request | Code screen for add/change | PO-US9-S2, S3 |
| `/account` (edited) | signed-in | "Finish your account" panel when due; quiet reminder row for legacy members without a number | PO-US7-*, PO-US8-S4 |
| `/how-it-works` | anyone | The three learning steps as a page (footer link) | PO-US6-S5 |
| `/` (edited) | anyone | Splash + learning steps markup, shown on a first visit by the inline script; "Continue your booking" row when `shoot-resume` is set | PO-US6-S1 to S4, S6 to S8, PO-US1-S8 |

## Server actions

`modules/auth/otp/actions.ts` unless noted. Every action validates with zod,
rate-limits, never includes the number in a redirect, and returns `{ status:
'error', code }` with a message key under `signin.errors.*`; success redirects
(no-JS) or returns state.

| Action | Input | Effect |
|--------|-------|--------|
| `requestCode` | purpose (`brief \| standalone \| add-number \| change-number`), ref? key?, dial, number, channel, next?, locale | parse number (research §12) → lock? paused/cap? device limit? number limit? → create `sign-in-codes` (pending; previous pending → replaced) → send via `CodeSender` → set `shoot-signin` (row id, purpose, next), `shoot-device`, `shoot-otp-channel` cookies → redirect to the code screen. Refusals: `signin.errors.{format,country,tooManyCodes,tooManyFromDevice,locked,paused,deliveryFailed}` |
| `resendCode` | — (reads `shoot-signin`) | `resendAllowedAt` passed? limits → new row (old → replaced), same channel unless `channel` given |
| `switchChannel` | channel | re-sends on the other channel (counts as a send) after a delivery failure or at the person's request |
| `changeNumber` | — | marks the pending row replaced, clears `shoot-signin`, redirects to the number screen with the purpose kept |
| `verifyCode` | code, name? (first visit, standalone/add), acceptTerms? | `judgeAttempt` → wrong (remaining) / expired (auto-resend when allowed) / locked / used; **ok** → by purpose: `standalone`: existing account → (dormant? `confirm-identity`) → session, `lastSignInAt`, locale preference redirect; new number → redirect `/login/welcome`. `add-number` / `change-number`: set `username`, `phoneVerifiedAt/By=member`, retire password for members, notify old number (`numberChangedTemplate`), redirect `/account/number`. `brief`: see `verifyCodeAndBook` |
| `verifyCodeAndBook` (`modules/booking/actions.ts`) | code, name?, acceptTerms? | `verifyCode` for purpose `brief`; new number → create client account (name required, acceptance recorded) ; then `bookFromDraft(brief, user)` → booking + quotation (feature 003 logic) → clear draft, `shoot-resume` → success state (JS) or redirect `/q/{ref}/{key}?saved=1` |
| `completeWelcome` | accountType (seeker/provider), name, acceptTerms | creates the account for the verified row (random password, `username`, `phoneVerifiedAt`), records acceptances (Professional Terms for a provider), session, redirect `next` / `/account` / `/account/profile` |
| `confirmIdentity` | answer (`yes \| no`) | yes → session as above (`dormant-confirmed` event); no → detach the number from the old account (`number-detached`), continue to `/login/welcome` |
| `saveBookingDraft` (`modules/booking/actions.ts`, replaces `requestQuotation`) | ref, key, picks, date?, addOnIds[], promo?, locale | validate as today; signed-in → `bookFromDraft` at once → `/q/{ref}/{key}?saved=1`; else write `briefs.draft`, set `shoot-resume`, redirect `/match/{ref}/{key}/number` |
| `loginWithPassword` (edited `login`) | email, password, next | as today, plus: `passwordRetiredAt` set → refuse like a wrong password; member without `phoneVerifiedAt` → redirect `/account/number?first=1&next=…` |
| `setAccountEmail`, `setAccountPreferences`, `dismissChecklist` (`modules/auth/account-actions.ts`) | email / locale + theme / — | checklist rows; email unique (`signin.errors.emailTaken`); locale → `NEXT_LOCALE` cookie + redirect into the locale; theme → `shoot-apply-theme` one-shot cookie; `dismissChecklist` → `shoot-checklist-later` cookie |
| `clearLock` (admin UI action on a user) | user id | deletes `otp:lock:{username}`; `lock-cleared` event |

## Route handlers

| Route | Auth | Effect |
|-------|------|--------|
| `GET /api/cron/bookings` (edited, feature 003) | `Authorization: Bearer $CRON_SECRET` | also purges `sign-in-codes` and `account-events` older than `eventRetentionDays`; expired drafts are left (ignored on read) |
| `GET /api/session` (existing) | cookie | unchanged |

## Cookies

| Name | HttpOnly | Lifetime | Content |
|------|----------|----------|---------|
| `payload-token` | yes | `tokenExpiration` (7 days) | Payload session JWT (existing) |
| `shoot-signin` | yes | 30 min | `{ id, purpose, next }` of the pending `sign-in-codes` row, signed (HMAC) |
| `shoot-device` | yes | 1 year | random device id (limits) |
| `shoot-otp-channel` | yes | 1 year | `sms` or `whatsapp` |
| `shoot-resume` | no | 7 days | path of a 3b page |
| `shoot-checklist-later` | yes | 1 year | `1` |
| `shoot-apply-theme` | yes | one request | `light \| dark \| system` |
| `NEXT_LOCALE` | no | 1 year | locale (existing, next-intl) |

## Cache tags and revalidation

`first-visit` and `landing` (the landing page re-renders when the global
changes); `site-settings` (existing). Sign-in pages are uncached.

## Message namespaces (`apps/web/messages/{en,ar}.json`)

`signin.*` (number screen, code screen, welcome, confirm-identity, saved
state, errors), `account.number.*`, `account.checklist.*` (static labels;
CMS rows and facts come from `first-visit`), `firstVisit.*` (skip/next
labels, a11y names), `nav.login` → "Sign in", `footer.editorSignIn`.
Phone and code fields render `dir="ltr"` with Western digits in both
languages.

## Test-id prefix

`PO-` (`PO-US1-S3`, `PO-FR-015`). Playwright `data-testid`s: `signin-number`,
`signin-send`, `signin-code`, `signin-resend`, `signin-change-number`,
`signin-channel`, `signin-welcome-*`, `booking-saved`, `open-whatsapp`,
`first-visit-splash`, `first-visit-steps`, `first-visit-skip`,
`account-checklist`, `editor-signin-link`.
