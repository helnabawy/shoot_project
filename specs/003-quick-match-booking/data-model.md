# Data Model: Quick Match Matching, Quotation and Booking

**L** = `localized: true` (English fallback). Money is integer **fils**
(AED × 100). Dates without time are `YYYY-MM-DD` text in Asia/Dubai. Types
are generated (`payload-types.ts`), never hand-edited. Access: **A** admin,
**E** editor, **O** owner (signed-in user through the noted field), **P**
public, **S** server only (Local API with `overrideAccess`).

## Module `pricing` (group "Prices") — FR-009, shared with 004

### `service-tiers`

| Field | Type | Notes |
|-------|------|-------|
| `title` | text **L**, required ≤ 60 | e.g. "2-hour shoot" |
| `persona` | relationship → personas, required, indexed | |
| `duration` | text, required | a `durations` option value (validated against the option set) |
| `price` | number (fils), required, ≥ 0 | |
| `deliverables` | array ≤ 8 of `{ text **L** ≤ 80 }` | e.g. "60 edited photos" |
| `active` | checkbox, default true | |
| `order` | number | |

Unique (persona, duration) among active rows (beforeValidate). Access: read
P (active only) / E all; create/update/delete E. Revalidates tag `pricing`.

### `travel-fees`

`location` text required unique (a `locations` option value), `fee` number
(fils) ≥ 0, `active`. Access as above.

### `add-ons`

`title` **L** ≤ 60, `description` **L** ≤ 160, `price` (fils) ≥ 0,
`personas` → personas many (empty = all), `active`, `order`. Access as above.

### `promo-codes`

| Field | Type | Notes |
|-------|------|-------|
| `code` | text, required, unique, upper-cased, `^[A-Z0-9]{3,20}$` | |
| `kind` | select `percent \| fixed` | |
| `value` | number, > 0; percent ≤ 100; fixed in fils | |
| `startsAt`, `endsAt` | date (optional) | validity window |
| `usageLimit` | number ≥ 1 (optional) | counted at acceptance |
| `usedCount` | number, default 0, read-only (field update `noOne`) | |
| `active` | checkbox | |

Access: read/create/update/delete E; **no public read** (validated by the
server only).

## Module `booking` (group "Bookings")

### `availability-blocks` — FR-002

| Field | Type | Notes |
|-------|------|-------|
| `creator` | relationship → creator-profiles, required, indexed | |
| `user` | relationship → users, required (owner, set by hook from the profile) | |
| `date` | text `YYYY-MM-DD`, required, indexed | |
| `kind` | select `blocked \| booking` | providers may only create `blocked` |
| `booking` | relationship → bookings | set for `booking` rows |

Unique index (`creator`, `date`). Access: read A / O(`user`); create O
(kind `blocked`, own profile, date ≥ today); delete A / O (kind `blocked`
only); update A. Server writes `booking` rows.

### `bookings` — FR-001, FR-005, US3, US4

| Field | Type | Notes |
|-------|------|-------|
| `reference` | text unique indexed | its first quotation's reference (`Q-XXXXX`); later quotation versions get their own references |
| `state` | select: quoted, accepted, confirmed, paid, scheduled, delivered, completed, cancelled, expired, on-hold; indexed | changes only through transitions (§7–§8) |
| `revision` | number, default 0, hidden | optimistic concurrency |
| `brief` | relationship → briefs, required | FR-001 |
| `quotation` | relationship → quotations | current version |
| `member` | relationship → users, indexed | the client when signed in |
| `client` | group: `name` ≤ 80, `whatsapp` (E.164), `locale` en/ar | field read A + O(member) only |
| `date` | text `YYYY-MM-DD` (required before acceptance) | shoot day |
| `personaIds` | relationship → personas many | in the brief's order |
| `assignments` | array: `persona` → personas, `creator` → creator-profiles (empty = "let us choose"), `status` open/pending/confirmed/declined/lapsed, `respondBy` date, `respondedAt` date, `declineReason` ≤ 200 | |
| `total` | number (fils) | copy of the current quotation total, for lists/export |
| `acceptedAt`, `confirmedAt`, `paidAt`, `scheduledAt`, `deliveredAt`, `completedAt`, `cancelledAt`, `expiredAt`, `heldAt` | date, read-only | per-state timestamps |
| `payoutDueAt` | date, read-only | completedAt + payoutDays |
| `priceAdjustment` | group (A only): `amount` (fils, ±), `reason` ≤ 200 | virtual trigger: issues a new quotation version, then cleared |
| `adminNote` | textarea, A only | |
| `holdReason` | textarea ≤ 500 | client's problem report or admin reason |

Access: read A / O(`member`) / creators through a server query only (never
REST); create S; update A (through the transition hook); delete nobody.
Indexes: `state`, `date`, `member`, `assignments.creator`.

### `quotations` — FR-004, FR-010, FR-013

