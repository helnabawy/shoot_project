# Research: Mobile Number Sign-In with a One-Time Code

Decisions the spec left to planning, with rationale and rejected
alternatives. Owner decisions from the 2026-11-09 clarification session are
binding and not re-argued here. Defaults marked *default* in the spec stay
as settings with those values.

## §1 Where the code step lives in the brief flow (US1, FR-003 to FR-007)

- **Decision**: step 3 "Your details" keeps its address
  (`/match/{ref}/{key}/details`) but loses the name and WhatsApp fields.
  Its action, `saveBookingDraft`, validates the booking details (date,
  add-ons, promo, picks) and stores them on the brief as a **booking
  draft** (`briefs.draft`, hidden group: picks, date, add-on ids, promo,
  `savedAt`, `expiresAt` = quotation validity) instead of creating a
  booking. It then redirects to **3b** `/match/{ref}/{key}/number`, and 3b
  to **3c** `/match/{ref}/{key}/code`. The code action
  `verifyCodeAndBook` verifies the code, signs in (or creates the account,
  §2), then creates the booking and quotation **from the draft** with the
  verified number as `client.whatsapp` and the member as `member`, clears
  the draft, records the acceptance (feature 005) on a first visit, and
  ends on the saved state. A signed-in member's step 3 action skips 3b/3c
  and books at once (FR-005). The brief's private key (feature 003 §2)
  guards all three addresses; neither the number nor the code is ever in
  an address.
- **Resume (FR-007, US1-S8)**: the draft lives on the brief, so the 3b
  address resumes it while `expiresAt` has not passed. A non-personal
  cookie `shoot-resume` (path of the 3b page, 7 days, not HttpOnly) lets
  the Brief Bar on the landing page offer "Continue your booking" as a
  row; the landing page itself stays static because the row is a client
  island reading the cookie after hydration.
- **Saved state (US1-S4, S5)**: with scripting, the 3c form swaps in place
  to a success message and the one "Open WhatsApp" Top Hit (the WhatsApp
  link carries the brief sentence and the booking reference as feature
  001/003 already build it), with a quiet "See your quotation" link. Without
  scripting, the action redirects to `/q/{ref}/{key}?saved=1`, where the
  quotation page shows the same success message and Top Hit above the
  quotation. Both paths are tested (PO-US1-S4, PO-US4-S13).
- **Rationale**: the brief already carries the device's private access key
  and is the record "kept on the device"; no account or booking exists
  until the code is verified (FR-022), and nothing is left for the clock to
  clean up. Reusing the quotation page for the no-JS saved state avoids a
  fourth screen.
- **Alternatives**: a `pending-verification` booking state (a booking row
  before an account, contradicting FR-022, and a new clock job); carrying
  the details in the 3b/3c query string (add-ons and promo would show in
  history; the draft also survives a closed tab); a new `booking-drafts`
  collection (one more collection for a value that belongs to exactly one
  brief).

## §2 An account without a password (FR-001, FR-021, FR-024, FR-042)

- **Decision**: the Users collection keeps Payload's local strategy
  (editors and legacy members log in with email and password) and adds
  `loginWithUsername: { allowEmailLogin: true, requireEmail: false,
  requireUsername: false }`. The **username is the verified number in
  E.164** (`+971501234567`), unique. Accounts created by code get a random
  32-byte password that is never shown or usable (nobody knows it; the
  fallback form still refuses them because they have no email).
  Sign-in without a password uses Payload's own primitives, exported by
  `payload` 3.93: `addSessionToUser` (a session id on the user, as
  `payload.login` does), `getFieldsToSign` and `jwtSign` with the
  collection's `tokenExpiration`, then the same `payload-token` cookie the
  existing `setSessionCookie` writes. `useSessions` stays on, so sign-out,
  expiry and the `/api/session` route behave exactly as today.
- **Rationale**: one user collection, one cookie, one session mechanism;
  the admin panel and `/api/users/login` are untouched; no custom auth
  strategy to maintain.
- **Alternatives**: `disableLocalStrategy` (removes password login for
  editors too); a second cookie and our own sessions table behind a
  custom `auth.strategies` entry (two session systems); a synthetic
  `{number}@phone.invalid` email (lies in the data and leaks into admin
  columns).
