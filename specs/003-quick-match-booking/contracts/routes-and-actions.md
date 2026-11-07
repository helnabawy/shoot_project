# Contract: Routes, Server Actions and Cache Tags

All pages exist under `/[locale]` (`en` unprefixed, `ar` under `/ar`), are
dynamic, private (`robots: noindex`, `Referrer-Policy: no-referrer`) and
work without JavaScript. Unknown reference, wrong key and a key for another
record all render the same 404.

## Pages

| Route | Who | Renders | Test ids |
|-------|-----|---------|----------|
| `/match/[ref]/[key]` | brief owner (key or member) | Step 2 "Your creator": brief sentence, one section per professional type with the fixed price and matching creators, "Let us choose", alternatives when empty (nearby dates, WhatsApp) | QM-US1-S1…S6 |
| `/match/[ref]/[key]/details?pick=<personaSlug>:<code\|any>[,…]` | brief owner | Step 3 "Your details": name, WhatsApp, date (if none), add-ons, promo, "Get my quotation" | QM-US2-S1, S2, S4, S6 |
| `/q/[ref]/[key]` | quotation owner (key or member) | Quotation + booking status; one primary action per state; print layout | QM-US2-S1, S3, S5, QM-US3-S1…S4 |
| `/account/bookings` | signed-in | Seeker: own quotations/bookings + in-app notifications. Provider: assigned bookings with confirm/decline/delivered | QM-US3-S1, S2, S4, QM-US4-S4 |
| `/account/bookings/[ref]` | the member who owns it | Same view as `/q/…` without a key | QM-US2-S6 |
| `/account/availability` | signed-in provider with a profile | Next 90 days, block/unblock per date | QM-FR-002 |

## Server actions (`modules/booking/actions.ts`)

Every action validates input with zod, re-checks access and calls
`transitions.ts`; refusals return `{ status: 'error', code }` with a message
key under `booking.errors.*`; success redirects (no-JS) or returns state.

| Action | Input | Effect |
|--------|-------|--------|
| `requestQuotation` | ref, key, picks, name, whatsapp, date?, addOnIds[], promo?, locale | rate limit; re-match picks (creator still listed, free, matching); quotePrice; create booking (quoted) + quotation v1 + key; notify; redirect `/q/{ref}/{key}` |
| `acceptQuotation` | quoteRef, key | quoted → accepted (valid, current version, creators still bookable/free, promo still usable → `usedCount + 1`); assignments pending with `respondBy`; notify |
| `requestFreshQuotation` | quoteRef, key | expired quotation → a new booking + quotation v1 from the same brief and picks (prices recomputed) |
| `pickAnotherCreator` | quoteRef, key, persona, code | lapsed/declined assignment → pending with the new creator (same price) |
| `respondToAssignment` | bookingId, persona, decision confirm/decline, reason? | provider only for own assignment; confirm writes the availability block (unique) — on conflict the confirm is refused (`dateTaken`) and the assignment lapses; all confirmed → confirmed |
| `markDelivered` | bookingId | provider (own) or admin; scheduled → delivered |
| `confirmDelivery` | quoteRef, key | delivered → completed; payoutDueAt |
| `reportProblem` | quoteRef, key, reason | paid/scheduled/delivered → on-hold |
| `cancelByClient` | quoteRef, key | quoted/accepted/confirmed → cancelled; frees blocks |
| `toggleBlockedDate` | date | provider: create/delete own `blocked` block |
| `markNotificationRead` | id | own in-app row |

`submitBrief` (001, edited): when `quickMatch.enabled`, also creates the
brief key and returns/redirects to `/match/{ref}/{key}`; state gains
`matchUrl`.

## Route handlers

| Route | Auth | Effect |
|-------|------|--------|
| `GET /api/cron/bookings` | `Authorization: Bearer $CRON_SECRET` | `runBookingClock(now)`; JSON counts `{ expired, lapsed, scheduled, overdueDeliveries }` |
| `GET /api/bookings/export?state=…` | admin | CSV (reference, state, date, client name, personas, creators, total AED, created, updated); no phone numbers |

## Cache tags

`pricing` (any change to the four price collections), existing `creators`
summaries. Booking pages are uncached (private data).

## Message namespaces

`match.*` (steps 2–3), `quote.*` (quotation page, states, print),
`booking.*` (account pages, errors), `availability.*`.
