# Data model: Sign in with a mobile number and a one-time code

Server data lives in PostgreSQL through Payload, with one committed migration. Device data is one
value in the platform secure store. Rules and numbers come from `packages/domain/src/auth/otp.ts`
(research R4).

## OtpChallenge (`otp-challenges`, new collection)

`apps/web/src/modules/auth/collections/OtpChallenges.ts`. Server only: `admin.hidden: true`,
access `{ read: nobody, create: nobody, update: nobody, delete: nobody }`; read and written only by
`modules/auth/otp/challenges.ts` with `overrideAccess: true`. Not localised. No relationship to
`users`: a challenge exists before any account is looked up.

| Field | Type | Rule |
|---|---|---|
| `id` | serial | Payload id. Never exposed. |
| `publicId` | uuid, unique, indexed | The `challengeId` the client sees (random v4; not guessable, not sequential). |
| `phoneHash` | text, indexed | `HMAC-SHA256(OTP_HMAC_SECRET, "phone:" + e164)`, hex (R5). Never the number. |
| `codeHash` | text | `HMAC-SHA256(OTP_HMAC_SECRET, "code:" + publicId + ":" + code)`, hex. Never the code. |
| `channel` | select `sms` \| `whatsapp` | As requested. |
| `locale` | select `en` \| `ar` | Language of the message. |
| `attempts` | number, default 0 | Incremented atomically on every verify attempt (R6). |
| `expiresAt` | date, indexed | `createdAt + 5 min`. |
| `resendAt` | date | `createdAt + 60 s`. |
| `usedAt` | date, nullable | Set once, atomically, on success (or on an editor refusal, R13). |
| `supersededAt` | date, nullable | Set when a newer challenge is created for the same `phoneHash`. |
| `providerRef` | text, nullable | The provider's message id, for delivery reports. Not personal data. |
| `createdAt` | date | Payload timestamp. |

State (domain `challengeState`, in this order):
- `used` when `usedAt` is set;
- `expired` when `supersededAt` is set or `now ≥ expiresAt` (a superseded code answers as expired);
- `locked` when `attempts ≥ 5`;
- otherwise `live`.

Transitions:
- create → `live`, and every other `live` challenge with the same `phoneHash` gets `supersededAt`;
- verify with a wrong code → `attempts + 1` (the fifth wrong attempt makes it `locked`);
- verify with the right code while `live` → `usedAt` (single use);
- time passes → `expired`;
- cleanup cron deletes rows with `expiresAt` older than 24 hours.

## User (`users`, changed)

| Change | Detail |
|---|---|
| `auth.loginWithUsername` | `{ allowEmailLogin: true, requireEmail: false, requireUsername: false }` (R1). |
| `username` (Payload base field, overridden) | text, unique, E.164 `+9715XXXXXXXX`; `null` for email accounts. Field access: `create` and `update` → nobody (server code uses `overrideAccess`), `read` → self or admin. Admin UI: read-only, labelled "Sign-in number". |
| `email` | Now optional (`NOT NULL` dropped). Still unique. Code accounts have none. |
| `password` | Code accounts get 32 random bytes at creation, hashed by Payload, never revealed. |
| `name` | Now optional (`NOT NULL` dropped); `minLength: 2` when present. |
| `phone` | Unchanged: unverified contact number. A new code account sets `phone = username`. Never used to find an account. |
| `roles` | Code accounts are always `['member']`. Admin or editor → code sign-in refused (R13). |
| `accountType`, `persona` | From `signup` on creation only (R12). |
| `sessions` | Payload's array `{ id, createdAt, expiresAt }`; one entry per signed-in device. |
| hook `beforeOperation` (`login`) | Refuses a password login by `username` (FR-016). |
| `admin.useAsTitle` | `name` (was `email`); `defaultColumns` gain `username`. |
| `access.create` | `anyone` → `isAdmin` in User Story 5, when email registration is removed. |

