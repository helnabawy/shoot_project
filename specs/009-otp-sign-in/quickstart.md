# Quickstart: Sign in with a mobile number and a one-time code

How to prove feature 009 works.

- Rules and records: [data-model.md](data-model.md).
- Endpoints, bodies and problem codes: [contracts/auth-api.md](contracts/auth-api.md).
- Providers, the console outbox and environment: [contracts/otp-provider.md](contracts/otp-provider.md).

## Prerequisites

- Features 007 and 008 merged (widgets, router, fidelity check; `defineHandler` with success
  statuses, `problems.ts`, the endpoint registry, the install id and `ActorContext.clientAddress`,
  `consumeAllowance` with `retryAfter`, `GET site` and `GET personas`).
- Node 24 and pnpm (`nvm use`), Docker (PostgreSQL 17 and Testcontainers), Flutter 3.47.9 and
  Dart 3.13.7.
- `.env` from `.env.example` with `OTP_HMAC_SECRET` set (`openssl rand -hex 32`) and `OTP_PROVIDER`
  unset or `console`.
- An iOS simulator and an Android emulator for the manual checks; a real phone with a UAE SIM for the
  vendor check (after owner approval and sender-ID registration).

## Automated checks

From the repository root:

```bash
pnpm install
docker compose up -d postgres
pnpm db:migrate                       # includes users_phone_identity
pnpm typecheck && pnpm lint
pnpm test                             # domain (otp 100 %), web unit, integration (Testcontainers)
pnpm test:coverage                    # domain 100 %, app ≥ 80 %
pnpm build && pnpm test:e2e --grep OT-   # request specs through the console outbox; US5 browser specs
pnpm fidelity --grep "20|21|22|23"    # screens 20–23 in four variants
pnpm check:scenarios                  # includes specs/009-otp-sign-in/quickstart.md
```

In `apps/mobile`:

```bash
dart format --set-exit-if-changed lib test
flutter analyze                       # no issues
flutter test --coverage               # unit, cubit, widget; 80 % of changed lines
tool/goldens.sh                       # screens 20–23 and the new widgets, in the Linux image
```

Expected results:
- `otp.ts` at 100 % statements and branches.
- `mobile-api-auth-session.int.test.ts` passes: the minted token is accepted by `payload.auth`, refused after
  logout (the tripwire for the mirrored Payload internal).
- No line of the test output contains `+9715`, `9715` followed by eight digits, or a six-digit code
  from the outbox (`mobile-api-auth-protection.int.test.ts` asserts this on the captured logger).
- Fidelity: screens 20–23 pass with `diffRatio ≤ 0.01` and every box within 1 px, in four variants.

## Manual checks

Run against `pnpm dev` with the console provider. Read codes with `pnpm --filter web otp:last`.
Check in English and Arabic, light and dark, on a 360 px Android emulator, an iPhone simulator and an
iPad.

1. Tap the header account icon (or open `/login`). Screen 20 shows. Enter `50 123 4567`, keep SMS,
   send. Screen 21 shows "Sent by SMS to +971 50 123 4567" and a countdown from 1:00.
2. Enter the code from `otp:last`. A new client account is signed in. In `/admin`, the account shows
   the sign-in number and two legal acceptances; its email is empty.
3. Sign out, sign in again with the same number by WhatsApp. Same account; the role choice is
   ignored.
4. Enter a wrong code. Screen 22 shows, matching its board; "Try again" clears the cells.
5. Enter five wrong codes, then the right one: refused, "Ask for a new one".
6. Wait 5 minutes and enter a code: expired.
7. Before the countdown ends, "send it on WhatsApp" is not available; after it, a new code arrives on
   WhatsApp and the old one fails.
8. Enter `44 123 4567` (not a mobile range) or a foreign number: the field explains; nothing is sent.
9. On a real device (vendor configured): the keyboard offers the code from Messages (iOS) or the SMS
   autofill suggestion (Android); accepting fills all six cells.