| Field | Type | Notes |
|-------|------|-------|
| `reference` | text unique, `Q-XXXXX` (no 0/1/O/I/L) | |
| — | — | the link key comes from the booking's `accessSalt` (§2) |
| `booking`, `brief` | relationships, required | |
| `version` | number ≥ 1 | |
| `supersededBy` | relationship → quotations | |
| `lines` | array: `kind` tier/travel/addon/discount/adjustment, `labelEn`, `labelAr`, `amount` (fils, discount negative), `persona?`, `deliverablesEn[]`, `deliverablesAr[]` (text) | frozen at issue |
| `subtotal`, `discount`, `total` | number (fils) | |
| `promoCode` | text | as applied |
| `validUntil` | date | issuedAt + validDays |
| `issuedAt` | date | |

Access: read A / O(booking.member) ; create S; update A (only
`supersededBy`); delete nobody.

### `payments` — FR-007

`booking` (required), `kind` received/payout/refund, `amount` (fils > 0),
`method` bank-transfer/cash/card/other, `note` ≤ 200 (receipt reference),
`recordedBy` → users (hook), `recordedAt`. Access: A only (create, read,
update `note` only, no delete). `afterChange` on create: `received` on a
confirmed booking applies the `pay` transition; `payout` requires
`completed`; `refund` requires `cancelled` or `on-hold`.

### `booking-events` — audit trail (FR-005)

`booking`, `from`, `to`, `event`, `actorRole` client/creator/admin/system,
`actor` → users?, `note` ≤ 500, `at`. Access: read A; create S; never
updated or deleted.

### `notifications` — FR-006

`audience` client/creator/admin, `user` → users?, `booking`, `event`,
`channel` whatsapp/email/in-app, `locale`, `text` ≤ 1000, `link` (wa.me or
page URL), `dedupeKey` unique, `readAt`. Access: read A / O(`user`, channel
in-app); update O (`readAt` only) / A; create S; delete A.

## Edits to existing schema

| Where | Change | Why |
|-------|--------|-----|
| `briefs` | `accessSalt` (hidden, read refused) | §2 |
| `option-sets.options[]` | `matchesAny` checkbox; `category` → categories (optional) | §5 |
| `landing-page.briefBuilder.slots[]` | `filtersCreators` checkbox | §5 |
| `creator-listings` | `matchValues` text hasMany (E only) | §5 |
| `site-settings` | new tab "Quick match" (group `quickMatch`) | below |

### `site-settings.quickMatch`

`enabled` (default false; seed true), `quotationValidDays` (7),
`confirmHours` (24), `deliveryConfirmDays` (7), `payoutDays` (10),
`quoteLimitPerHour` (5), `paymentInstructions` rich text **L**,
`quotationTerms` rich text **L**, `channels` group `{ client, creator, admin
}` each a select-many of whatsapp/email/in-app (seed: client whatsapp,
creator in-app + whatsapp, admin in-app), `templates` array `{ event,
audience, text **L** ≤ 600 }` (seeded for every event × audience the domain
emits; a missing template falls back to the English text, then to the event
name, and logs a warning in development).

## Domain types (packages/domain)

```ts
// pricing
interface PriceRules { tiers: Tier[]; travelFees: TravelFee[]; addOns: AddOn[] }
quotePrice(rules, { personaIds, duration, location, addOnIds, promo?, today }) → QuoteResult
validatePromo(promo | undefined, { today }) → { ok } | { ok: false, reason: 'unknown'|'inactive'|'not-started'|'expired'|'used-up' }
formatMoney(fils, locale) → string
// booking
type BookingState = 'quoted'|'accepted'|…|'on-hold'
transition(booking, event, actor, now) → { ok: true, booking, changes } | { ok: false, reason }
allowedEvents(booking, actor) → BookingEvent[]           // drives buttons
assignmentDeadline(acceptedAt, confirmHours) → Date
matchCreators(creators, { personaId, emirateId, date?, blocked, filters, categoryId? }) → CreatorSummary[]
nearbyDates(date, isFree, { today, span, max }) → string[]
notificationsFor(event, booking) → { audience, event }[]
renderTemplate(text, vars) → string
generateQuoteReference(random?) / isQuoteReference(s)
```

## Relationships

```text
briefs 1 ──▶ * bookings 1 ──▶ * quotations (versions; booking.quotation = current)
bookings 1 ──▶ * payments, * booking-events, * notifications, * availability-blocks (kind booking)
bookings.assignments[].creator ──▶ creator-profiles ◀── availability-blocks.creator
service-tiers.persona ──▶ personas; add-ons.personas ──▶ personas
```

## Seed (default, bilingual)

Default seed: Quick match settings (`enabled: true`, windows, placeholder
payment instructions and quotation terms) and every notification template
in en/ar; shot-by slot `filtersCreators`, "anyone" `matchesAny`, occasions
linked to their specialties. **No prices**: tiers, travel fees, add-ons and
promo codes are business data the owner enters (the seed states no invented
prices, as 002's seed invents no creators); until then every brief is
"price on request" and continues to WhatsApp. The opt-in demo seed
(`SEED_DEMO_CREATORS=1`, local/test hosts only) adds demo tiers for every
persona × duration (titles say "demo price"), travel fees for the eight
emirates, two extras and `WELCOME20` (20 %), plus one demo brief `B-D2222`
and quotation `Q-D2222` (quoted, valid a year, fixed demo salt) so Lighthouse
can measure the private pages. The default seed never creates bookings.
