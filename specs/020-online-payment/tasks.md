# Tasks: Online payment for confirmed bookings (020)

Tests first in every phase. `[P]` = can run alongside the previous task (different files).

## Phase 1: Setup

- [x] T001 Env: `PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `apps/web/src/shared/lib/env.ts` with `paymentProviderOf`; tests in `env.test.ts` (PY-US3-S1); document in `apps/web/.env.example`.
- [x] T002 [P] Add `specs/020-online-payment/quickstart.md` to `pnpm check:scenarios` in the root `package.json`.

## Phase 2: Foundation (blocks every story)

- [x] T003 Domain tests then code: `packages/domain/src/payments/` (`onlinePaymentAllowed`, `paymentOutcome`, `filsToAed`) (PY-US1-S6, PY-US3-S3); `pay` allows `system` in `booking/states.ts`; `payment-attention` (admin) in `booking/notifications.ts`; their tests.
- [x] T004 v1 contract: `canPayOnline` on `bookingViewV1`, `checkoutV1`, endpoint `quotationPay`, examples (`booking-view-*.json` gain `canPayOnline`, new `checkout.json`), snapshot regenerated.
- [x] T005 Web module `modules/payments/`: provider types, `off`, `stripe` (create session, verify signature, parse event) with `stripe.test.ts` first (PY-US1-S2, PY-US3-S5); `getPaymentProvider`/`setPaymentProvider`.
- [x] T006 Collection `payment-sessions`; `payments` gains `providerRef`, `source`, method `card-online`; hooks honour `context.online`; register in `payload.config.ts`; migration `<ts>_online_payment` (tables, columns, enum values, admin template); regenerate `payload-types.ts`.

## Phase 3: US1 the client pays online on the website (P1)

- [x] T007 Integration tests `apps/web/tests/integration/online-payment.int.test.ts` for PY-US1-S1..S6, PY-US3-S1..S5 (fake provider; real signature for the webhook route).
- [x] T008 Command `startCheckout` (allowed check, reuse open session, create, store) and `recordOnlinePayment` (idempotent, outcome, attention notify).
- [x] T009 Webhook route `app/(payload)/api/webhooks/stripe/route.ts`.
- [x] T010 `views.ts` payment block says `online`; `payOnline` server action; `BookingStatus` Pay TopHit, secure line, pending line and `PaymentPending` refresher, cancelled note; `BookingStatus.test.tsx` first (PY-US1-S1, S4, PY-US3-S1); messages en/ar (`quote.pay`, `quote.paySecure`, `quote.paymentPending`, `quote.paymentCancelled`, `payment.errors.*`).

## Phase 4: US2 the client pays from the app (P2)

- [x] T011 Server: `canPayOnline` in `commands/quotation-view.ts`; handler `payQuotationV1` and its route file; covered in `online-payment.int.test.ts`.
- [x] T012 App tests first (`booking_view_cubit_test.dart`, `quick_match_pages_test.dart`), then `BookingView.canPayOnline`, `QuickMatchRepository.pay`, `BookingViewCubit.pay` + pending poll, the Pay TopHit and pending line, ARB en/ar (PY-US2-S1..S3, PY-US1-S4).

## Phase 4b: UI with impeccable (owner request, 2026-11-14)

Both run through `/impeccable` (context with the `quotation` surface brief, the craft floor, then one
batched visual check and one confirm round), in English and Arabic, light and dark.

- [x] T016 Website quotation page (`BookingStatus`, `PaymentPending`, the `quotation` surface): the
  confirmed state as one clear payment panel (amount, Pay as the Top Hit, the secure line with card,
  Apple Pay and Google Pay, what happens next), the "being confirmed" state, the cancelled note, the
  provider error, and the paid state; checked at 360, 768, 1024 and 1440 px; update
  `.impeccable/surfaces/quotation.md` and DESIGN.md if the panel adds a pattern.
- [x] T017 App booking screen (`features/quick_match/presentation/pages/booking_page.dart`): the same
  panel with the Pay TopHit, the secure line, the pending line with a quiet progress, the cancelled and
  error messages, following the canvas world and `flutter-mobile` rules; emulator check in en/ar,
  light/dark; goldens updated where the screen has them.

## Phase 5: US3 the team keeps control (P3)

- [x] T013 Hand-recorded payments still work and online-attention cases alert admins (in T007's suite); admin can see sessions read-only.

## Phase 6: Polish

- [x] T014 Typecheck, lint, all tests, `check:scenarios`; Flutter format, analyze, test.
- [x] T015 CLAUDE.md and `specs/ROADMAP.md`: feature 020 line; open items (owner: Stripe account and keys, webhook endpoint on Vercel, Apple Pay domain).

## Open (owner)

- [ ] T018 Stripe account (UAE business), test keys on Vercel (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`),
  the webhook endpoint `https://<site>/api/webhooks/stripe` with events `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.expired`; a real test-mode payment end to end.
- [ ] T019 Apple Pay: verify the site's domain in the Stripe dashboard; live keys only after the account is verified.