10. From the menu, open Join as a creator (23). Choose two professions, accept, send, enter the code.
    A creator account with both professions and three acceptances exists.
11. On screen 21 choose "I'm a …" and Continue: screen 23 opens with the number filled in; complete
    it without a new code.
12. Kill and reopen the app: still signed in, no flash of the signed-out state. Sign out (the debug
    gallery's Session section until 013 builds the account screen) and replay
    the old token with `curl -H "Authorization: Bearer …" /api/mobile/v1/me`: 401.
13. Delete and reinstall the app (iOS): signed out on first launch.
14. Open `/account` signed out: screen 20 opens; after sign-in the app returns to `/account` (or
    not-found until 013 builds it).
15. Largest text size, VoiceOver and TalkBack on screens 20–23: the six cells read as one field
    ("Six-digit code"), the error is announced, the countdown is readable, nothing is cut off.
16. Website (US5): `/login` with a number and code; `/login/email` as the seeded admin; log out and
    confirm the old `payload-token` value no longer works; add a number to an email account.

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Web paths are under `apps/web/`, Dart paths under
`apps/mobile/`.

| Id | Layer | Test file |
|----|-------|-----------|
| OT-US1-S1 a valid number by SMS sends a code; the code screen shows number, channel and countdown | integration, widget | `tests/integration/mobile-api-auth-otp.int.test.ts` `test/features/sign_in/presentation/pages/code_page_test.dart` |
| OT-US1-S2 the right code for a new number creates a client account, records acceptance and signs in | integration, cubit | `tests/integration/mobile-api-auth-otp.int.test.ts` `test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart` |
| OT-US1-S3 the right code for a known number signs in to the same account; the role choice is ignored | integration | `tests/integration/mobile-api-auth-otp.int.test.ts` |
| OT-US1-S4 a wrong code shows the error state of board 22 and Try again clears the cells | integration, widget | `tests/integration/mobile-api-auth-otp.int.test.ts` `test/features/sign_in/presentation/pages/code_page_test.dart` |
| OT-US1-S5 after 5 wrong attempts even the right code is refused | unit, integration | `packages/domain/src/auth/otp.test.ts` `tests/integration/mobile-api-auth-otp.int.test.ts` |
| OT-US1-S6 a code older than 5 minutes is refused as expired | unit, integration | `packages/domain/src/auth/otp.test.ts` `tests/integration/mobile-api-auth-otp.int.test.ts` |
| OT-US1-S7 no resend within 60 s; a new code makes the old one unusable | integration, unit | `tests/integration/mobile-api-auth-otp.int.test.ts` `test/features/sign_in/domain/resend_timer_test.dart` |
| OT-US1-S8 send it on WhatsApp sends a new code by the other channel | cubit | `test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart` |
| OT-US1-S9 a non-UAE or non-mobile number is refused and nothing is sent | unit, widget | `packages/domain/src/auth/otp.test.ts` `test/features/sign_in/presentation/pages/number_page_test.dart` |
| OT-US1-S10 the code cells offer one-time-code autofill and a pasted code fills all six | widget | `test/core/widgets/otp_code_input_test.dart` |
| OT-US1-S11 a known number signs straight in after its code with no role question; a new number then gets the role question with the code kept | integration, cubit, component | `tests/integration/mobile-api-auth-otp.int.test.ts` `test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart` `src/modules/auth/components/forms.test.tsx` |
| OT-US2-S1 answers for numbers with and without an account are identical | integration | `tests/integration/mobile-api-auth-protection.int.test.ts` |
| OT-US2-S2 per-number, per-address and per-install limits refuse with retryAfter | integration | `tests/integration/mobile-api-auth-protection.int.test.ts` |
| OT-US2-S3 the stored challenge holds only keyed fingerprints; the comparison is constant time | unit, integration | `src/modules/auth/otp/codes.test.ts` `tests/integration/mobile-api-auth-protection.int.test.ts` |
| OT-US2-S4 no phone number or code reaches the logs | integration, unit | `tests/integration/mobile-api-auth-protection.int.test.ts` `test/core/auth/auth_interceptor_test.dart` |
| OT-US2-S5 the console provider is refused in a production configuration | unit | `src/shared/lib/env.test.ts` |
| OT-US2-S6 an admin or editor number cannot sign in with a code | integration | `tests/integration/mobile-api-auth-protection.int.test.ts` |
| OT-US2-S7 password login by number is refused and never blocks code sign-in | integration | `tests/integration/users-identity.int.test.ts` |
| OT-US2-S8 only the member and admins can read the member's number | integration | `tests/integration/users-identity.int.test.ts` |
| OT-US2-S9 the sign-in number cannot be set or changed through any endpoint | integration | `tests/integration/users-identity.int.test.ts` |
| OT-US3-S1 a stored session survives a restart with no signed-out flash | cubit | `test/core/auth/session_cubit_test.dart` |
| OT-US3-S2 under 2 days left, the session is refreshed before the request | unit, integration | `test/core/auth/auth_interceptor_test.dart` `tests/integration/mobile-api-auth-session.int.test.ts` |
| OT-US3-S3 sign-out ends the server session; the old token gets 401 | integration, cubit | `tests/integration/mobile-api-auth-session.int.test.ts` `test/core/auth/session_cubit_test.dart` |
| OT-US3-S4 a 401 clears the session and sends account pages to sign-in | unit, widget | `test/core/auth/auth_interceptor_test.dart` `test/core/routing/auth_guard_test.dart` |
| OT-US3-S5 the first launch after install wipes the secure store | unit | `test/core/auth/session_store_test.dart` |
| OT-US3-S6 a signed-out account link goes to sign-in and returns afterwards | widget | `test/core/routing/auth_guard_test.dart` |
| OT-US3-S7 an external or unknown next target is ignored | unit | `test/core/auth/safe_next_test.dart` |
| OT-US3-S8 a minted token works like a password-login token and stops after logout | integration | `tests/integration/mobile-api-auth-session.int.test.ts` |
| OT-US4-S1 joining from the menu creates a creator account with three acceptances | integration, cubit | `tests/integration/mobile-api-auth-join.int.test.ts` `test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart` |
| OT-US4-S2 I'm a … on the code screen opens screen 23 with the code kept, no new code | cubit, widget | `test/features/sign_in/presentation/cubit/sign_in_flow_cubit_test.dart` `test/features/sign_in/presentation/pages/join_page_test.dart` |
| OT-US4-S3 the professions shown are the active personas plus Both or All | widget | `test/features/sign_in/presentation/pages/join_page_test.dart` |
| OT-US4-S4 sending without accepting the terms is refused | widget, integration | `test/features/sign_in/presentation/pages/join_page_test.dart` `tests/integration/mobile-api-auth-join.int.test.ts` |
| OT-US4-S5 a known number joining is signed in and its account is unchanged | integration | `tests/integration/mobile-api-auth-join.int.test.ts` |
| OT-US4-S6 a profession switched off before verify refuses without spending the code | integration | `tests/integration/mobile-api-auth-join.int.test.ts` |
| OT-US5-S1 the website signs in by code and sets the HTTP-only session cookie | integration, e2e | `tests/integration/auth-web.int.test.ts` `tests/e2e/ot-us5-web.spec.ts` |
| OT-US5-S2 the website has no email sign-in; editors sign in on /admin only | integration | `tests/integration/auth-web.int.test.ts` |
| OT-US5-S3 logging out on the website ends the session on the server | integration | `tests/integration/auth-web.int.test.ts` |
| OT-US5-S4 register offers Join as a creator by code and no email registration | e2e | `tests/e2e/ot-us5-web.spec.ts` |
| OT-US5-S5 an email member attaches a number by code and signs in with it | integration | `tests/integration/auth-web.int.test.ts` |
| OT-US5-S6 attaching a number used by another account is refused and nothing changes | integration | `tests/integration/auth-web.int.test.ts` |