- **Consequence**: the admin login form shows "Email or Username"; editors
  type their email as before. `users.email` becomes optional; the admin list
  uses `name` as the title and shows the number to admins only.

## §3 Codes: generation, storage, verification (FR-012, FR-013, FR-040)

- **Decision**: a `sign-in-codes` row per request. The code is six digits
  from `crypto.randomInt(0, 1_000_000)` zero-padded (`000000` allowed).
  Stored as `codeHash = HMAC-SHA256(PAYLOAD_SECRET, "{rowId}:{code}")`,
  never the code; compared with `timingSafeEqual`. One **current** request
  per number (`state: pending`): a resend or "Change number" marks the
  previous row `replaced`. Verification increments `attempts` first (so a
  crash after the check cannot grant an extra try), then compares; the
  third wrong attempt sets `state: locked` and writes a `lock` row
  (`rate-limits` key `otp:lock:{number}`, §4) for the lock duration. A
  used code is `state: used` with `usedAt`; expiry is checked against
  `expiresAt` with the request's `now`. All rules are pure functions in
  `packages/domain/src/auth/otp.ts` (`newCode`, `codeHash` inputs,
  `judgeAttempt(request, now, settings)` →
  `ok | wrong(remaining) | expired | locked | used`).
- **Rationale**: an HMAC keyed by the server secret is not brute-forceable
  offline from a database dump (a plain SHA-256 of a six-digit code is);
  binding the row id prevents replaying a hash across rows.
- **Alternatives**: storing the code (forbidden by FR-040); bcrypt per code
  (slow for no gain at six digits once the secret keys the hash); letting
  the provider generate and check the code (Twilio Verify, §5: fixed
  10-minute expiry, their attempt rules, no CMS control).

## §4 Rate limits and the daily cap (FR-015, FR-016, FR-047)

- **Decision**: reuse the `rate-limits` collection and `consumeAllowance`,
  extended with a `windowMs` argument (today fixed to one hour). Keys:
  `otp:number:{e164}` (3 per 15 min), `otp:device:{deviceKey}` (10 per
  hour), `otp:day:{YYYY-MM-DD}` (daily cap, Asia/Dubai day),
  `otp:lock:{e164}` (lock marker, count 1, window = lock duration). The
  check order is lock → paused/cap → device → number, so a refusal never
  reveals whether a number has an account (every message is the same
  "wait" family). Failed deliveries count because the send was attempted.
  Settings live in `site-settings.signIn` (data-model) and are read
  uncached in writes, like `readQuickMatch`.
- **Device key (§6)** is the HttpOnly `shoot-device` cookie (random 16
  bytes, 1 year), set on the first code request; stored as
  `HMAC(secret, cookie)`; the client IP is the fallback when the cookie is
  missing (first request, cookies blocked).
- **Rationale**: one existing mechanism, already multi-instance safe
  (Principle V); the lock is a rate-limit row so an admin "clear lock" is a
  delete.
- **Alternatives**: in-memory counters (lost across instances); a new
  `locks` collection (the rate-limit row already expresses "until when").

## §5 Delivery provider (FR-017 to FR-019; Complexity Tracking)

- **Decision**: a `CodeSender` seam
  (`modules/auth/otp/sender.ts`, contract `contracts/code-sender.md`) with
  two implementations chosen by `OTP_SENDER`:
  - `twilio`: **Twilio Programmable Messaging** over its REST API with
    `fetch` and HTTP basic auth, **no SDK**. SMS: `To`, `From` (a UAE-
    registered sender id or a Messaging Service), `Body` from the CMS
    template. WhatsApp: `To=whatsapp:+971…`, `From=whatsapp:{sender}` and
    an approved **authentication template** (`ContentSid` per language +
    `ContentVariables` with the code), because business-initiated WhatsApp
    messages must use Meta-approved templates.
  - `log`: development and tests. Writes `{ to, channel, code, locale }` to
    an append-only outbox file (`OTP_OUTBOX_FILE`) and the server log at
    debug level **only when the site URL is local** (same guard as
    `SEED_DEMO_CREATORS`); refused otherwise at startup (`env.ts`).
  Delivery failures (non-2xx, network) surface as `{ ok: false, reason }`
  and are written to the request row (`deliveryStatus`, `deliveryError`
  without the number); the UI offers the other channel (FR-018).
