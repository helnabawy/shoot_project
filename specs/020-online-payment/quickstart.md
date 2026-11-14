# Quickstart: Online payment (020)

Run against the **local** database only (`apps/web/.env` points at production): override
`DATABASE_URI` for every command, or run the Testcontainers suites.

## Prerequisites

```bash
nvm use
docker compose up -d postgres
pnpm db:migrate                         # applies <ts>_online_payment
# Stripe test mode: dashboard → Developers → API keys (sk_test_…)
STRIPE_SECRET_KEY=sk_test_… pnpm dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # prints whsec_… → STRIPE_WEBHOOK_SECRET
```

## Walkthrough

1. Make a booking reach **confirmed** (client accepts, creator confirms).
2. Open its quotation link: one primary action "Pay AED …"; no WhatsApp receipt action.
3. Pay with card `4242 4242 4242 4242`, any future date, any CVC. Back on the quotation it says the
   payment is being confirmed, then **Paid** within seconds; `/admin/collections/payments` has one row,
   method `card-online`, source `online`, the `pi_…` reference.
4. Cancel on the Stripe page instead: back on the quotation, still confirmed, Pay offered again.
5. Unset `STRIPE_SECRET_KEY`: the page shows "How to pay" and "Send receipt on WhatsApp" as before.
6. App (`--dart-define=API_BASE_URL=http://localhost:3000`): open the booking; Pay opens the browser;
   after paying and returning, the booking shows paid.

## Scenario → test mapping

| Id | Scenario | Tests |
|---|---|---|
| PY-US1-S1 | Confirmed + on: one Pay action with the total, no WhatsApp receipt | `BookingStatus.test.tsx`, `online-payment.int.test.ts` |
| PY-US1-S2 | Pay opens a checkout for the server-held total, reference and language | `stripe.test.ts`, `online-payment.int.test.ts` |
| PY-US1-S3 | A signed payment records one online payment and moves the booking to paid with notifications | `online-payment.int.test.ts` |
| PY-US1-S4 | Back before the confirmation: "being confirmed", then paid | `BookingStatus.test.tsx`, `booking_view_cubit_test.dart` |
| PY-US1-S5 | Cancelled or declined checkout leaves it confirmed; Pay again reuses the open session | `online-payment.int.test.ts` |
| PY-US1-S6 | Not confirmed (or zero total): no Pay and starting is refused | `domain/payments/rules.test.ts`, `online-payment.int.test.ts` |
| PY-US2-S1 | The app shows Pay for a confirmed booking | `booking_view_cubit_test.dart`, `quick_match_pages_test.dart` |
| PY-US2-S2 | The app opens the checkout and reloads on return | `booking_view_cubit_test.dart` |
| PY-US2-S3 | Cancelled in the app: still confirmed, Pay again | `booking_view_cubit_test.dart` |
| PY-US3-S1 | Switched off: today's WhatsApp flow, starting refused | `BookingStatus.test.tsx`, `online-payment.int.test.ts`, `env.test.ts` |
| PY-US3-S2 | A hand-recorded payment still works | `online-payment.int.test.ts` |
| PY-US3-S3 | Unexpected payment (wrong state, amount): recorded, booking unchanged, admin alerted | `domain/payments/rules.test.ts`, `online-payment.int.test.ts` |
| PY-US3-S4 | Repeated confirmation: one payment, one set of notifications | `online-payment.int.test.ts` |
| PY-US3-S5 | Unsigned or badly signed notice is refused | `stripe.test.ts`, `online-payment.int.test.ts` |

Test locations: domain `packages/domain/src/payments/payments.test.ts`; web
`apps/web/src/modules/payments/providers/stripe.test.ts`, `apps/web/tests/integration/online-payment.int.test.ts`,
`apps/web/src/modules/booking/components/BookingStatus.test.tsx`, `apps/web/src/shared/lib/env.test.ts`;
app `apps/mobile/test/features/quick_match/`.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm check:scenarios
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test
```
