# Contract: message provider

How a code reaches a phone. The provider only **delivers**: the code is generated, fingerprinted and
checked by `modules/auth/otp/` (research R4–R6). Everything here lives in
`apps/web/src/modules/auth/otp/providers/`.

## Interface (`types.ts`)

```ts
export type OtpChannel = 'sms' | 'whatsapp'   // re-exported from @shoot/domain/auth

export interface OtpMessage {
  challengeId: string        // the public uuid, for correlation (not personal data)
  channel: OtpChannel
  to: string                 // E.164, +9715XXXXXXXX
  code: string               // six digits
  locale: 'en' | 'ar'
  text: string               // the SMS body, already rendered (see "Message text"); unused for WhatsApp
}

export type SendResult =
  | { ok: true; ref: string | null }                                 // provider message id
  | { ok: false; reason: 'unreachable' | 'rejected' | 'unavailable' } // never the provider's own text

export interface OtpProvider {
  readonly name: 'console' | 'unifonic'
  send(message: OtpMessage, options: { signal: AbortSignal }): Promise<SendResult>
}
```

Rules for every implementation:
- `send` resolves; it never throws for a delivery failure. Timeouts (5 s, from the caller's
  `AbortSignal`) resolve `{ ok: false, reason: 'unavailable' }`.
- It never logs `to`, `code` or `text`, and never puts them in an error message. A failure may log
  the provider name, the reason, the HTTP status and `challengeId`.
- It sends nothing but the number and the message: no name, no account data.
- `reason` mapping: `unreachable` (the number cannot receive on this channel, for example not on
  WhatsApp), `rejected` (the provider refused the request: sender ID, template, credentials),
  `unavailable` (network, timeout, 5xx). All three become the same `auth.errors.sendFailed` answer;
  the reason goes to the log for the owner.

## Selection (`index.ts`)

`getOtpProvider(env)` returns:
- `console` when `OTP_PROVIDER` is unset or `console` (allowed only outside production, see env);
- `unifonic` when `OTP_PROVIDER=unifonic`.

Tests inject a provider directly into the command's context; they never read the environment.

## Console provider (`console.ts`)

For development, CI and end-to-end tests.

- Writes one file per challenge: `apps/web/.otp-outbox/<challengeId>.json` (directory created on
  demand, `.otp-outbox/` in `apps/web/.gitignore`):

  ```json
  { "challengeId": "0f6f…", "channel": "sms", "to": "+971501234567", "code": "482713",
    "locale": "en", "text": "Your Shoot code is 482713. …", "sentAt": "2026-12-14T06:00:00.000Z" }
  ```

- Returns `{ ok: true, ref: null }`.
- Simulated failures for tests: a number ending `0000000` resolves `unreachable` on `whatsapp`; a
  number ending `9999999` resolves `unavailable` on both channels. These are documented test
  numbers, never real ones.
- `pnpm --filter web otp:last` (`scripts/otp-last.mjs`) prints the newest file's code and channel,
  with the number masked to its last 4 digits. It refuses to run when `NODE_ENV=production`.
- Playwright reads `apps/web/.otp-outbox/<challengeId>.json` after `otp/request` (helper
  `readOutboxCode(challengeId)` in `tests/e2e/helpers.ts`).
- The console provider is a delivery channel, not a log: the server logger never receives the code
  (FR-032).

## Vendor provider (`unifonic.ts`), pending owner approval (research R10)

- `fetch` to the vendor's REST API with a bearer or app-id credential from the environment; JSON
  bodies; no SDK package.
- **SMS**: sender ID `OTP_SMS_SENDER_ID` (the registered alphanumeric name), body `text`, recipient
  `to` without `+` if the API requires it.
- **WhatsApp**: the approved authentication template `OTP_WHATSAPP_TEMPLATE` in the message's
  language (`en` or `ar`), the code as its single body parameter and as the copy-code button
  parameter.
- Maps vendor statuses to `SendResult.reason` as above; the exact status table is written from the
  vendor's documentation when the adapter is built, and covered by recorded-response unit tests
  (no network in tests).
- Delivery reports (webhooks) are out of scope; SC-002 is measured from the vendor's dashboard.
- Replacing the vendor means one new file here plus env names; nothing else changes.

## Environment (`apps/web/src/shared/lib/env.ts`, `.env.example`)

| Variable | Rule |
|---|---|
| `OTP_PROVIDER` | `console` \| `unifonic`. Optional outside production (default `console`). |
| `OTP_HMAC_SECRET` | Required, at least 32 characters (`openssl rand -hex 32`). Keys code and phone fingerprints. |
| `UNIFONIC_APP_SID` | Required when `OTP_PROVIDER=unifonic`. |
| `OTP_SMS_SENDER_ID` | Required when `OTP_PROVIDER=unifonic`; the registered sender name. |
| `OTP_WHATSAPP_SENDER` | Required when `OTP_PROVIDER=unifonic`; the WhatsApp business number. |
| `OTP_WHATSAPP_TEMPLATE` | Required when `OTP_PROVIDER=unifonic`; the approved template name. |

Production guard (`superRefine`, same shape as the `E2E_CLOCK` rule): when `NODE_ENV === 'production'`
and `NEXT_PUBLIC_SITE_URL` is not `http(s)://localhost` or `127.0.0.1`:
- `OTP_PROVIDER` must be set and must not be `console`, with the message
  `OTP_PROVIDER: the console provider is for local development and tests only; set a real provider in production`;
- when the vendor is chosen, all four vendor variables must be set together (listing the missing
  ones, like the S3 group).

Tested by `OT-US2-S5` in `env.test.ts`.

## Message text

- SMS, from `apps/web/messages/{en,ar}.json` `auth.otp.sms` with `{code}`, `{minutes}` and
  `{domain}`:

  ```text
  Your Shoot code is 482713. It expires in 5 minutes. Don't share it.

  @shoot.ae #482713
  ```

  The last line is the origin-bound one-time-code format: iOS and Safari offer the code only to the
  named domain and to the app that has it in its associated domains (008's
  `apple-app-site-association`). `{domain}` is the host of `NEXT_PUBLIC_SITE_URL`. The Arabic text
  keeps the last line exactly as is (Latin, left to right).
- WhatsApp: Meta's authentication template wording, in `en` or `ar`; nothing of ours but the code.
- The brand name in the SMS comes from the same message files as the site's interface strings; if
  the brand name changes, the sender ID registration changes with it.

## Tests

| Test | What |
|---|---|
| `src/modules/auth/otp/providers/console.test.ts` | writes the file; simulated failures; never calls the logger with the code |
| `src/modules/auth/otp/providers/unifonic.test.ts` | builds SMS and WhatsApp requests from recorded examples; maps statuses to reasons; timeout → `unavailable`; no personal data in thrown or logged text |
| `src/shared/lib/env.test.ts` | `OT-US2-S5`: production with `console` (or unset) is refused; vendor group all-or-none |
| `tests/integration/mobile-api-auth-otp.int.test.ts` | uses an in-memory provider that records messages, injected into the context |