- **Rationale**: one vendor covers both channels and both languages; the
  REST surface is three fields, so a dependency is not justified (Principle
  VIII); Twilio supports UAE SMS sender-id registration (required by the
  UAE regulator for branded SMS) and WhatsApp Business senders on an
  existing business number. The owner can swap the vendor by writing one
  more sender behind the same seam.
- **Alternatives**: Twilio Verify (manages codes itself; expiry fixed at
  10 minutes, attempts fixed, no CMS text) — rejected for FR-016; Meta
  WhatsApp Cloud API directly plus a UAE SMS gateway such as Unifonic (two
  vendors, two integrations); Vonage/Bird (same shape as Twilio, no UAE
  advantage found). Email codes and Google sign-in are out of scope by the
  spec.
- **Open operational items (not code)**: create the Twilio account and
  sub-account, register a UAE alphanumeric sender id, connect the business
  WhatsApp number as a sender, submit the two authentication templates
  (en, ar) for approval, set the env vars (`contracts/code-sender.md`).
  Until the WhatsApp sender is approved, `TWILIO_WHATSAPP_FROM` stays
  empty and the "Prefer WhatsApp?" switch is hidden (settings
  `whatsappEnabled` is derived from that).
- **Spec nuance (recorded in the spec, FR-019)**: the SMS body is a CMS
  template per language; the WhatsApp text is fixed by the approved
  template, so the CMS holds the template reference per language and the
  editor changes WhatsApp wording through Meta's approval, not the CMS.

## §6 What the device remembers (FR-043)

| Memory | Where | Content | Personal data |
|---|---|---|---|
| Device key for limits | `shoot-device` cookie, HttpOnly, 1 year | random id | none |
| Preferred channel | `shoot-otp-channel` cookie, HttpOnly, 1 year | `sms` or `whatsapp` | none |
| Resume a booking | `shoot-resume` cookie, 7 days | path of a 3b page (ref + key) | none (the key is already a private link) |
| Splash and steps seen | `localStorage["shoot.seen"]` | `1` | none |
| Checklist "Later" | `shoot-checklist-later` cookie, HttpOnly, 1 year | `1` | none |

Losing any of them only changes what is shown once (FR-043). No cookie
holds a number, a name or a code.

## §7 Splash and learning steps on a static landing page (US6, FR-026 to FR-029)

- **Decision**: the landing page stays statically rendered and cached.
  The splash and the three steps are **server-rendered into the landing
  HTML for everyone**, from the new `first-visit` global (data-model), and
  hidden by CSS unless `<html>` carries `first-visit`. A 300-byte inline
  script in `<head>` (next to the theme script, same no-flash technique)
  adds the class when `localStorage["shoot.seen"]` is absent and sets it,
  so the splash is literally the first paint on a first visit and never
  shows twice. The splash fades out on `DOMContentLoaded` (or after 900 ms
  by CSS animation, whichever first); under reduced motion it is replaced
  without animation. The steps are a `<dialog>`-like panel over the page
  with "Skip", "Next" and "Start a brief" (closing moves focus to the Brief
  Bar); without scripting nothing is shown (no first-visit class), which
  is the designed fallback. The same `LearningSteps` component renders the
  standalone page `/how-it-works` (footer link, FR-028, US6-S5).
- **Deep addresses (US6-S8)**: the markup exists only on the landing page,
  so a creator profile or quotation link is never interrupted.
- **Performance (FR-026)**: the overlay is text and the site's own
  components (no images); the inline script runs before CSS paints; the
  landing page keeps its budgets with the overlay as the first-visit LCP
  element. Lighthouse CI runs the landing page twice: fresh (first visit)
  and with `shoot.seen` preset.
- **Crawlers**: see the landing content (it is in the HTML under the
  overlay); the overlay carries `aria-modal` only while shown.
- **Rationale**: no cookie-dependent server rendering (would break the
  static page), no redirect (would send crawlers and deep links to a
  welcome page), one source of truth for the steps (CMS global).
