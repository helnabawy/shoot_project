# Data Model: Mobile Number Sign-In with a One-Time Code

**L** = `localized: true` (English fallback). Numbers are stored in E.164
(`+971501234567`). Dates without time are `YYYY-MM-DD` in Asia/Dubai. Types
are generated (`payload-types.ts`), never hand-edited. Access: **A** admin,
**E** editor, **O** owner (signed-in user through the noted field), **P**
public, **S** server only (Local API with `overrideAccess`), **–** nobody.
One additive migration: `otp_signin`.

## `users` (edited, module `auth`) — FR-001, FR-021, FR-024, FR-025, FR-033 to FR-037

Auth options: `loginWithUsername: { allowEmailLogin: true, requireEmail:
false, requireUsername: false }`, `useSessions` unchanged (on),
`tokenExpiration`, `maxLoginAttempts`, `lockTime` unchanged. `admin.useAsTitle`
becomes `name`.

| Field | Type | Change | Rules |
|-------|------|--------|-------|
| `email` | email (auth) | now optional | unique when present; required for admins and editors (validate) |
| `username` | text (auth, from `loginWithUsername`) | new | the **verified** number, E.164, unique; set only by the server (field `create/update: serverOnly`) or an admin; read **A** or self |
| `password` | auth | unchanged | random 32 bytes for accounts created by code, never shown |
| `phone` | text | kept | the *unverified* number on file (feature 001); normalised E.164; never grants access |
| `phoneVerifiedAt` | date | new | set when `username` is verified; read **A**/self; write **S**/**A** |
| `phoneVerifiedBy` | select `member \| admin` | new | who verified; write **S**/**A** |
| `passwordRetiredAt` | date | new | set for a member once a number is verified; the `login` action refuses the account (FR-035); never set for admins/editors |
| `lastSignInAt` | date | new | updated on every successful sign-in (both ways); drives FR-020 |
| `preferences.locale` | select `en \| ar` | new | optional; applied on sign-in |
| `preferences.theme` | select `light \| dark \| system` | new | optional |
| `checklistCompletedAt` | date | new | set when every checklist row is complete |
| `name`, `roles`, `accountType`, `persona`, `categories` | | unchanged | `accountType` remains `seeker \| provider`; the public words are "client" and "professional" |

Access unchanged (`create: anyone` with field access; `read/update:
isAdminOrSelf`; `delete: isAdmin`), plus field access above. `roles` keeps
`create/update: isAdminField` (FR-024).

Hooks: `beforeChange` normalises `username` to E.164 and refuses a value
already used (readable message); when an admin sets or clears `username`,
sets `phoneVerifiedAt/By = admin` and records an `account-events` row;
`beforeValidate` requires `email` for admins and editors.

Index: `username` (unique, from Payload), `lastSignInAt`.

## `sign-in-codes` (new, module `auth`) — FR-012 to FR-015, FR-040, FR-041

| Field | Type | Rules |
|-------|------|-------|
| `number` | text, required, indexed | E.164 |
| `channel` | select `sms \| whatsapp`, required | |
| `locale` | select `en \| ar` | message language |
| `codeHash` | text, required | `HMAC-SHA256(PAYLOAD_SECRET, "{id}:{code}")`, base64url; field read **–** |
| `expiresAt` | date, required | `createdAt + codeLifetimeMinutes` |
| `attempts` | number, default 0 | incremented before each comparison |
| `state` | select `pending \| used \| expired \| replaced \| locked`, default `pending`, indexed | one `pending` per number |
| `usedAt` | date | |
| `purpose` | select `brief \| standalone \| add-number \| change-number` | which flow asked |
| `briefRef` | text | the brief reference for the `brief` purpose (the key is never stored) |
| `userId` | relationship → users | set when the row verified an existing account |
| `deviceKey` | text, indexed | `HMAC(secret, shoot-device cookie)` or hashed IP |
| `deliveryStatus` | select `queued \| sent \| failed` | from the sender |
| `deliveryError` | text | reason without the number |
| `providerRef` | text | the provider's message id |

Access: **read A** (admin sign-in events view), everything else **S**.
Retention: the booking clock (`/api/cron/bookings`, feature 003) deletes
rows older than `signIn.eventRetentionDays` (default 30). Never contains a
readable code.

## `account-events` (new, module `auth`) — FR-016, FR-020, FR-037, FR-041

| Field | Type | Rules |
|-------|------|-------|
| `user` | relationship → users, indexed | may be null after deletion |
| `kind` | select `number-set \| number-cleared \| number-detached \| lock-cleared \| password-retired \| dormant-confirmed` | |
| `actor` | relationship → users | the admin, or the member themself |
| `actorRole` | select `admin \| member \| system` | |
| `at` | date, required | |
| `note` | text | no numbers, no codes |

Access: **read A**, write **S**. Retention as `sign-in-codes`.

## `rate-limits` (existing, module `brief`) — FR-015

Unchanged shape (`key`, `count`, `windowStart`). New keys and windows
(research §4): `otp:number:{e164}` (window `codesPerNumberWindowMinutes`),
`otp:device:{deviceKey}` (60 min), `otp:day:{YYYY-MM-DD}` (24 h),
`otp:lock:{e164}` (window `lockMinutes`). `consumeAllowance` gains a
`windowMs` parameter; existing callers keep the hourly default. Admin
"clear lock" deletes the `otp:lock:` row (admin UI action on the user).

## `briefs` (edited, module `brief`) — FR-003, FR-007

