# Implementation Plan: Online payment for confirmed bookings

**Branch**: `020-online-payment` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: `specs/020-online-payment/spec.md` (owner chose Stripe; "implement the spec", 2026-11-14).

## Summary

A confirmed booking gets one primary action, "Pay AED {total}", on the website's quotation page and in
the app's booking screen. It opens a Stripe Checkout page for the booking's total in AED. Stripe's signed
notification (webhook), never the browser, records exactly one "Received from client" payment, and the
existing `pay` transition makes the booking paid and sends the existing "paid" notifications. A payment
the booking no longer expects (cancelled, already paid, different amount) is still recorded, as held
money for a refund, and the team gets an in-app alert. With the provider off (no keys) everything is as
today: the "How to pay" text and "Send receipt on WhatsApp".

- **Domain** (`packages/domain/src/payments/`): `onlinePaymentAllowed(state, totalFils)`,
  `paymentOutcome(...)` (apply, or attention with a reason), `filsToAed`; the `pay` transition gains the
  `system` actor; the notification event `payment-attention` (admin only); v1 zod shapes: `checkoutV1`,
  `bookingViewV1.canPayOnline`, the endpoint `quotationPay`.
- **Web**: new module `modules/payments/` (collection `payment-sessions`, provider interface with `stripe`
  and `off` providers and a test override in `shared/payments/`, commands `startCheckout` and `recordOnlinePayment`, the
  webhook route `/api/webhooks/stripe`, the mobile handler `payQuotationV1`). Changes in `booking`
  (`payments` gains `providerRef`, `source` and method `card-online`; the payment hooks honour an online
  context; `views.ts` and `quotation-view.ts` say whether online payment is on; `BookingStatus` shows Pay
  and the pending line; a `payOnline` server action), env (`PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`), messages (en, ar), one migration.
- **App** (`features/quick_match/`): `BookingView.canPayOnline`, `QuickMatchRepository.pay`,
  `BookingViewCubit.pay` (opens the checkout in the browser, then reloads and briefly polls on return),
  the Pay TopHit and the "being confirmed" line; ARB strings.

## Technical Context

**Language/Version**: TypeScript strict on Node 24; Dart 3.13.7 / Flutter 3.47.9.

**Primary Dependencies**: existing Payload 3.93, Next 16, next-intl, zod, `defineHandler`,
`applyTransition`, `notify`, `getQuotationAccess`, `accessKey`, `quotePath`. **No new package**: Stripe's
REST API through `fetch` (form-encoded `POST /v1/checkout/sessions`) and the webhook signature checked
with `node:crypto` HMAC-SHA256, the same approach as FCM in 019 (research R1).

**Storage**: PostgreSQL via Payload: new `payment_sessions` table; `payments` gains `provider_ref`
(unique) and `source`; enum values `card-online` (payment method) and `payment-attention`
(notification and template events); the admin template for `payment-attention` (en, ar) inserted by
the migration where missing. One committed migration.

**Testing**: Vitest unit (domain 100 %, the Stripe provider with a fake `fetch`, signature checks),
integration on Testcontainers PostgreSQL (start checkout, reuse, refusals, webhook apply, repeats,
attention, bad signature, provider off, the mobile endpoint and `canPayOnline`), component test for
`BookingStatus` (Pay vs WhatsApp, pending line); Flutter model, cubit and widget tests. The quickstart
mapping table is added to `pnpm check:scenarios`.

**Target Platform**: web (Vercel); iOS and Android app.

**Project Type**: modular-monolith web app + Flutter app.

**Performance Goals**: starting a payment answers in < 2 s p95 excluding Stripe's own latency (one
session lookup, at most one Stripe call); the webhook records a payment within 1 minute of Stripe
sending it (SC-002), answering Stripe in < 5 s.

**Constraints**: the amount comes only from the booking on the server (FR-003); no card data touches the
system (FR-002); keys only in server env (FR-017); v1 API changes additive only; copy in message files
and ARB (no audience names); EN/AR, RTL, light/dark; Principle IX: one primary action per screen.

**Scale/Scope**: tens of payments a day; one checkout session per booking attempt.

## Constitution Check

| Principle | How this plan complies |
|---|---|
| I Spec-driven | spec → plan → tasks → analyze before code. |
| II Performance | No new client JS on the quotation page beyond a tiny polling island shown only after return. |
| III Test-first | Every scenario `PY-…` maps to a test (quickstart table), written before the code. |
| IV Content in CMS | Button and status lines are UI strings (messages/ARB); the "How to pay" text stays CMS content for the off mode; the admin alert wording is a CMS template. |
| V Modular monolith | New `modules/payments/`; booking reaches it only through `index.ts`. |
| VI Bilingual, themed | en/ar strings, logical CSS, tokens; Stripe page `locale` follows the client's language where Stripe supports it. |
| VII Secure by default | Webhook signature + timestamp tolerance; amount from the server; explicit access on the new collection (admin read, nobody writes through the API); keys only in env. |
| VIII Simplicity | No SDK; one provider switch like `PUSH_PROVIDER`; refunds and payouts stay manual. |
| IX Designed | One primary action (Pay) on a confirmed booking; WhatsApp stays a secondary row only when online payment is off. |

Result: PASS. No amendment needed.

## Project Structure

```text
packages/domain/src/
  payments/index.ts, payments.test.ts            # outcome rules, allowed check
  booking/states.ts (+test)                      # pay: actors admin, system
  booking/notifications.ts (+test)               # payment-attention → admin
  api/v1/booking.ts, endpoints.ts, examples/     # canPayOnline, quotationPay, checkoutV1
apps/web/src/
  modules/payments/
    index.ts
    collections/PaymentSessions.ts
    commands/{start-checkout,record-payment}.ts
    actions.ts                                   # payOnline (server action)
    api.ts                                       # payQuotationV1
  shared/payments/{types,stripe,index}.ts (+ stripe.test.ts)   # providers: no booking import, so views can ask
  app/(payload)/api/webhooks/stripe/route.ts
  app/(payload)/api/mobile/v1/quotations/[ref]/[key]/pay/route.ts
  modules/booking/{collections/Payments.ts,hooks.ts,views.ts,commands/quotation-view.ts}
  modules/booking/components/{BookingStatus.tsx,PaymentPending.tsx} (+ test)
  shared/lib/env.ts (+test); migrations/<ts>_online_payment.ts
apps/web/tests/integration/online-payment.int.test.ts
apps/mobile/lib/features/quick_match/...         # model, repository, cubit, page
apps/mobile/test/features/quick_match/...
```

## Complexity Tracking

| Addition | Why | Simpler alternative rejected because |
|---|---|---|
| `payment-sessions` collection | Reuse an open checkout, match a webhook to its booking, show attempts to admins | Stripe metadata alone cannot stop a new session per click, and leaves no local trace |
| Provider interface (`stripe`, `off`) | Test without Stripe, switch off by env | Calling Stripe inline would make every test hit the network |
