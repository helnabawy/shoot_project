# Implementation Plan: Quick Match Matching, Quotation and Booking

**Branch**: `003-quick-match-booking` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-quick-match-booking/spec.md`

**Test-id prefix**: `QM-` (e.g. `QM-FR-009`, `QM-US2-S3`), so ids stay
unambiguous next to 001's `FR-…` and 002's `CP-…`.

## Summary

Turn a saved brief into a confirmed, paid and delivered booking. After the
brief (001), the visitor lands on step 2 "Your creator": verified creators
(002) who offer the type, serve the emirate, are free that day and satisfy
CMS-defined filtering slots, all under **one fixed price** computed from
content-managed price rules (tiers, travel fees, add-ons, promo codes —
the core feature 004 builds on). Step 3 "Your details" (name, WhatsApp)
issues a quotation with a unique reference, frozen price lines and a print
layout for Save as PDF, reachable by a private link. Accepting it starts a
booking whose explicit state machine runs creator confirmation, a manual
payment record (receipt to WhatsApp, admin records held → released or
refunded), shoot day, delivery and completion, with an audit trail and a
notification log (sending is feature 008). Admins oversee everything in
Payload and export CSV.

Technical approach: **two new modules** (`modules/pricing`,
`modules/booking`), two domain folders (`packages/domain/src/pricing`,
`packages/domain/src/booking`) holding every rule (price, promo, matching,
nearby dates, transitions, deadlines, notification audiences, templates,
references) as pure functions at 100% coverage. **No new package.** One
additive migration.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (unchanged)

**Primary Dependencies**: unchanged (Next.js 16.4.3, React 19.2.6, Payload 3.93.0, next-intl 4.14.9, next-themes, Tailwind 4.3.5, zod 4.6.7). **No new package**: the PDF is the browser's Save as PDF from a print stylesheet (research §9); keys and hashes use Web Crypto / `node:crypto`; money formatting uses `Intl.NumberFormat`.

**Storage**: PostgreSQL 17 via the Payload adapter. One additive migration (`quick_match`): `service_tiers`, `travel_fees`, `add_ons`, `promo_codes`, `availability_blocks` (unique creator+date), `bookings` (+ assignments), `quotations` (+ lines), `payments`, `booking_events`, `notifications` (unique dedupe key); columns on `briefs`, `option_sets_options`, `landing_page_brief_builder_slots`, `creator_listings`, `site_settings`. No data loss, no backfill.

**Testing**: Vitest (domain unit at 100%, component, integration on Testcontainers PostgreSQL), Playwright (+ axe, `ar-mobile`, `dark`, `nojs` projects), Lighthouse CI for step 2 and a quotation page.

**Target Platform**: unchanged.

**Project Type**: Web application in the existing pnpm monorepo.

**Performance Goals**: step 2 in < 2 s end to end (US1-S1), server time < 500 ms with 500 creators; quotation generated < 3 s at p95 (SC-002); page budgets as the landing page (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms); new client JS ≤ 2 KB (print button, confirmation disclosure).

**Constraints**: works without JavaScript; en/ar, RTL logical CSS, light/dark; WCAG 2.1 AA; private pages `noindex`, `no-referrer`; no PII in logs; no profession or attribute value named in code; prices integer fils, AED, VAT-inclusive; deterministic time (all rules take `now`, Asia/Dubai days).

**Scale/Scope**: hundreds of creators, tens of bookings a day. 10 new collections, 1 settings tab, 4 schema edits, 5 new routes × 2 locales, 2 route handlers, 10 server actions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec clarified (session 2026-11-07, 7 answers); spec amended before design for one booking with assignments (edge case, US3-S2, SC-003); no `NEEDS CLARIFICATION` | PASS — research §1–§17 |
| II. Performance budgets | Server pages; cached creator summaries and `pricing` tag; one indexed blocks query; no PDF library; ≤ 2 KB new client JS; Lighthouse CI adds step 2 and a quotation | PASS by design |
| III. Test-first | Every scenario mapped in `quickstart.md` with `QM-` ids; domain at 100%; `check:scenarios` generalised to the 003 table | PASS by design |
| IV. Content in CMS | Prices, fees, add-ons, promos, windows, payment instructions, quotation terms, notification templates, channels, filtering slots and match values are CMS data; the flow switch is a setting; seed is not a fallback | PASS — data-model |
| V. Modular monolith | `pricing` and `booking` modules; booking uses `creators`, `brief`, `pricing`, `site-settings` only via their `index.ts`; brief gets one seam (`matchUrl`) | PASS — structure below |
| VI. Responsive, accessible, bilingual, themed | Verified 360/768/1024/1440 × en/ar × light/dark; print layout in both languages; logical CSS | PASS by design |
| VII. Secure by default | Explicit access on 10 collections (contracts/rest-api.md); HMAC private links from hidden salts; state/money fields writable only through server transitions; providers never see client phone numbers; rate-limited quote requests and promo checks; editors cannot see bookings or payments | PASS |
| VIII. Simplicity | No new package or service; pure transition table instead of a workflow engine; cron route instead of a job queue; browser PDF instead of a renderer | PASS — Complexity Tracking |
| IX. Designed, not generated | Steps reuse The Brief Bar result rows; one primary action per screen; WhatsApp always secondary; no invented proof (no ratings, counts only when real); surface briefs, craft floor, detector, finish review and DESIGN.md tasks | PASS by design |

**Post-Phase-1 re-check (2026-11-07)**: the data model adds collections but
no service or package; the only raw SQL (the booking row lock, research §8)
goes through the adapter's own Drizzle session inside a Payload transaction. All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/003-quick-match-booking/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1: walk-through + scenario → test map
├── contracts/
│   ├── routes-and-actions.md
│   └── rest-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/pricing/        # 100 % covered
├── money.ts          # fils helpers, formatMoney(fils, locale)
├── promo.ts          # normalisePromoCode, validatePromo, applyPromo
├── quote.ts          # quotePrice(rules, input) → lines/subtotal/discount/total | reason
├── types.ts
└── index.ts
packages/domain/src/booking/        # 100 % covered
├── states.ts         # BookingState, events, transition(), allowedEvents()
├── assignments.ts    # assignment status rules, allConfirmed, respondBy
├── matching.ts       # matchCreators(), nearbyDates()
├── dates.ts          # dubaiToday(now), addDays, isoDay
├── reference.ts      # generateQuoteReference, isQuoteReference
├── notifications.ts  # notificationsFor(event), renderTemplate(), dedupeKey()
├── payments.ts       # heldAmount(payments)
├── picks.ts          # parse/format ?pick=persona:code,…
├── schemas.ts        # zod: details form, respond, report
└── index.ts

apps/web/src/
├── app/(site)/[locale]/
│   ├── match/[ref]/[key]/page.tsx            # step 2
│   ├── match/[ref]/[key]/details/page.tsx    # step 3
│   ├── q/[ref]/[key]/page.tsx                # quotation + booking status (print layout)
│   ├── account/bookings/page.tsx             # seeker + provider bookings, in-app notifications
│   └── account/availability/page.tsx         # provider blocked dates
├── app/(payload)/api/cron/bookings/route.ts  # runBookingClock
├── modules/pricing/
│   ├── collections/{ServiceTiers,TravelFees,AddOns,PromoCodes}.ts
│   ├── queries.ts    # getPriceRules() cached by tag `pricing`; findPromo(code)
│   └── index.ts
├── modules/booking/
│   ├── collections/{AvailabilityBlocks,Bookings,Quotations,Payments,BookingEvents,Notifications}.ts
│   ├── keys.ts         # newSalt(), accessKey(), keyMatches()
│   ├── transitions.ts  # applyTransition(): row lock + domain table + audit + notifications
│   ├── notify.ts       # writes notification rows from settings channels/templates
│   ├── quote.ts        # issueQuotation(): rules → frozen lines, versioning
│   ├── match.ts        # getMatchPage(): brief + creators + blocks + price
│   ├── clock.ts        # runBookingClock(payload, now)
│   ├── queries.ts      # getBriefByKey, getQuotationByKey, getMyBookings, getCreatorBookings, getMyBlocks
│   ├── actions.ts      # server actions (contracts)
│   ├── export.ts       # CSV endpoint
│   ├── hooks.ts        # admin edits → transitions, price adjustment, payment side effects
│   ├── components/{MatchResults,CreatorPickRow,NoMatch,DetailsForm,QuotationView,PriceLines,
│   │               BookingStatus,PrintButton,CreatorBookingRow,AvailabilityList,NotificationList}.tsx
│   └── index.ts
├── modules/brief/ (edit)          # access key on briefs; submitBrief → matchUrl when enabled
├── modules/brief/collections/OptionSets.ts (edit)  # matchesAny, category
├── modules/landing/globals/LandingPage.ts (edit)    # slot filtersCreators
├── modules/creators/collections/CreatorListings.ts (edit)  # matchValues
├── modules/site-settings/globals/SiteSettings.ts (edit)    # Quick match tab
├── shared/payload/seed/ (edit)    # price rules, WELCOME20, quick match settings + templates
├── migrations/<ts>_quick_match.{ts,json}
└── payload.config.ts (edit)

apps/web/messages/{en,ar}.json     # match.*, quote.*, booking.*, availability.*
apps/web/tests/{integration,e2e,fixtures}   # booking-*.int.test.ts, pricing-*.int.test.ts, qm-us1…us4 specs
scripts/check-scenario-tests.mjs (edit)     # any `XX-` prefix, all feature tables
.impeccable/surfaces/              # match, quotation, creator-bookings briefs
```

**Structure Decision**: two modules because pricing is shared with 004
(pages, corporate, deals) and must not depend on bookings; booking depends
on pricing, creators, brief and site-settings through their `index.ts`.
Existing modules change only at the seams listed above.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| 10 collections (4 pricing, 6 booking) | Each is a distinct entity in the spec with its own access rule (Principle VII): public price rules vs private promo codes; client-readable bookings vs admin-only payments and audit | Arrays inside `bookings` for payments/events/notifications: no per-row access, concurrent appends overwrite each other, no unique dedupe key |
| Row lock for transitions (research §8) | Double tap and concurrent confirm must not apply a transition twice | An optimistic revision claim left a window between claim and write (caught by the double-tap test); Payload `db.updateOne({ where })` reads first (not atomic) |
| Cron route `/api/cron/bookings` | Expiry, lapses and scheduling must happen without a visitor (US3-S2, edge cases) | Payload jobs queue needs a worker and config for four queries; read-time only expiry never notifies anyone |
| Filtering slots + `matchValues` (research §5) | "Shot by a woman" must narrow matches without naming an attribute in code (persona-extensibility) | A gender field on profiles hard-codes one audience's attribute |
