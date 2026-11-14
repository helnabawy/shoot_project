# Data model: Online payment (020)

## payment-sessions (new collection)

| Field | Type | Notes |
|---|---|---|
| booking | relationship → bookings, required, index | |
| revision | number, required | booking revision when started |
| amountFils | number, required | the booking total when started |
| provider | select `stripe` | |
| providerSessionId | text, unique, required | Stripe `cs_…` |
| url | text, required | hosted checkout link |
| status | select `open` · `paid` · `expired`, default `open`, index | |
| expiresAt | date, required | |
| paymentRef | text | the PaymentIntent id once paid |

Access: read admin; create/update/delete nobody (server only, `overrideAccess`). Admin group Bookings,
read-only.

## payments (changed)

| Field | Change |
|---|---|
| method | adds option `card-online` |
| providerRef | new text, unique, index, read-only; Stripe PaymentIntent id (else session id) |
| source | new select `manual` (default) · `online`, read-only, server only |

Hooks: with `context.online` the before-change state rule is skipped and `recordedBy` is null; the
after-change applies `pay` as `system` (outcome `apply`) or records the `payment-attention` event and
notifies admins (outcome `attention`).

## Notifications / templates (changed enums)

`payment-attention` joins `NOTIFICATION_EVENTS` (audience: admin). The migration adds the enum values on
`notifications.event`, `site_settings_quick_match_templates.event` and `booking_events.event` where those
columns are enums, and inserts the admin template (en: "Online payment for {reference} needs a check:
{reason}. Refund or record it in Payments."; ar equivalent) where missing.

## State

The booking states are unchanged. `pay` (confirmed → paid) is allowed to `admin` and now `system`.
