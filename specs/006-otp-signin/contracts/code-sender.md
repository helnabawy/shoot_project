# Contract: `CodeSender` (code delivery seam)

The one place the application touches a messaging vendor (research §5).
Everything else (codes, limits, screens) is vendor-agnostic. Implementations
live in `apps/web/src/modules/auth/otp/senders/`.

## Interface

```ts
export type Channel = 'sms' | 'whatsapp'

export interface SendCodeInput {
  to: string            // E.164
  channel: Channel
  code: string          // six digits, only ever passed here and to the person
  locale: 'en' | 'ar'
  minutes: number       // code lifetime, for the message text
  brand: string         // site name from settings
  template: string      // rendered SMS body (placeholders already filled); ignored for WhatsApp
  whatsappTemplateRef?: string // approved authentication template id for `locale`
}

export type SendResult =
  | { ok: true; providerRef: string | null }
  | { ok: false; reason: 'unavailable' | 'rejected' | 'channel-unsupported' | 'config' }

export interface CodeSender {
  readonly name: 'twilio' | 'log'
  readonly channels: readonly Channel[]   // which channels this configuration can send on
  send(input: SendCodeInput): Promise<SendResult>
  sendText(input: { to: string; locale: 'en' | 'ar'; body: string }): Promise<SendResult> // "number changed" notice (SMS)
}
```

Rules every implementation keeps:

- Never log `code`, never log `to`; log the provider reference and the
  reason only.
- Resolve within 10 s; a timeout is `{ ok: false, reason: 'unavailable' }`.
- `channels` excludes `whatsapp` when the configuration cannot send it; the
  UI hides "Prefer WhatsApp?" in that case (FR-017 still holds when both are
  configured).

## Selection and configuration (`env.ts`)

| Variable | `twilio` | `log` | Notes |
|---|---|---|---|
| `OTP_SENDER` | `twilio` | `log` | required; `log` is refused unless `NEXT_PUBLIC_SITE_URL` is `localhost`, `127.0.0.1`, `*.localhost` or `*.test` (the `SEED_DEMO_*` rule) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | required | — | HTTP basic auth |
| `TWILIO_SMS_FROM` | required | — | a UAE-registered alphanumeric sender id, a number, or `MG…` Messaging Service SID |
| `TWILIO_WHATSAPP_FROM` | optional | — | `whatsapp:+…` sender; empty → WhatsApp channel unavailable |
| `OTP_OUTBOX_FILE` | — | optional | default `<repo>/.otp-outbox.jsonl`; tests read it |

All or none of the Twilio variables (validated like the S3 group).

## `twilio`

- Endpoint: `POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`,
  `application/x-www-form-urlencoded`, via `fetch` (no SDK).
- SMS: `To`, `From` (or `MessagingServiceSid`), `Body = template`.
- WhatsApp: `To = whatsapp:{to}`, `From = TWILIO_WHATSAPP_FROM`,
  `ContentSid = whatsappTemplateRef`, `ContentVariables = {"1": code}`; the
  approved authentication template carries the copy-code button.
- 201 → `{ ok: true, providerRef: body.sid }`; 400/404 → `rejected`;
  401/403 → `config`; 429/5xx/network → `unavailable`.
- Never retried by the app (a retry is a resend the person asks for and
  counts against limits).

## `log`

- Appends one JSON line `{ at, to, channel, code, locale }` to
  `OTP_OUTBOX_FILE` and logs `otp sent (log sender) ref=<line no>` at debug
  level. The outbox file is git-ignored.
- Deterministic failures for tests (the UAE prefix rule is never relaxed;
  these numbers are valid in form and reserved for tests): `+971 50 999
  0001` → `unavailable`, `+971 50 999 0002` → `rejected`, `+971 50 999
  0003` → `channel-unsupported` on WhatsApp only. Documented in
  `quickstart.md`.

## Message templates (CMS, `site-settings.signIn`)

Placeholders: `{brand}`, `{code}`, `{minutes}`. Rendering is a pure
function (`renderTemplate` in the domain package, shared with feature 003's
notification templates). The SMS body is sent as written; a template
missing `{code}` fails validation on save.
