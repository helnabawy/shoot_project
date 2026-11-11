# Research: Sign in with a mobile number and a one-time code

Decisions for feature 009. Each entry gives the **Decision**, then the **Rationale**, then the
**Alternatives** considered. Payload facts below were read from `payload` 3.93.0 in
`node_modules` on 2026-11-11; vendor facts are as found on 2026-11-11 and are marked where they still
need a written quote.

## R1. Phone identity: `loginWithUsername`, with the E.164 number as the username

- **Decision**: turn on `auth.loginWithUsername` on `users` with
  `{ allowEmailLogin: true, requireEmail: false, requireUsername: false }`. The verified number in
  E.164 (`+971501234567`) is the `username`.
  - Payload adds a `username` field (`unique: true`, its own `username` validation, which requires a
    username or an email when neither is required). Existing users keep their email and no username.
  - `email` becomes optional (column `NOT NULL` dropped). Editors and existing email members still
    sign in with email.
  - The existing `phone` field stays what it is today: unverified contact information (WhatsApp
    default on booking details, `match/[ref]/[key]/details/page.tsx`). It is never used to find an
    account (FR-013). A new code account gets `phone = username` as its contact number.
  - The `username` field is overridden in `fields` (Payload merges a user field with the same name
    into the auth base field) with field access `create`, `read` (self or admin), `update` set so
    only server code with `overrideAccess` writes it (FR-017). See R12 for why this matters.
  - Password login accepts email only: a `beforeOperation` hook on `login` refuses a `username`
    login (FR-016), so `/api/users/login` cannot be used to guess passwords against, or lock, code
    accounts.
  - `name` becomes optional (column `NOT NULL` dropped; `minLength: 2` still applies when set).
    `admin.useAsTitle` moves from `email` to `name`, and `defaultColumns` gains `username`.