- **Alternatives**: a `/welcome` redirect from the proxy when a cookie is
  missing (crawlers and Lighthouse redirected, locale negotiation
  entangled); a client-only fetch of the steps (a flash of nothing, then
  content; JS payload); showing the steps on every page (interrupts deep
  links).

## §8 Finish your account (US7, FR-030 to FR-032)

- **Decision**: three account fields: `email` (optional, unique, already
  the auth field), `preferences.locale` (`en | ar | null`),
  `preferences.theme` (`light | dark | system | null`), plus
  `checklistCompletedAt`. The checklist renders on `/account` as a panel
  above "Up next" when the member has at least one saved booking, the
  checklist is not completed and the `shoot-checklist-later` cookie is
  absent; progress = 2 + (email ? 1 : 0) + (locale && theme ? 1 : 0).
  Rows are forms with server actions (`setAccountEmail`,
  `setAccountPreferences`, `dismissChecklist`); each works without
  scripting. Language: saving sets the `NEXT_LOCALE` cookie and redirects
  into that locale; on every sign-in the server reads
  `preferences.locale` and redirects into it. Theme: next-themes keeps
  the choice in `localStorage["theme"]`; after sign-in a one-shot HttpOnly
  cookie `shoot-apply-theme={theme}` makes the layout render a tiny
  `ThemeSync` island that writes the preference into next-themes once and
  the server clears the cookie. Without scripting the theme follows the
  device, as today.
- **Rationale**: no new collection; the account already is the record;
  "Later" per device is a cookie, "complete" is on the account (spec
  default).
- **Alternatives**: a `checklist` JSON on the user (the three facts are
  derived anyway); storing the theme in a cookie read by the server (the
  landing page is static and must not vary by cookie).

## §9 Existing accounts, admin changes, detaching a number (US8, FR-033 to FR-038)

- **Decision**: the current `users.phone` stays as the *unverified*
  number on file. New fields `phoneVerifiedAt`, `phoneVerifiedBy`
  (`member | admin`), `username` (= verified E.164; Payload's
  `loginWithUsername` field), `lastSignInAt`. A `beforeChange` hook keeps
  `username` and `phone` in step when an admin sets a verified number from
  the admin panel (`phoneVerifiedBy: admin`, uniqueness enforced by the
  username unique index, a readable message on conflict) and writes an
  `account-events` row (`number-set`, `number-cleared`, `lock-cleared`,
  `number-detached`) with the acting admin. Email-and-password sign-in
  (`login` action) checks `phoneVerifiedAt`: when null, it redirects to
  `/account/number?first=1` (the standalone number screen in "add"
  mode, pre-filled from `phone`), skippable; on later sign-ins the account
  page shows a quiet reminder row. Once verified, `passwordRetiredAt` is
  set and the `login` action refuses that account with the same message as
  a wrong password (FR-035: the password is no longer required or
  accepted; admins and editors are exempt).
- **Dormant numbers (FR-020)**: `lastSignInAt` older than the setting
  (12 months) → the code action returns `state: confirm-identity` with the
  account's first name only; "Yes" completes the sign-in, "No" clears
  `username`/`phoneVerifiedAt` on the old account, writes
  `number-detached`, and continues as a first visit for that number.
- **Rationale**: no migration of existing rows; unverified numbers never
  grant access (FR-036); admins keep one place to help a member (US8-S6).