Invariants:
- at most one user per `username` (unique index);
- `username` is set only by `verify-code` (new account) or `link-number` (US5);
- a user has a `username` or an `email` (Payload's `username` validation).

## Migration `users_phone_identity`

Created with `pnpm db:migration:create users_phone_identity`, committed with its `.json` snapshot.

| Step | Data effect |
|---|---|
| `CREATE TABLE otp_challenges (…)` with indexes on `public_id` (unique), `phone_hash`, `expires_at` | new, empty |
| `ALTER TABLE users ADD COLUMN username varchar` + unique index | additive; all rows `NULL` |
| `ALTER TABLE users ALTER COLUMN email DROP NOT NULL` | none |
| `ALTER TABLE users ALTER COLUMN name DROP NOT NULL` | none |
| Down: drop `otp_challenges`; drop `username`; restore `NOT NULL` on `email`, `name` | fails while code accounts exist (correct: it would destroy them) |

Review: no column is dropped or retyped on the way up, no row is rewritten, existing `phone` values
are not copied (they are unverified). `users-identity.int.test.ts` applies all migrations to a
database seeded with 001-era users and checks that every user, login and session survives.

## Session (Payload's `users.sessions`) and token

- **Session**: `{ id: uuid, createdAt, expiresAt = createdAt + 7 days }`; added by `mint.ts`,
  extended by `refreshOperation`, removed by `logoutOperation`. Expired sessions are dropped whenever
  one is added or refreshed.
- **Token**: a Payload JWT (HS256, `authVersion` header) with `id`, `collection: 'users'`, `sid`,
  `email` (absent for code accounts) and the `saveToJWT` fields (`roles`). The number is not in the
  token. `exp` = issued + 7 days.
- **Website cookie** (US5): the same token in `payload-token`, HTTP-only, `Secure` in production,
  `SameSite=Lax`, `expires = exp`.

## Allowance (`rate-limits`, existing)

Keys (one hourly window each, R7). None contains a phone number or a code; the address keys hold
the client address for the hour, as the existing brief limit already does:

| Key | Limit / hour | Counted on |
|---|---|---|
| `otp:phone:<phoneHash>` | 5 | `otp/request` |
| `otp:ip:<address>` | 20 | `otp/request` |
| `otp:install:<installId>` | 10 | `otp/request` (when the header is present) |
| `otp-verify:ip:<address>` | 30 | `otp/verify` |

A refusal is a 429 problem with `retryAfter` (seconds to the window's end).

## Legal acceptance (`legal-acceptances`, existing)

Written by the existing `recordAcceptances` when `verify-code` creates an account: `terms` and
`privacy` for seekers; plus `professional-terms` for providers.

## App: stored session (`apps/mobile/lib/core/auth/`)

Key `session.v1` in `flutter_secure_storage`, one JSON value:

```json
{ "token": "<jwt>", "exp": 1797000000, "user": { "id": "42", "name": null, "accountType": "seeker" } }
```

- No phone number on the device.
- A missing, unreadable or unparsable value is "signed out" and is deleted.
- First launch after install (no `install.seen` in 006's `PreferencesStore`): the key is deleted,
  then `install.seen = "true"` is written.

## App: SessionState (`SessionCubit`)

| State | Meaning | Next |
|---|---|---|
| `SessionUnknown` | before the store is read (never painted: read before `runApp`) | `SignedIn` or `SignedOut` |
| `SignedOut` | no session | `SignedIn` after verify |
| `SignedIn(user, exp)` | a stored session | `SignedIn` (refresh, `/me`), `SignedOut` (logout, 401, refresh 401) |

## App: SignInFlowState (`SignInFlowCubit`, `features/sign_in`)

Holds the number (E.164), channel, `challengeId`, `expiresAt`, `resendAt` (adjusted for clock skew),
the typed code (memory only), the role choice (`seeker` default), the join choices (personas,
accepted) and a status: `editingNumber`, `sending`, `awaitingCode`, `verifying`, `codeInvalid`,
`codeExpired`, `codeLocked`, `rateLimited(retryAfter)`, `sendFailed`, `signedIn(isNew,
accountType)`. Nothing in it is persisted.

## Entities in the domain package

- `OtpChannel = 'sms' | 'whatsapp'`
- `ChallengeState = 'live' | 'expired' | 'used' | 'locked'`
- `VerifyOutcome = 'ok' | 'invalid' | 'expired' | 'locked'`
- `Signup = { accountType: 'seeker' | 'provider'; personas: string[]; name?: string; acceptTerms?: true }`
