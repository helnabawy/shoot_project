# Research: Online payment (020)

## R1 Stripe without an SDK

**Decision**: call Stripe's REST API with `fetch`: `POST https://api.stripe.com/v1/checkout/sessions`,
`application/x-www-form-urlencoded`, `Authorization: Bearer <STRIPE_SECRET_KEY>`, an `Idempotency-Key`
per booking revision and attempt. Verify webhooks with `node:crypto`.

**Why**: the constitution asks for no new package without need; Checkout needs one call and the
webhook one HMAC. 019 did the same for FCM.

**Alternatives**: `stripe` npm package (adds a dependency and its types for two calls); Payment Element
(card fields in our page, more PCI scope and client JS).

## R2 The checkout session

Fields: `mode=payment`; one line item `price_data[currency]=aed`, `unit_amount=<totalFils>` (AED has two
decimals, so fils are Stripe's minor unit), `product_data[name]=Booking <reference>`, `quantity=1`;
`client_reference_id=<booking id>`; `metadata[booking]`, `metadata[revision]`, `metadata[reference]`
(also on `payment_intent_data[metadata]`); `success_url=<quotation>?payment=done`,
`cancel_url=<quotation>?payment=cancelled`; `locale=en` for English, `auto` for Arabic (Stripe picks the
browser's language; Arabic support is Stripe's to give); `expires_at=now+60 min`. No
`payment_method_types`: Stripe shows the methods enabled in the dashboard (cards, Apple Pay, Google Pay).

## R3 Webhook

Route `POST /api/webhooks/stripe` (raw body). Header `Stripe-Signature: t=<unix>,v1=<hex>[,v1=…]`;
expected `HMAC_SHA256(STRIPE_WEBHOOK_SECRET, "<t>.<raw body>")`, compared timing-safe against every
`v1`; refuse when the timestamp is more than 300 s away. Events handled:
`checkout.session.completed` with `payment_status=paid`, `checkout.session.async_payment_succeeded`
(record), `checkout.session.expired` (mark the session expired). Anything else: 200, ignored. Answer
400 on a bad signature, 200 once recorded or ignored, 500 on a database error (Stripe retries).

## R4 Exactly once

`payments.provider_ref` is unique (the PaymentIntent id, else the session id). Recording looks it up
first; a concurrent duplicate fails the unique index and is treated as already recorded. The session row
goes to `paid` in the same request.

## R5 Recording and the booking

The payment is created with Payload's Local API and `context.online = { outcome }`. The before-change
hook skips its state rule for online payments (money that arrived must be recorded); the after-change
hook applies `pay` with actor `system` when the outcome is `apply`, else records a `payment-attention`
booking event and notifies admins. Domain rule `paymentOutcome`: `apply` only when the booking is
`confirmed`, the currency is AED and the amount equals the booking's current total; otherwise
`attention` with `state`, `amount` or `currency` as the reason.

## R6 Where the client comes back

Web: the same quotation path the action was sent from (`/q/{ref}/{key}` or the member's booking), with
`?payment=done` or `?payment=cancelled`. App: the quotation link built from the booking's salt
(`accessKey(salt, 'booking')`), which the app's links open in the app; the app also reloads whenever it
comes back to the foreground (012).

## R7 "Being confirmed"

Web: when `payment=done` and the booking is still confirmed, the status shows "Payment received, we're
confirming it…" and a small client island calls `router.refresh()` every 3 s for up to 60 s. App: after
opening the checkout the cubit remembers it; on resume it reloads and, while still confirmed, polls every
3 s up to 20 times and shows the same line.

## R8 Switch

`PAYMENT_PROVIDER = stripe | off`. Unset: `stripe` when `STRIPE_SECRET_KEY` is set, else `off`. `stripe`
requires `STRIPE_SECRET_KEY` (`sk_test_…` or `sk_live_…`) and `STRIPE_WEBHOOK_SECRET` (`whsec_…`), checked
at start-up. Tests swap the provider with `setPaymentProvider`.

## R9 Reusing a session

Before creating one, look for an `open` session of the same booking, revision and amount whose
`expiresAt` is more than 5 minutes away; return its URL. Otherwise create a new one.
