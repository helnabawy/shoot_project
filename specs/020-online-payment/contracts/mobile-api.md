# Contract: mobile API additions (020)

Additive to `/api/mobile/v1` (snapshot `specs/contracts/mobile-api/v1.schema.json`).

## `bookingViewV1.canPayOnline: boolean` (new field)

True when the booking is `confirmed`, its total is above zero, the link is the current quotation and
online payment is switched on. The app shows "Pay {total}" when true, else today's WhatsApp action.

## `POST /api/mobile/v1/quotations/{ref}/{key}/pay` (`quotationPay`)

- auth `optional`, `no-store`; input `quotationAddressV1`.
- 200 `checkoutV1`: `{ "url": "https://checkout.stripe.com/c/pay/cs_test_…" }`.
- 404 `api.errors.notFound` (wrong link); 409 `booking.errors.not-allowed` (not confirmed, zero total,
  not the current quotation); 503 `payment.errors.unavailable` (switched off) and 503 `payment.errors.provider`
  (Stripe refused or unreachable).

# Contract: Stripe webhook

`POST /api/webhooks/stripe`, raw JSON, header `Stripe-Signature`. 400 bad or missing signature, 200
recorded or ignored (`{ "received": true }`), 500 when it could not be recorded (Stripe retries).