| Field | Type | Rules |
|-------|------|-------|
| `draft` | group, hidden in admin, field read **S** | the booking draft awaiting a verified number |
| `draft.picks` | text | `persona:code,…` as the match query encodes it |
| `draft.date` | text `YYYY-MM-DD` | |
| `draft.addOnIds` | text (json array) | |
| `draft.promo` | text | normalised promo code or null |
| `draft.savedAt`, `draft.expiresAt` | date | `expiresAt = savedAt + quotationValidDays` |

Cleared when the booking is created. An expired draft is ignored (3b sends
back to step 2 with a message).

Index added: `contact.whatsapp` (US10 matching).

## `bookings` (existing, module `booking`) — FR-004, FR-038

No new fields. `member` is always set when created through the code step;
`client.whatsapp` is the verified number; `client.name` the account name.
Index added: `client.whatsapp`.

## `site-settings` (edited, global) — FR-009, FR-016, FR-019, FR-047

New tab **Sign-in** (`signIn` group):

| Field | Type | Default | Spec |
|-------|------|---------|------|
| `codeLifetimeMinutes` | number 1–30 | 5 | FR-012 |
| `attemptsPerCode` | number 1–10 | 3 | FR-013 |
| `lockMinutes` | number 1–1440 | 15 | FR-013 |
| `resendAfterSeconds` | number 15–300 | 60 | FR-014 |
| `codesPerNumber` | number 1–20 | 3 | FR-015 |
| `codesPerNumberWindowMinutes` | number 1–1440 | 15 | FR-015 |
| `codesPerDevicePerHour` | number 1–100 | 10 | FR-015 |
| `dailyCap` | number 1–100000 | 500 | FR-015 |
| `dormantAfterMonths` | number 1–60 | 12 | FR-020 |
| `eventRetentionDays` | number 1–365 | 30 | FR-041 |
| `allowedCountries` | select hasMany of ISO codes (from the domain list) | empty = all | FR-009 |
| `sendingPaused` | checkbox | false | FR-047 |
| `smsTemplate` | textarea **L** | "{brand}: your code is {code}. It expires in {minutes} minutes." | FR-019 |
| `whatsappTemplateRef` | group `{ en: text, ar: text }` | empty | FR-019 (approved template ids; WhatsApp is offered only when the sender env and both refs are set) |
| `numberChangedTemplate` | textarea **L** | "{brand}: your sign-in number was changed. If this wasn't you, message us." | FR-025 |

Read **S** for the limits (never public); the template texts are edited
by **E**, limits by **A** (field access). The existing `labels.seekerLabel`
/ `providerLabel` (feature 001) supply the role rows of US5.

## `first-visit` (new global, module `landing`) — FR-026 to FR-028, FR-030, FR-032

| Field | Type | Rules |
|-------|------|-------|
| `splash.line` | text **L** | under the wordmark; defaults to the hero headline when empty |
| `steps` | array, exactly 3, ordered | |
| `steps[].title` | text **L**, required ≤ 60 | |
| `steps[].body` | text **L**, required ≤ 200 | |
| `steps[].illustration` | select `brief-bar \| price-and-creators \| number-and-code` | which component is staged |
| `steps[].action` | text **L** | the primary label; the last defaults to "Start a brief" |
| `howItWorksLabel` | text **L** | footer link label |
| `checklist.title`, `checklist.laterLabel` | text **L** | |
| `checklist.rows` | group of 4 × `{ label **L** }` | number, name, email, language and theme |
| `checklist.facts` | array ≤ 3 of `{ text **L** ≤ 120 }` | "What your account does" |

Access: read **P**, update **E**. Revalidates tags `landing` and
`first-visit`. Seeded with the handoff copy in both languages.

## Domain rules (`packages/domain/src/auth`, `.../contact`) — 100% covered

- `otp.ts`: `newCode(random)`, `hashInput(id, code)`, `judgeAttempt(request,
  now, settings)`, `resendAllowedAt(request, settings)`, `isDormant(lastSignInAt,
  now, months)`.
- `limits.ts`: `limitKeys(number, deviceKey, day)`, `limitWindows(settings)`.
- `phone.ts`: `parsePhone(input, defaultDialCode)` → `{ ok, e164 } | { ok:
  false, reason }`, `maskNumber(e164)`, `formatNumber(e164, locale)`.
- `countries.ts`: ordered list `{ iso, dial }` with UAE first; names from
  `Intl.DisplayNames`.
- `checklist.ts`: `checklistProgress(account)` → `{ done, total, next }`.
- `signin-flow.ts`: `nextStep(input)` for the brief flow (signed-in → book;
  draft expired → step 2; otherwise 3b/3c) and for the standalone flow
  (new number → welcome; dormant → confirm; else → next).

## Relationships

```text
sign-in-codes.userId        ──▶ users (one, optional)
account-events.user/actor   ──▶ users
briefs.draft                (value on the brief; no relation)
bookings.member             ──▶ users (set by the code step)
legal-acceptances.user      ──▶ users (feature 005, written at first visit)
```

## Access matrix (new or changed)

| Collection / global | Public | Member | Editor | Admin |
|---|---|---|---|---|
| users (`username`, `phoneVerifiedAt`, `lastSignInAt`, `preferences`) | — | read/update own (`preferences`, `email`); `username` read-only | — | all |
| sign-in-codes | — | — | — | read |
| account-events | — | — | — | read |
| rate-limits | — | — | — | read, delete (`otp:lock:` rows) |
| briefs.draft | — | — | — | — (server only) |
| site-settings.signIn | — | — | templates | all |
| first-visit | read | read | update | update |

## Seed (FR-019, FR-028)

`signIn` defaults as above with the SMS template in both languages;
`first-visit` with the handoff's three steps, checklist rows and three
facts in both languages. No demo accounts; e2e fixtures create accounts
through the flow with the `log` sender.