- **Rationale**:
  - It is Payload's documented way to have an auth collection whose members have no email. A unique
    `phone` field cannot make `email` optional without overriding Payload's required email field,
    which is undocumented.
  - It separates the verified sign-in number (`username`) from the unverified contact number
    (`phone`). Making today's `phone` unique and using it as the identity would let anyone who once
    typed somebody else's number into a booking or profile own that person's future sign-in (the
    real owner verifies a code and lands in the typist's account). `phone` is also not unique today,
    so a unique index could fail on existing duplicates.
- **Migration** (`pnpm db:migration:create users_phone_identity`), reviewed for data loss:
  - `ALTER TABLE users ADD COLUMN username varchar` plus a unique index: additive, all existing rows
    `NULL` (Postgres allows many `NULL`s under a unique index).
  - `ALTER TABLE users ALTER COLUMN email DROP NOT NULL` and the same for `name`: relaxes a
    constraint; no data changes.
  - No backfill: existing `phone` values are not copied into `username` (they are unverified).
  - Down migration: drops `username` and restores `NOT NULL` on `email` and `name`; it fails if
    code accounts exist (no email or no name), which is correct: rolling back would destroy them.
  - An integration test (`users-identity.int.test.ts`) runs the migration on a database seeded
    with 001-era users (email, password, phone duplicates) and checks every row and login survives.
- **Alternatives**:
  - **Unique `phone`, optional email, unusable random password**: rejected for the takeover and
    duplicate reasons above, and because it fights Payload's required email.
  - **A separate `phone-identities` collection** pointing at users: one more join on every sign-in
    for nothing `username` doesn't already give.

Both options need an unusable password for code accounts: Payload's local strategy hashes a password
on create. Code accounts get 32 random bytes (`crypto.randomBytes(32).toString('base64url')`), hashed
by Payload and never stored or returned anywhere else.

## R2. Token minting after a correct code

- **Decision**: `modules/auth/otp/mint.ts` issues a token the same way Payload's own login does:
  1. Find the user by `username` (or create one, R10), with `overrideAccess: true`.
  2. Add a session to `user.sessions`, mirroring Payload's non-exported `addSessionToUser`
     (`payload/dist/auth/sessions.js`): a `uuid` session id, `createdAt = now`,
     `expiresAt = now + tokenExpiration`, drop expired sessions, and
     `payload.db.updateOne({ collection: 'users', id, data: user, returning: false })` with
     `updatedAt` left untouched. `useSessions` is on (the 3.93 default).
  3. `jwtSign({ fieldsToSign: getFieldsToSign({ collectionConfig, email: user.email ?? undefined, sid, user }), secret: payload.secret, tokenExpiration })`,
     both exported from `payload` 3.93. `tokenExpiration` is the collection's 7 days. The protected
     header carries Payload's `authVersion`, so `JWTAuthentication` accepts it.
  4. Return `{ token, exp }` (exp in seconds since epoch, as `jwtSign` returns it).
  - **Refresh** uses Payload's exported `refreshOperation` with a request whose `user` (with `_sid`)
    came from `payload.auth({ headers })`: it extends the same session's `expiresAt` and signs a new
    token. **Logout** uses the exported `logoutOperation`, which removes the session with that `_sid`.
    Only the add-session step is copied.
- **Risk and guard**: copying a non-exported internal can break silently on upgrade.
  - Payload is exact-pinned (constitution), so an upgrade is a deliberate change.
  - `mobile-api-auth-session.int.test.ts` (OT-US3-S8) is the tripwire: mint, then `payload.auth` with
    `Authorization: Bearer` returns the user, then `logoutOperation`, then the same token gives
    `user: null` and the API answers 401. It also checks the minted token's claims equal those of a
    token from `payload.login` for an email account (same keys, same header).
  - The upgrade checklist in `apps/web/README.md` names `sessions.js` and this test.
- **Fallback** (recorded, not built): a custom `auth.strategies` entry on `users` that accepts
  opaque random tokens, stored as SHA-256 hashes in an `app-sessions` collection with expiry and
  revocation. It needs no Payload internals, but it is a second auth mechanism to maintain, so it is
  used only if the tripwire fails on an upgrade and the internal cannot be mirrored again.
- **Alternatives**:
  - `payload.login` with a known password per user: would need storing or deriving a password, and
    counts failed attempts against lockout.
  - A separate JWT signed with another secret: `payload.auth` would not recognise it (FR-024).

## R3. Bearer token for the app; the website keeps its HTTP-only cookie

- **Decision**:
  - The app sends `Authorization: Bearer <token>`. Payload's `extractJWT` already reads `Bearer`
    (default `jwtOrder` `['JWT', 'Bearer', 'cookie']`), so no Payload change is needed.
  - The token lives only in `flutter_secure_storage` (iOS Keychain, Android Keystore-backed
    encrypted storage), is short-lived (7 days) with refresh (R14), and is revocable server side
    through Payload sessions (`logout`, or an admin clearing `sessions`).
  - **The website keeps the HTTP-only, `Secure`, `SameSite=Lax` `payload-token` cookie.** When the
    website adopts codes (User Story 5), its server action mints the same token and sets it with the
    existing `setSessionCookie` in `modules/auth/actions.ts`. The web never exposes the token to
    JavaScript.
- **Rationale**: Principle VII names HTTP-only cookies because, in a browser, a cookie that script
  cannot read is the safest place for a session. A native app has no cookie jar that is safe from
  other apps or that the OS protects like the Keychain; the platform secure store is the native
  equivalent, and a Bearer header avoids CSRF entirely. The token is still Payload's built-in auth.
  See the Constitution Check in [plan.md](plan.md) and the Complexity Tracking row.
- **Constitution text**: Principle VII says "Authentication uses the CMS's built-in auth with
  HTTP-only, secure, same-site cookies". This plan satisfies its intent for the website and
  justifies the app's departure in Complexity Tracking. A PATCH amendment that adds "native apps keep
  the CMS's token in the platform's secure store and send it as a Bearer header" would make the text
  match; it is proposed, not made, by this feature.
- **Alternatives**:
  - A cookie jar in the app (`dio_cookie_manager` with a persistent store): plain files, no OS
    protection, and still CSRF-shaped.
  - Storing the token in `shared_preferences`: plain text (rejected by the skill and FR-023).

## R4. The pure OTP rules (`packages/domain/src/auth/otp.ts`)

- **Decision**: framework-free functions and constants, 100 % covered:
  - `OTP_CODE_LENGTH = 6`, `OTP_TTL_MS = 5 * 60_000`, `OTP_MAX_ATTEMPTS = 5`,
    `OTP_RESEND_COOLDOWN_MS = 60_000`, `OTP_CHANNELS = ['sms', 'whatsapp']`.
  - `OTP_LIMITS = { requestsPerPhone: 5, requestsPerIp: 20, requestsPerInstall: 10, verifiesPerIp: 30 }`
    per hour (FR-030).
  - `normaliseUaeMobile(input): string | null`: strips spaces, dashes, dots and brackets; accepts
    `05XXXXXXXX`, `5XXXXXXXX`, `9715XXXXXXXX`, `009715XXXXXXXX` and `+9715XXXXXXXX`; returns
    `+9715XXXXXXXX` or `null`. Built on `normaliseE164` from `domain/contact`, then
    `/^\+9715\d{8}$/`. Every UAE mobile range starts with 5 (050–058); the rule does not list
    operator prefixes, so a new range needs no change.
  - `formatCode(n: number): string` zero-pads to six digits; `isCodeShape(s)` is `/^\d{6}$/`.
  - `challengeState(challenge, now)`: `'live' | 'expired' | 'used' | 'locked'`, from `expiresAt`,
    `usedAt` and `attempts`.
  - `canResend(lastSentAt, now)` and `resendAt(lastSentAt)`.
  - `verifyOutcome({ state, codeMatches })`: `'ok' | 'invalid' | 'expired' | 'locked'`, with the
    rule that a locked or used challenge never succeeds, even with the right code (OT-US1-S5).
  - `maskPhone('+971501234567')` → `'+971 50 123 4567'` for display only (the app shows the
    person's own number back to them; it is never logged).
  - zod schemas for the request and verify bodies live in `packages/domain/src/api/v1/auth.ts`
    (contract triangle, see [contracts/auth-api.md](contracts/auth-api.md)).
- **Rationale**: Principle V and the skill: rules in the domain, framework-free; 100 % coverage gate.
- **Alternatives**: rules inside the handlers. Rejected: untestable without a server, and 012 needs
  the same rules on its own screens.

## R5. Generating, fingerprinting and comparing codes

- **Decision**:
  - Code: `crypto.randomInt(0, 1_000_000)` then `formatCode` (uniform, CSPRNG). Generated in
    `modules/auth/otp/codes.ts`, never in the domain package (which stays pure).
  - Code fingerprint: `HMAC-SHA256(OTP_HMAC_SECRET, "code:" + challengeId + ":" + code)`, hex.
    Binding the challenge id means a fingerprint from one challenge says nothing about another.
  - Phone fingerprint: `HMAC-SHA256(OTP_HMAC_SECRET, "phone:" + e164)`, hex. A plain hash would be
    reversible: the UAE mobile space (about 10^8) can be enumerated in seconds. The key makes it
    useless without the secret.
  - Comparison: `crypto.timingSafeEqual` on the two digests as equal-length buffers. A malformed
    code is compared against a dummy digest so the path takes the same time (OT-US2-S3).
  - `OTP_HMAC_SECRET`: a new environment variable, at least 32 characters, validated in
    `shared/lib/env.ts` and documented in `.env.example`. It is separate from `PAYLOAD_SECRET` so that
    rotating one does not invalidate the other; rotating it only invalidates codes in flight
    (5 minutes) and the rate-limit keys for the hour.
- **Rationale**: FR-005; a stolen database row cannot reveal a code or a number.
- **Alternatives**:
  - bcrypt or argon2 for codes: slow hashing protects low-entropy secrets at rest that live for
    years; a code lives 5 minutes and is limited to 5 tries, and the HMAC key is not in the
    database. A slow hash would only slow every verify.
  - Storing the code encrypted: reversible by design, for no gain.

## R6. Challenge storage and single use

- **Decision**: a server-only collection `otp-challenges` (see [data-model.md](data-model.md)) in
  `modules/auth/collections/OtpChallenges.ts`, `admin.hidden: true`, access
  `{ read: nobody, create: nobody, update: nobody, delete: nobody }` (the existing `nobody` helper).
  Only `modules/auth/otp/challenges.ts` touches it, always with `overrideAccess: true`.
  - **One live challenge per phone**: creating a challenge sets `supersededAt = now` on every live
    challenge with the same `phoneHash` (FR-003).
  - **Atomic attempts and use**: the attempt increment and the "mark used" step must not race (two
    devices, one code). Payload's Local API has no conditional update, so `challenges.ts` runs one
    SQL statement through the Postgres adapter's Drizzle instance (`payload.db.drizzle`):
    `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1 AND used_at IS NULL AND superseded_at IS NULL AND expires_at > now() AND attempts < $max RETURNING code_hash, attempts`,
    then, on a match, `UPDATE … SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id`.
    Zero rows means expired, used, superseded or locked (decided by a follow-up read for the error
    code). The table name comes from the generated schema, not a string literal.
  - **Cleanup**: the existing `/api/cron/cleanup` route also deletes challenges whose `expiresAt` is
    more than 24 hours old (FR-034).
- **Rationale**: Principle VII default-deny; single use is a correctness rule and needs the
  database's atomicity.
- **Alternatives**: keeping challenges in memory or Redis. Rejected: the app is stateless and
  horizontally scaled (Principle V), and Redis is a new service.

## R7. Rate limits through `consumeAllowance`

- **Decision**: reuse `consumeAllowance` (`shared/payload/rate-limit.ts`, hourly window in the
  `rate-limits` collection) with these keys, all without personal data:
  - `otp:phone:<phoneHash>` (5), `otp:ip:<ip>` (20), `otp:install:<installId>` (10) on request;
  - `otp-verify:ip:<ip>` (30) on verify.
  - The address comes from 008's `ActorContext.clientAddress` (`x-forwarded-for`, else
    `x-real-ip`), the install id from `ActorContext.installId` (`X-Shoot-Install`); commands never
    read headers themselves.
  - One backward-compatible change: the thrown 429 `APIError` gains `data: { retryAfter }` (seconds
    to the end of the window), so `defineHandler` can put `retryAfter` in the problem body and a
    `Retry-After` header. 008 makes this change (its task T094), because its own wrapper needs it;
    009 only relies on it. Existing callers (briefs, uploads) ignore it. The window stays one hour,
    so the cleanup cron's cut-off stays correct.
  - The resend cooldown (60 s) is not an allowance: it is read from the newest challenge for the
    phone hash (`resendAt`), so it is exact and per number.
- **Rationale**: the store already works across instances and is cleaned by cron. SC-005's bound
  (25 guesses per number per hour) follows from 5 requests × 5 attempts.
- **Alternatives**: a sliding-window limiter package. Rejected (Principle VIII), the fixed hourly
  window is enough.

## R8. Enumeration resistance and error codes

- **Decision**:
  - `otp/request` answers `202` with the same body for every valid number, account or not:
    `{ challengeId, channel, phone, expiresAt, resendAt }` (`phone` is the normalised number the
    person typed, echoed for the code screen). It does the same work in both cases (it never
    looks up the user at request time).
  - `otp/verify` looks the user up only after the code matched. Before that point every failure is
    one of `auth.errors.codeInvalid`, `auth.errors.codeExpired`, `auth.errors.codeLocked`. An
    unknown or superseded challenge id is `codeExpired`.
  - After a correct code the person has proven they hold the number, so answers may depend on the
    account: `isNew` in the response, `auth.errors.useEmailSignIn` for admin and editor accounts
    (FR-015), and `auth.errors.numberTaken` when linking (User Story 5).
  - The full list is in [contracts/auth-api.md](contracts/auth-api.md) and in
    `packages/domain/src/api/v1/problems.ts` (008), with strings in `apps/web/messages/{en,ar}.json`
    and in the app's `failure_message.dart` and ARB files.
- **Rationale**: FR-031 and OT-US2-S1.
- **Alternatives**: telling a new number "we'll create an account": friendlier, but it is exactly
  the leak the owner ruled out. The boards already handle it ("Returning? We recognise your number").

## R9. The message provider adapter and the console provider

- **Decision**: the interface and its two implementations are specified in
  [contracts/otp-provider.md](contracts/otp-provider.md):
  - `modules/auth/otp/providers/types.ts`: `OtpProvider.send({ channel, to, code, locale })` returns
    `{ ok: true, ref } | { ok: false, reason: 'unreachable' | 'rejected' | 'unavailable' }`, never
    throws for delivery failures.
  - `console.ts`: writes `{ challengeId, channel, to, code, locale, text, sentAt }` as one JSON file
    per challenge under `apps/web/.otp-outbox/` (git-ignored). It is a message channel, not a log:
    the logger never sees the code (FR-032). `pnpm otp:last` prints the newest code for a developer;
    Playwright reads the file by `challengeId`.
  - The vendor adapter (R10) implements the same interface with `fetch`; no SDK.
  - `index.ts` picks the provider from `OTP_PROVIDER` (`console` | `unifonic`).
  - **Production guard** in `shared/lib/env.ts`, the same shape as the `E2E_CLOCK` rule: when
    `NODE_ENV === 'production'` and `NEXT_PUBLIC_SITE_URL` is not `localhost` or `127.0.0.1`,
    `OTP_PROVIDER` must be set and must not be `console`; the vendor's variables must all be set
    together (like the S3 group). Unset `OTP_PROVIDER` means `console` outside production.
- **Rationale**: FR-040; e2e needs to read real codes without a phone; the guard is proven
  (OT-US2-S5).
- **Alternatives**: a test-only endpoint that returns the last code: an endpoint is reachable in a
  deployment by mistake; a file is not. Logging the code in development: violates FR-032 and trains
  people to read codes from logs.

## R10. The real SMS and WhatsApp vendor

Codes are generated, stored and checked by this feature (R4–R6), so the vendor only **delivers a
message**. Vendor "verify" products that generate and check codes themselves are not used: they
would duplicate the rules, split the audit trail and lock the feature to one vendor.

| Criterion | Unifonic | Infobip | Twilio |
|---|---|---|---|
| UAE focus | MENA-headquartered (Riyadh), regional operations; Arabic support | Global, strong MEA presence | Global, US-centred |
| SMS sender ID in the UAE | Helps register an alphanumeric sender ID with the regulator (TDRA) and both operators (etisalat by e&, du) | Same, through local partners | Same, through partners; slower reported turnaround |
| WhatsApp | Official Business Solution Provider; authentication templates with copy-code button | Official BSP | Official BSP (also inside Verify) |
| Reported SMS OTP price (UAE, Nov 2026, third-party sources) | about AED 0.10, billed in AED | negotiated, USD | about AED 0.15, billed in USD |
| WhatsApp authentication (Meta's rate, UAE) | Meta rate about USD 0.0157 plus BSP fee | same | same |
| Data residency | to confirm in writing (regional hosting stated in sales material; not verified) | to confirm in writing | processing in the US by default |
| API | REST, JSON | REST, JSON | REST, JSON; best documentation |

What applies to every vendor:
- UAE A2P SMS needs a registered sender ID; operators require a company trade licence and a no
  objection letter, and approval reportedly takes 2–4 weeks. Unregistered or promotional traffic is
  blocked or prefixed. Codes are transactional traffic.
- WhatsApp needs a WhatsApp Business account, a verified business, and an approved **authentication**
  template (Meta fixes its wording; the template can carry a copy-code button).
- The UAE Personal Data Protection Law (Federal Decree-Law 45 of 2021) covers phone numbers and
  message logs; the contract must state where message content and delivery logs are stored and for
  how long, and we send only the number and the code.

- **Decision**: **recommend Unifonic**, implemented as `providers/unifonic.ts` behind the adapter.
  - Rationale: the regional provider with the strongest UAE sender-ID support and an official
    WhatsApp BSP in one account, AED billing, and the lowest reported SMS price. Adapter isolation
    keeps a switch to Infobip or Twilio to one file.
  - **Needs owner approval** and a Complexity Tracking entry (in [plan.md](plan.md)) before
    implementation. Before signing: a written price quote for SMS and WhatsApp in the UAE, the data
    residency and retention commitment, and the sender-ID registration plan (name "Shoot" or the
    final brand). Prices in this table are from third-party comparison pages and resellers, not from
    the vendors.
  - Until approval and registration are done, every environment uses the console provider; the
    production guard (R9) keeps production from starting without a real provider.
- **Alternatives**: Infobip (close second; choose it if Unifonic's residency answer is weaker);
  Twilio (best developer experience, but US-hosted and the most expensive per message); building on
  each operator's SMS gateway directly (two contracts and two integrations).

Sources consulted: Message Central's UAE A2P and OTP pricing guides (messagecentral.com), Telerivet's
UAE TDRA guide (telerivet.com), SleekFlow's and Zernio's WhatsApp UAE price tables (sleekflow.io,
zernio.com), Meta's WhatsApp Business Platform pricing page (developers.facebook.com), Unifonic's
trust centre (unifonic.com). All are to be confirmed against the vendor's own quote.

## R11. Message text and one-time-code autofill

- **Decision**:
  - **SMS** text is an interface string in `apps/web/messages/{en,ar}.json` (`auth.otp.sms`), in the
    person's language (`Accept-Language` at request time):
    `Your Shoot code is 482713. It expires in 5 minutes. Don't share it.` followed by a blank line and
    the domain-bound line `@shoot.ae #482713` (host from `NEXT_PUBLIC_SITE_URL`). The last line is
    the origin-bound one-time-code format that iOS and Safari use to offer the code only to this
    domain and to the app associated with it (008's `apple-app-site-association` `webcredentials`).
  - **WhatsApp** uses the approved authentication template in the person's language (`en`, `ar`),
    with the code as its one parameter and the copy-code button. Android one-tap autofill from
    WhatsApp needs the app's package name and signing hash in the template; it is left for later.
  - **App autofill**: the hidden `TextField` inside `OtpCodeInput` (007) has
    `autofillHints: [AutofillHints.oneTimeCode]`, `keyboardType: TextInputType.number` and
    `maxLength: 6`, inside an `AutofillGroup`. On iOS this shows "From Messages"; on Android it maps
    to the autofill framework's SMS OTP hint, which Google's autofill service fills. A paste or an
    autofill of six digits fills all cells and submits.
  - **Web autofill** (User Story 5): `<input autocomplete="one-time-code" inputmode="numeric">`.
- **Rationale**: FR-042, FR-053, OT-US1-S10, with no extra package.
- **Alternatives**: Android SMS Retriever API (needs an app hash in the SMS and a plugin such as
  `sms_autofill`; a new package for a small gain over the autofill framework); the WebOTP API on the
  web (Chrome only; the `autocomplete` attribute already covers it with the domain line).

## R12. What a new account gets, and the role question

- **Decision**: `otp/verify` takes an optional `signup` object, used only when the number has no
  account (FR-012):
  `{ accountType: 'seeker' | 'provider', personas?: string[], name?: string, acceptTerms?: true }`.
  - **Seeker** (default when `signup` is absent): records `terms` and `privacy` acceptances through
    the existing `recordAcceptances` (`modules/legal/record.ts`); `acceptTerms` is implied by
    continuing (board 20's line).
  - **Provider**: needs `personas` (1–4 active slugs, checked with the existing
    `isProviderRegistrationValid`) and `acceptTerms: true`; records `terms`, `professional-terms` and
    `privacy`. A missing or inactive persona answers `auth.errors.personaRequired` or
    `auth.errors.personaInactive` **before** the code is checked, so no attempt is spent
    (OT-US4-S6).
  - **Name** is saved when given (screen 11, 012); otherwise `null`.
  - **Who sees the role question**: only the standalone sign-in. On screen 21 the default is
    "I need a …". Choosing "I'm a …" and pressing Continue does not call `verify`: the app keeps the
    code in memory and opens screen 23 in its finish form (number filled in and read-only with
    "Change number", Top Hit "Continue"), which then verifies with the provider `signup`. From the
    menu, screen 23 sends the code first and screen 21 opens without the role question.
  - **A returning number** with any `signup`: signed in, account unchanged, `isNew: false`.
    Becoming a creator from a client account is feature 014's.
  - **Race**: two first verifies for the same new number. The second `create` hits the unique
    `username` index; the command catches the unique violation and re-reads the user, so both
    devices sign in to one account.
- **Rationale**: a creator account without professions or Professional Terms would break feature
  002's rules and feature 005's "registration without acceptance is refused".
- **Alternatives**: creating the account as a client and converting it on screen 23 (a conversion
  endpoint this feature does not otherwise need); a two-step verify with a signup ticket (more state
  for the same result).

## R13. Admin and editor accounts

- **Decision**: after a correct code, a user whose `roles` include `admin` or `editor` is refused
  with `auth.errors.useEmailSignIn` (403), and the challenge is marked used. Code accounts are always
  created with `roles: ['member']` (the field's access already stops members granting roles).
- **Rationale**: SIM-swap makes a code a weaker factor than a password for the accounts that can
  change the whole site. FR-015.
- **Alternatives**: code plus password for editors (two-factor): a good later step, out of scope.

## R14. The app's session: storage, cubit, interceptor

- **Decision** (`apps/mobile/lib/core/auth/`):
  - `SessionStore` (interface) with `SecureSessionStore` on `flutter_secure_storage` (exact pin;
    iOS `KeychainAccessibility.first_unlock_this_device`, Android encrypted shared preferences) and
    `MemorySessionStore` for tests. It keeps `{ token, exp, user: { id, name, accountType } }` as one
    JSON value under `session.v1`. No phone number is stored on the device.
  - **First-run wipe**: the Keychain survives an uninstall on iOS. On start, if the 006
    `PreferencesStore` has no `install.seen` key, the store is wiped and the key is written
    (OT-US3-S5). A read error from secure storage (for example after a device restore on Android) is
    treated as signed out and wipes the value.
  - `SessionCubit`: `SessionUnknown` → `SignedOut` | `SignedIn(user)`. The first frame waits for the
    store read (it happens before `runApp`, like 006's saved appearance), so no flash (OT-US3-S1).
    `SignedIn` comes from the store; `GET /me` refreshes the user in the background and a 401 moves
    to `SignedOut`.
  - `AuthInterceptor extends QueuedInterceptor` (Dio): `onRequest` adds the Bearer token; when
    `exp - now < 2 days` it first calls `POST auth/refresh` through a **separate** Dio without this
    interceptor (no recursion), saves the new token, then continues. `QueuedInterceptor` serialises
    requests, so one refresh serves every queued request. A refresh that fails on the network keeps
    the old token; one that answers 401 clears the session. `onError`: a 401 on a request that
    carried a token calls `SessionCubit.expire()` (clears the store, `SignedOut`).
  - The injected `Clock` from 007 supplies `now`; the countdowns use the server's `expiresAt` and
    `resendAt` offset by the difference between the server's `Date` header and the device clock at
    receipt.
  - Logs: the interceptor never logs headers or bodies of `auth/*` requests.
- **Rationale**: FR-020 to FR-023. A token refreshed when under 2 days left keeps a weekly user
  signed in (SC-007).
- **Alternatives**: refresh on 401 and retry (the skill's earlier sketch): it lets a request fail
  first and makes every expired-token response ambiguous between "refresh" and "revoked"; refreshing
  ahead of expiry means a 401 always means "signed out".

## R15. The sign-in feature in the app, routes and guards

- **Decision**:
  - `features/sign_in/` holds `domain/` (`OtpChallenge`, `SignupChoice`, `AuthRepository`, use cases
    `RequestCode`, `VerifyCode`), `data/` (models decoding the shared JSON examples, a Dio datasource,
    the repository) and `presentation/` (`SignInFlowCubit`, pages for 20, 21–22 (one page, error
    state), 23).
  - Feature 012 reuses the domain use cases and the core widgets for screens 10 and 11, with its own
    page and cubit (no role question, optional name). The countdown logic is a pure domain class
    (`ResendTimer`) so both cubits share it.
  - `core/auth/` holds the session (R14) and `AuthApi` (refresh, logout, me), because the
    interceptor and the guard are app-wide and `core/` cannot import a feature.
  - Routes (from 007's table): `/login` (20), `/login/code` (21, 22), `/register` (23). They flip to
    `built: true`. `SignInFlowCubit` is provided above the three routes (a `ShellRoute`), so the
    number, channel and challenge survive moving between them; opening `/login/code` without a
    challenge redirects to `/login`.
  - **Guard**: routes with `auth: required` (`/account/**`) redirect a signed-out person to
    `/login?next=<encoded path>`. After sign-in, `next` is followed only if `safeNext` (a Dart port of
    the web's `safe-next.ts`) accepts it: starts with one `/`, no scheme or `//`, and matches a route
    in the table; otherwise home (OT-US3-S7). Until 013 builds `/account`, an accepted `next` that is
    unbuilt still shows not-found, as 007 specifies.
  - **Where to after sign-in with no `next`**: new provider → `/account/profile` (014), others →
    `/account` (013); until those are built, `/`.
  - The header account icon (007's `ShootHeader` trailing slot, wired in 010) opens `/login` when
    signed out and `/account` when signed in.
  - "Editor? Sign in with email" and the legal links open the website in the browser (R17).
- **Rationale**: the skill's layering rule (features import only other features' `domain/`), and
  the boards' flow.
- **Alternatives**: putting everything in `core/auth/`: makes `core` own feature logic.

## R16. Screens 20–23 against their boards

- **Decision**:
  - Built from 007's catalogue: `ShootHeader` (back, wordmark, language button `عربي`), `PhoneField`
    (`.ph`, 52 high), `SegmentedControl` (`.seg`, 40 high, on = ink), `OtpCodeInput`, `TopHit`,
    `TextLink` (`.quiet`), `MessageBanner` (rate-limit and send-failure states), `ShootPanel`.
  - **Catalogue correction**: board 21's code cells are `.box`: 56 high, radius 9, gap 8, 26 px
    weight 500 tabular, 1 px `controlBorder`, the active cell a 2 px `accent` border. 007's catalogue
    row says 44; this feature changes `OtpCodeInput` to the board and its component golden.
  - **New catalogue widgets** (added to `core/widgets/` with tests, component goldens and gallery
    entries, per the skill's rule that a screen needing a new part adds it to the catalogue):
    - `ChoiceRowGroup` (board 21 `.panel` with `.row` radios: rows min 44, padding 7 8, radius 9,
      16/1.375; selected = `selectionWash` with `accentInk` text and an `accent` tile with
      `onAccent` icon; radio-group semantics);
    - `CheckLine` (board 23 `.ck`: 22 px checkbox in `accent`, gap 12, 14/1.5 `bodyInk`, inline
      links);
    - `InlineError` (board 22 `#err`: icon plus 15/1.45 `onDanger` text, live region, `role=alert`).
  - Fidelity: screens 20, 21, 22, 23 join `fid/shipped.json`; goldens in four variants; board 42 is
    the designer's ar-dark reference for 21 and already validates the derivation (007). Arabic board
    strings for 20, 22 and 23 go in `canvas/strings.ar/` with the same text as the ARB files.
  - Placeholder data for the goldens (number `+971 50 123 4567`, countdown `0:42`, professions
    Photographer and Videographer) comes from the shared examples
    (`packages/domain/src/api/v1/examples/`), never from the app's code.
  - The role rows' text is an ARB pattern with a list placeholder ("I need a {list}"), filled from
    the active personas' singular names joined with the locale's "or"; screen 23's segments are the
    personas plus `Both`/`All` (the same rule as the website's `auth.personaCombined`).
- **Rationale**: FR-050, FR-052; the design-fidelity and persona-extensibility skills.

## R17. Opening the website from the app (`url_launcher`)

- **Decision**: add `url_launcher` (exact pin) to open, in the system browser or in-app browser tab:
  the Terms, Professional Terms and Privacy Policy on screens 20 and 23 (until 015 builds legal
  pages in the app), and "Editor? Sign in with email" (the website's `/login/email` once User Story 5
  ships; `/login` before). Feature 012 reuses it to open WhatsApp. If an earlier feature has already
  added it, this decision only reuses it.
- **Rationale**: a person must be able to read what they accept before accepting it (005); the
  email fallback lives on the website.
- **Alternatives**: hiding the links in the app (fails the legal requirement); a hand-written
  platform channel (more code for the same thing).

## R18. The website adopts codes (User Story 5)

- **Decision**:
  - Commands shared by the API and the server actions, per the skill:
    `modules/auth/commands/request-code.ts`, `verify-code.ts`, `refresh-session.ts`,
    `end-session.ts`, `link-number.ts`. They take an `ActorContext` (008) and return a
    `CommandResult`; `actions.ts` and `api.ts` are thin adapters.
  - Routes: `/login` becomes the number step and `/login/code` the code step (the site's Brief Bar
    design, built with the impeccable workflow); `/login/email` keeps today's `LoginForm`;
    `/register` becomes Join as a creator by code; the email `RegisterForm` and the `register`
    action are removed.
  - The cookie: the verify action calls `setSessionCookie(token, exp)` (unchanged), so the cookie is
    the same HTTP-only `payload-token`.
  - `logout` calls `logoutOperation` for the cookie's session before deleting the cookie (today it
    only deletes the cookie, leaving the session alive for 7 days).
  - `users.access.create` changes from `anyone` to `isAdmin`: with email registration gone, no
    public endpoint creates users; the commands use `overrideAccess`.
  - Linking: `link-number.ts` requires a signed-in user without a `username`; after a correct code
    it sets `username` (and `phone` if empty), or answers `auth.errors.numberTaken` (409) if another
    account has that username. The account page shows "Add your mobile number" when `username` is
    empty.
  - Amend feature 001's spec (FR-019 to FR-022) and its tests: `us4-auth.spec.ts` and
    `auth.int.test.ts`/`actions.int.test.ts` registration cases move to the code flow or are
    deleted with the email registration; the email login and lockout cases stay.
- **Rationale**: FR-060 to FR-063; one body of logic for both clients.
- **Alternatives**: keeping email registration beside codes: two account kinds to support forever,
  and the owner ruled email to an editor fallback.
