# Quickstart & Validation: Quick Match Matching, Quotation and Booking

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/) | **Model**: [data-model.md](data-model.md)

## Prerequisites

Everything from features 001 and 002 (Node 24 via `nvm use`, pnpm, Docker,
`apps/web/.env`). `CRON_SECRET` (already documented) now also protects
`/api/cron/bookings`. No new variables.

## Setup and run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter web payload migrate        # includes the quick_match migration
pnpm --filter web seed                   # price rules, WELCOME20, Quick match settings and templates
SEED_DEMO_CREATORS=1 pnpm --filter web seed   # local/e2e only: demo creators to match
pnpm --filter web dev                    # http://localhost:3000
```

## Manual walk-through (ten minutes)

1. On `/`, build "a photographer for an event on <a date next week> for
   2 hours in Dubai, shot by anyone" and tap **See who's free**: step 2
   lists the demo photographers who serve Dubai, each under one header
   price (tier + Dubai travel fee) with the tier's deliverables.
2. As a demo provider (`/account/availability`) block that date: the
   creator disappears from step 2 on reload. Block it for all of them:
   step 2 offers up to three nearby dates and WhatsApp.
3. Choose a creator → step 3: enter a name and WhatsApp, open "Have a
   code?", enter `WELCOME20` → **Get my quotation**. The quotation page
   (`/q/Q-…/<key>`) shows the reference, lines, −20 %, total and "valid
   until". **Download PDF** opens the print dialog with a clean A4 layout
   (also at `/ar`, in dark theme: prints light).
4. Change the tier price in `/admin` → Prices: the issued quotation keeps
   its price. Tap **Accept** twice quickly: one booking, state "accepted".
5. As the creator, `/account/bookings` shows it pending with "respond by";
   **Confirm**: the client page now shows payment instructions and **Send
   receipt on WhatsApp**. In `/admin` → Bookings → Payments record a
   received bank transfer: state "paid".
6. Call the clock: `curl -H "Authorization: Bearer $CRON_SECRET"
   localhost:3000/api/cron/bookings` on/after the shoot date → "scheduled".
   As the creator **Mark delivered**; as the client **Confirm delivery** →
   "completed" with a payout due date 10 days later; record the payout.
7. In `/admin` → Bookings: filter by state, open one: assignments, payments,
   audit trail, notifications (with WhatsApp links). Reassign, adjust the
   price (new version Q-… v2), cancel; **Download CSV**.
8. Repeat 1–3 at `/ar`, in dark theme, at 360 px, and with JavaScript off.

## Automated validation (what CI runs)

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage                  # domain 100 %, app ≥ 80 %
pnpm check:scenarios                # 002 and 003 mapping tables
pnpm --filter web build
pnpm test:e2e -- --grep @smoke      # adds qm-us1…qm-us4 specs
npx @lhci/cli autorun               # adds step 2 and a quotation page on the demo seed
```

## Scenario → test mapping (Principle III)

Test names start with the id in the first column.