- **Alternatives**: trusting `phone` when it matches exactly one account
  (an attacker who typed someone else's number at registration could take
  over that someone's new account); account merging (out of scope).

## §10 Standalone sign-in and the first-visit step (US4, US5)

- **Decision**: `/login` becomes the standalone number screen (the
  address is kept so every old link and `next=` redirect keeps working);
  `/login/code` is the code screen; `/login/welcome` is the first-visit
  step (role rows from the active audiences, name, acceptance). `/register`
  redirects permanently to `/login` (old links). State between screens is
  a short-lived HttpOnly cookie `shoot-signin` holding the current
  `sign-in-codes` row id and the `next` path (not the number, which the
  server reads from the row to show masked as "+971 50 ••• 4567"). A
  professional lands on `/account/profile` (feature 002 onboarding), a
  client on `next` or `/account`. Role labels: `siteSettings.labels.seekerLabel
  / providerLabel` already exist (feature 001) and are composed from the
  active personas when empty, as the register form does today.
- **Rationale**: one row id in a cookie keeps the number out of every
  address (FR-039) and lets a reload of the code page work; reusing
  `/login` keeps `requireUser` and every `next=` link unchanged.
- **Alternatives**: a single page with client-side steps (breaks without
  scripting); the number in a query string (forbidden).

## §11 Pre-existing bookings and briefs (US10, FR-038)

- **Decision**: `getMyBookings`/`getMyBriefs` match `member = user` **or**
  `client.whatsapp = user.username` (bookings) / `contact.whatsapp =
  user.username` (briefs), both already stored in E.164. Provider accounts
  only ever see bookings where they are the client through these two
  conditions; assigned jobs come from the existing assignment query.
- **Rationale**: no backfill; the comparison runs on indexed text columns
  (an index is added on `bookings.client.whatsapp` and
  `briefs.contact.whatsapp` in the migration).

## §12 Phone validation and the country list (FR-008, FR-009)

- **Decision**: `packages/domain/src/contact/phone.ts`: `parsePhone(input,
  defaultDialCode)` accepts local spellings (`050…`, `50…`, `00971…`,
  `+971…`, spaces, dashes, Arabic-Indic digits) and returns E.164 or a
  reason. UAE mobiles must match `+9715[0245689]\d{7}`; other countries are
  validated by E.164 length only. The country list (ISO code, dial code,
  localised name via `Intl.DisplayNames`) is reference data in the domain
  package, UAE first, then alphabetical in the visitor's language;
  `signIn.allowedCountries` (settings, empty = all) filters it.
- **Rationale**: a full numbering-plan library (`libphonenumber-js`, ~145
  KB) is not justified for one strict rule (UAE) plus E.164 elsewhere
  (Principle VIII); country names come from the platform.

## §13 Testing (Principle III)

- Domain: `otp.ts`, `phone.ts`, `countries.ts`, `checklist.ts` at 100%.
- Integration (Testcontainers): the `log` sender writes to a temp outbox
  the tests read; `now` is injected everywhere (`judgeAttempt`, limits),
  and `E2E_CLOCK` (feature 003) moves the dormant-account check.
- Component: `PhoneField`, `CodeBoxes`, `LearningSteps`, `AccountChecklist`,
  `SavedBooking`.
- E2E (Playwright, projects `mobile`, `desktop`, `nojs`, `ar-mobile`,
  `dark`): `po-us1-brief-signin.spec.ts`, `po-us2-codes.spec.ts`,
  `po-us4-standalone.spec.ts`, `po-us6-first-visit.spec.ts`,
  `po-us7-checklist.spec.ts`, `po-us8-fallback.spec.ts`; a helper
  `readLastCode(number)` tails the outbox file. Lighthouse CI adds the
  landing page in first-visit mode and `/login`.
- Privacy checks: an integration test greps the captured logger output and
  every rendered address for the test number and code (PO-US9-S6, SC-007).

## §14 What changes in features 001, 003 and 005

| Feature | Change | Why |
|---|---|---|
| 001 | `login` gains the verify-number prompt and the retired-password refusal; `register` page redirects to `/login`; `nav.login` label becomes "Sign in"; header `AccountLink` unchanged | US4-S7, US8 |
| 001 | `BriefBuilder` gains the "Continue your booking" row when `shoot-resume` is set | US1-S8 |
| 003 | `DetailsForm` loses name/WhatsApp; `requestQuotation` splits into `saveBookingDraft` and `bookFromDraft` (shared by the code action and the signed-in path) | US1-S1 to S6 |
| 003 | quotation page gains the `saved` mode (success + Open WhatsApp first) | US1-S4 no-JS |
| 003 | `getMyBookings` matches the verified number too | US10 |
| 005 | `recordAcceptances` is called from the code action and the welcome step | FR-021 |

Each row has its own task; existing 001/003/005 tests are updated in the
same task, never deleted.