| Id | Layer | Test file |
|----|-------|-----------|
| QM-US1-S1 only free, matching creators with the price, < 2 s | unit, integration, e2e | `domain/booking/matching.test.ts`, `booking-match.int.test.ts`, `qm-us1-match.spec.ts` |
| QM-US1-S2 nobody free → nearby dates, "let us find one", WhatsApp | unit, component, e2e | `domain/booking/matching.test.ts`, `MatchResults.test.tsx`, `qm-us1-match.spec.ts` |
| QM-US1-S3 "any date" lists all matches; date asked in step 3 | unit, integration | `domain/booking/matching.test.ts`, `booking-quote.int.test.ts` |
| QM-US1-S4 one fixed price per brief; no rule → price on request | unit, component | `domain/pricing/quote.test.ts`, `MatchResults.test.tsx` |
| QM-US1-S5 "let us choose" continues without a creator | integration | `booking-quote.int.test.ts` |
| QM-US1-S6 blocked date or confirmed booking hides the creator | integration | `booking-match.int.test.ts` |
| QM-US2-S1 quotation with unique reference, page, print layout, notification | unit, integration, component, e2e | `domain/booking/reference.test.ts`, `booking-quote.int.test.ts`, `QuotationView.test.tsx`, `qm-us2-quote.spec.ts` |
| QM-US2-S2 valid promo applied and shown | unit, integration | `domain/pricing/promo.test.ts`, `booking-quote.int.test.ts` |
| QM-US2-S3 accept → accepted, both sides notified; double tap → one booking | integration, e2e | `booking-transitions.int.test.ts`, `qm-us2-quote.spec.ts` |
| QM-US2-S4 expired / unknown / used-up promo → not applied, message | unit, integration | `domain/pricing/promo.test.ts`, `booking-quote.int.test.ts` |
| QM-US2-S5 expired quotation cannot be accepted; fresh one from the brief | unit, integration | `domain/booking/states.test.ts`, `booking-transitions.int.test.ts` |
| QM-US2-S6 member pre-fill; quotation in the account | integration, e2e | `booking-quote.int.test.ts`, `qm-us2-quote.spec.ts` |
| QM-US3-S1 creator confirms → confirmed, date blocked, payment instructions | integration, e2e | `booking-transitions.int.test.ts`, `qm-us3-lifecycle.spec.ts` |
| QM-US3-S2 decline / window passes → assignment lapses, client picks another | unit, integration | `domain/booking/assignments.test.ts`, `booking-transitions.int.test.ts`, `booking-clock.int.test.ts` |
| QM-US3-S3 admin records payment → paid (held); shoot date → scheduled | integration | `booking-payments.int.test.ts`, `booking-clock.int.test.ts` |
| QM-US3-S4 delivered → client confirms → completed + payout due; problem → on hold | integration, e2e | `booking-transitions.int.test.ts`, `qm-us3-lifecycle.spec.ts` |
| QM-US3-S5 disallowed transitions refused, nothing changes | unit, integration | `domain/booking/states.test.ts`, `booking-transitions.int.test.ts` |
| QM-US4-S1 admin filters bookings, sees brief, creator, quotation, payments, audit | integration, e2e | `booking-admin.int.test.ts`, `qm-us4-admin.spec.ts` |
| QM-US4-S2 reassign, adjust (new version), cancel, record, resolve → audit + notification | integration | `booking-admin.int.test.ts` |
| QM-US4-S3 CSV export of filtered bookings | integration | `booking-admin.int.test.ts` |
| QM-US4-S4 nobody sees another person's bookings, quotations, payments | integration (REST + pages) | `booking-access.int.test.ts` |
| QM-FR-001 every artefact linked to the brief | integration | `booking-quote.int.test.ts` |
| QM-FR-002 provider blocks/unblocks own dates only | integration, component | `booking-availability.int.test.ts`, `CreatorBookingRow.test.tsx` |
| QM-FR-006 notification log per state change, channels and templates from settings, no duplicates | unit, integration | `domain/booking/notifications.test.ts`, `booking-notifications.int.test.ts` |
| QM-US2-S1 pages render each state's one action in both languages (step 2, step 3, quotation, account, availability) | integration (pages) | `booking-pages.int.test.ts` |
| QM-FR-008 en/ar, RTL, light/dark, 360–1440 px, no-JS, budgets | e2e (`ar-mobile`, `dark`, `nojs`), Lighthouse CI | all `qm-*.spec.ts`, `lighthouserc.json` |
| QM-FR-009 price rule exhaustive (tiers × travel × add-ons × promo, several types) | unit | `domain/pricing/quote.test.ts` |
| QM-FR-009 price collections: editor CRUD, public reads active only, promo codes private | integration | `pricing-access.int.test.ts` |
| QM-FR-010 quotation keeps its price after a rule change | integration | `booking-quote.int.test.ts` |
| QM-FR-011 private links: wrong key = 404, key never readable, member access | unit, integration | `modules/booking/keys.test.ts`, `booking-access.int.test.ts` |
| Edge: two clients, one creator and date → first confirmation wins | integration | `booking-transitions.int.test.ts` |
| Edge: creator unlisted after quotation → cannot accept, offered another | integration | `booking-transitions.int.test.ts` |
| Edge: several professional types → one booking, one assignment each | unit, integration | `domain/pricing/quote.test.ts`, `booking-quote.int.test.ts` |
| Edge: quotation never accepted → expired by the clock | integration | `booking-clock.int.test.ts` |
| Abuse: step 3 rate limit per visitor | integration | `booking-quote.int.test.ts` |
| Flow off: `quickMatch.enabled` false keeps 001's WhatsApp hand-off | integration | `booking-brief.int.test.ts` |

## Success criteria checks

- **SC-001** (brief → accepted quotation < 5 min): scripted Playwright path
  asserts ≤ 8 interactions; manual timing with three people recorded in
  `usability.md`.
- **SC-002** (95 % of quotations < 3 s): `booking-quote.int.test.ts`
  measures `requestQuotation` p95 over 40 runs on the seeded rules.
- **SC-003**: database invariant test in `booking-admin.int.test.ts` (no
  booking without brief + quotation; no confirmed booking with an open
  assignment).
- **SC-004**: this table; `pnpm check:scenarios` fails when a listed test
  file is missing or unnamed.
