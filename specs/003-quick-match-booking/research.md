# Research: Quick Match Matching, Quotation and Booking

Decisions the spec left to planning, with rationale and rejected
alternatives. Owner decisions from the 2026-11-07 clarification session are
binding and not re-argued here.

## §1 Where Quick Match starts

- **Decision**: the brief server action (feature 001) keeps recording the
  brief exactly as today. When `site-settings.quickMatch.enabled` is on, it
  also issues a brief **access key** and sends the visitor to step 2
  (`/match/{reference}/{key}`) instead of WhatsApp; the confirmation still
  offers WhatsApp as the secondary action. When the switch is off, 001's
  behaviour is unchanged. The schema default is `false`; the seed sets `true`.
- **Rationale**: FR-001 (resume from a recorded brief); Principle IV (the
  owner can turn the flow off without a deploy); 001's tests keep passing
  with the switch off.
- **Alternatives**: a new form on a new page (duplicates the brief builder);
  always-on (breaks the WhatsApp-only mode the owner may still want).

## §2 Private links (FR-011)

- **Decision**: briefs and bookings carry a random 16-byte **salt**
  (`accessSalt`, hidden, field read refused for every API caller). The link
  key is `HMAC-SHA256(PAYLOAD_SECRET, "<purpose>:<salt>")`, base64url (43
  chars). Pages take it as a path segment: `/match/{briefRef}/{key}`,
  `/q/{quoteRef}/{key}` (all quotation versions of a booking share the
  booking's key). Comparison uses `timingSafeEqual`. A wrong key renders the
  same 404 as an unknown reference. Members are also matched by `member`, so
  a signed-in owner never needs the key. Pages send
  `Referrer-Policy: no-referrer` and `robots: noindex`.
- **Rationale**: anonymous clients (Principle IX: brief without an account)
  need durable access; the database alone never yields a working link, yet
  the server can rebuild links for every later notification (a stored hash
  could not). Rotating `PAYLOAD_SECRET` invalidates outstanding links
  (documented).
- **Alternatives**: storing a SHA-256 hash of a random key (links could not
  be rebuilt for notifications after the first screen); signed JWT links
  (cannot be revoked per record, longer URLs); cookie-only access (lost on
  another device).

## §3 One price per brief (FR-003, FR-009)

- **Decision**: pure `quotePrice(rules, input)` in
  `packages/domain/src/pricing`. Input: persona ids (in order), duration
  option value, location option value, chosen add-on ids, promo code, date,
  `now`. Per persona: the active tier matching (persona, duration) plus the
  travel fee for the location (per professional, because each one travels).
  Then add-ons (flat, once per booking), then the promo (percentage or fixed,
  capped at the subtotal, never negative). Returns `{ ok: true, lines,
  subtotal, discount, total, currency: 'AED' }` or `{ ok: false, reason:
  'no-tier' | 'no-travel-fee' | 'custom-value' }`. Money is integer **fils**
  (AED × 100) throughout; formatting via `Intl.NumberFormat(locale, { style:
  'currency', currency: 'AED' })` at the edge.
  A brief whose duration or location was typed as custom words, or that has
  no rule, shows "price on request" and continues to WhatsApp (US1-S4).
- **Rationale**: every listed creator shows the same price (clarification);
  integers avoid float rounding; one pure function is 100% testable (FR-009).
- **Alternatives**: per-creator rates (rejected by the owner); storing
  decimals (rounding drift in sums and percentages).

## §4 Price-rule data shape (shared with 004)

- **Decision**: four content collections in a new `pricing` module, group
  "Prices": `service-tiers` (persona, `duration` = durations option value,
  price, localized `title` and `deliverables` list, `active`, `order`),
  `travel-fees` (`location` = locations option value, fee, `active`),
  `add-ons` (localized title/description, price, optional persona filter,
  `active`, `order`), `promo-codes` (code upper-case unique, `kind:
  percent|fixed`, value, `startsAt`, `endsAt`, `usageLimit`, `usedCount`
  read-only, `active`). Public read is limited to active rows and never
  exposes `usedCount`/`usageLimit` (promo codes: no public read at all; the
  server validates codes).
- **Rationale**: 004 FR-001 lists exactly these entities; keyed by option
  values so editors use the same vocabulary as the brief builder; 004 later
  adds pages, corporate packages and deals without migrating these.
- **Alternatives**: one `price-rules` global with arrays (no per-row access,
  hard to extend, giant admin form); keying travel fees by `locations`
  (002's emirate collection) — the brief stores option values, and 002 made
  emirate slugs equal those values, so the option value is the stable key.

## §5 Matching (FR-002, US1)

- **Decision**: pure `matchCreators(creators, input)` in
  `packages/domain/src/booking/matching.ts` over 002's cached
  `CreatorSummary` list (listed creators only) plus the day's blocked creator
  ids. A creator matches when: they offer the persona; they serve the emirate
  (`emirateIds` contains the location's emirate); they are not blocked on the
  date; and every **filtering slot** is satisfied. Ranking: creators whose
  specialties include the occasion option's category first, then 002's order
  (featured, newest). "Any date" skips the date filter (US1-S3).
- **Filtering slots** (persona-safe, no code names "woman"/"man"): a brief
  builder slot gains `filtersCreators` (checkbox); an option gains
  `matchesAny` (e.g. "anyone"). Creator listings gain editor-managed
  `matchValues` (text, many). A creator satisfies a filtering slot when the
  chosen option is `matchesAny`, or the value is in `matchValues`. The seed
  marks `shotBy` as filtering and "anyone" as `matchesAny`.
- **Occasion → specialty**: options gain an optional `category`
  relationship; it ranks, never filters (an empty list is worse than a less
  specialised creator).
- **Nearby dates** (US1-S2): `nearbyDates(date, isFree, { span: 7, max: 3 })`
  returns up to three dates within ±7 days (never before today, Asia/Dubai)
  that have at least one free match, nearest first, later before earlier on
  ties.
- **Rationale**: Principle IV and persona-extensibility (matching attributes
  are CMS values); reuse of 002's summary cache keeps step 2 within 2 s.
- **Alternatives**: a gender field on profiles (hard-codes one audience's
  attribute); filtering by occasion (too few results).

## §6 Availability (FR-002)

- **Decision**: collection `availability-blocks` `{ creator → creator-profiles,
  date (day, Asia/Dubai, stored as `YYYY-MM-DD` text), kind: blocked|booking,
  booking?, user (owner, for access) }` with a **unique index on
  (creator, date)**. Providers create/delete their own `blocked` rows from
  `/account/availability`; `booking` rows are written only by the
  confirmation transition and removed on cancel. Default is available.
- **Rationale**: the unique index makes "first confirmation wins" a database
  guarantee (edge case: two clients, one date); the date as text avoids
  time-zone drift.
- **Alternatives**: dates array on `creator-listings` (no uniqueness, races);
  calendar sync (out of scope).

## §7 Booking model and state machine (FR-005)

- **Decision**: one `bookings` row per quotation request, created with the
  first quotation in state `quoted`. It has `assignments` (array: persona,
  creator?, `status: open|pending|confirmed|declined|lapsed`, `respondBy`,
  `respondedAt`). States and allowed transitions live in one pure table
  (`packages/domain/src/booking/states.ts`):

  | From | Event (actor) | To |
  |------|---------------|----|
  | quoted | accept (client) | accepted |
  | quoted | quotation expires (system) | expired |
  | accepted | every assignment confirmed (creator) | confirmed |
  | confirmed | payment recorded (admin) | paid |
  | paid | shoot date reached (system) or schedule (admin) | scheduled |
  | scheduled | mark delivered (creator, admin) | delivered |
  | delivered | confirm delivery (client) or complete (admin, after the window) | completed |
  | paid, scheduled, delivered | report problem (client) / hold (admin) | on-hold |
  | on-hold | resolve to scheduled / delivered / completed / cancelled (admin) | … |
  | quoted, accepted, confirmed, paid, scheduled, on-hold | cancel (admin; client before paid) | cancelled |

  `expired`, `cancelled` and `completed` are terminal. Assignment events
  (confirm, decline, lapse, reassign, client picks another) do not change the
  booking state except "all confirmed → confirmed". `transition(booking,
  event, actor, now)` returns the next booking or a typed refusal (US3-S5).
- Every applied transition writes a `booking-events` row (from, to, event,
  actor role, actor user, note, at) — append-only, admin-read-only (audit
  trail, FR-005). Timestamps per state are also stored on the booking
  (`acceptedAt`, `confirmedAt`, …) for listing and export.
- **Rationale**: one booking per client request means one payment and one
  status for the client even with two professionals; the pure table is the
  single source of truth for UI buttons, server actions and admin hooks.
- **Alternatives**: one booking per creator (two payments, two pages for one
  shoot); Payload versions as audit (no actor/event semantics, noisy).

## §8 Applying transitions safely (edge case: double tap)

- **Decision**: every change goes through `modules/booking/transitions.ts`,
  which opens a Payload transaction (`initTransaction`, or the caller's), takes
  the booking's row lock (`SELECT … FOR UPDATE` through the adapter's Drizzle
  session for that transaction), then reads the booking, asks the domain
  table, writes the new fields and the audit row, and commits. A concurrent
  change waits on the lock and then reads the committed state, so a double tap
  is refused as "not allowed" (the action treats "already accepted" as
  success) and two answers never overwrite each other. Notifications are
  written after the commit. Admin edits in `/admin` reach the same table
  through the bookings hooks (field access stops direct `state` writes).
- **Rationale**: one booking already exists before acceptance, so a double tap
  can never create two; the lock makes "apply once" a database guarantee.
- **Alternatives**: an optimistic revision claim (`UPDATE … WHERE revision =
  n`) before the write — rejected after an integration test showed a reader
  between the claim and the write sees the old state with the new revision
  and applies the transition again; Payload's `db.updateOne({ where })` (reads
  before it writes, not atomic); trusting the UI to disable the button.

## §9 Quotation (FR-004, FR-010, FR-013)

- **Decision**: `quotations` `{ reference Q-XXXXX (unique, same alphabet as
  briefs), booking, brief, version, lines[] (kind, label en,
  label ar, amount fils, persona?), subtotal, discount, total, promoCode
  (text), validUntil, supersededBy?, issuedAt }`. Labels are frozen for both
  languages at issue time, so the price and wording never change after a
  rule edit (FR-010). An admin price adjustment creates version n+1 with an
  `adjustment` line and points the booking at it; older versions show
  "replaced by Q-…". Validity: `quickMatch.quotationValidDays` (default 7).
- **PDF**: the quotation page has `@media print` styles (no header/footer,
  A4 margins, black on white, both themes print light) and a "Download PDF"
  button calling `window.print()`; the browser saves it in the page
  language. Legal text is a localized rich-text setting.
- **Rationale**: owner decision (no server PDF); freezing lines satisfies
  the edge case "rules change after issue".
- **Alternatives**: recompute on read (violates FR-010).

## §10 Payments (FR-007)

- **Decision**: `payments` (admin-only collection): `{ booking, kind:
  received|payout|refund, amount fils, method: bank-transfer|cash|card|other,
  note (receipt reference), recordedBy, recordedAt, dueAt? }`. Recording a
  `received` payment on a `confirmed` booking applies the `pay` transition
  (paid, "held"). On `completed`, the system sets `payoutDueAt =
  completedAt + quickMatch.payoutDays` (default 10). A `payout` record marks
  it released; a `refund` record is allowed after cancel or from on-hold.
  `heldAmount = received − payouts − refunds` is derived, shown in admin.
  The client page shows the amount, localized payment instructions (rich
  text setting) and a WhatsApp action pre-filled with "Receipt for Q-…".
- **Rationale**: owner decision (receipt to WhatsApp, manual record); a
  provider later adds records of the same kinds.
- **Alternatives**: a single `paid` checkbox (no held/released/refund
  history).

## §11 Notifications (FR-006)

- **Decision**: `notifications` collection (admin read all; a user reads
  their own `in-app` rows; nobody else): `{ audience: client|creator|admin,
  user?, booking, event, channel: whatsapp|email|in-app, locale, text, link
  (wa.me link to the recipient's number for whatsapp, page link otherwise),
  dedupeKey (unique), readAt }`. A pure `notificationsFor(event, booking)`
  returns audiences; channels per audience are a site setting
  (`quickMatch.channels`); text comes from localized templates
  (`quickMatch.templates[]`: event, audience, text with `{reference}`,
  `{creator}`, `{date}`, `{link}` placeholders) rendered by a pure function.
  `dedupeKey = booking:revision:event:audience:channel` makes repeats
  harmless. Nothing is sent; admins see a "Notifications" list with open
  WhatsApp links; signed-in users see in-app rows on `/account/bookings`.
  Phone numbers in notifications are never logged (Principle VII).
- **Rationale**: owner decision (log + channel seam; sending is 008).

## §12 Time-based changes (cron)

- **Decision**: a new route `/api/cron/bookings` (same `CRON_SECRET` as
  cleanup) runs `runBookingClock(payload, now)`: expire quotations past
  `validUntil` (quoted → expired), lapse pending assignments past
  `respondBy` (and offer alternatives), move `paid` bookings to `scheduled`
  on the shoot date (Asia/Dubai), notify admins about `delivered` bookings
  past the delivery window. Pages also apply expiry on read (a quoted
  booking past validity is shown and treated as expired even before the
  cron runs). All rules take `now` as an argument (deterministic tests).
- **Alternatives**: Payload jobs queue (more config and a worker for four
  queries); timers (stateless app, Principle V).

## §13 Steps 2 and 3 (UX, Principle IX)

- **Decision**: step 2 `/match/{ref}/{key}` is a server page: the brief
  sentence on top (tap to edit → back to the builder with values), one
  section per professional type with result rows (photo, name, code,
  specialties, the price once in the section header, "Choose"), plus a "Let
  us choose" row. Choosing is a plain GET link to step 3 with
  `?pick=<persona>:<code|any>`, so it works without JavaScript. Step 3
  `/match/{ref}/{key}/details`: name, WhatsApp (pre-filled for members), the
  date only if the brief had none, optional add-ons rows, a "Have a code?"
  disclosure; one primary action "Get my quotation". It creates the booking
  and quotation and redirects to `/q/{quoteRef}/{key}`. The quotation page
  carries one primary action per state (accept / send receipt / confirm
  delivery). WhatsApp is always the secondary action.
- **Rationale**: one primary action per screen, no account, no invented
  proof; mirrors The Brief Bar result rows.

## §14 Creator and member pages

- **Decision**: `/account/bookings` lists, for a seeker, their quotations
  and bookings (by `member`) and in-app notifications; for a provider, the
  bookings with an assignment to their profile — pending ones first with
  "Confirm" / "Decline" and the respond-by time, scheduled ones with "Mark
  delivered". `/account/availability` is a month list of upcoming dates
  (next 90 days) with toggles to block/unblock; works without JS (one form
  per date). Providers see the client's first name, date, location, brief
  sentence and price, never the client's phone (it is in the admin view
  only, and in notifications to admins).
- **Rationale**: Principle VII (least data); simple flows.

## §15 Admin oversight (US4)

- **Decision**: Payload collections `bookings`, `quotations`, `payments`,
  `booking-events`, `notifications` in an admin group "Bookings". Bookings
  list columns: reference, state, date, client, total, updated; filter by
  state. Edits allowed to admins: reassign an assignment's creator,
  `priceAdjustment` (amount + reason → new quotation version), `state`
  through the transition hook (cancel, hold, resolve, complete), notes. A
  "Download CSV" list action (like 001's briefs export) exports the filtered
  bookings. Editors have no access to bookings or payments (PII + money).
- **Alternatives**: a custom admin dashboard (more UI to maintain; Payload's
  list/edit views suffice).

## §16 Abuse limits

- **Decision**: step 3 submission reuses `shared/payload/rate-limit.ts`
  (`quote:<visitor>`, `quickMatch.quoteLimitPerHour`, default 5); promo code
  checks count toward the same limit (no brute force). Phone numbers are
  normalised to E.164 with 001's `normaliseE164`.

## §17 Performance

- **Decision**: step 2 reads 002's cached public summaries (one tag-cached
  list) plus one indexed query for the day's blocks and the active price
  rules (cached with a `pricing` tag, revalidated on change). All three flow
  pages are dynamic server pages (private, `noindex`) shipping no new client
  JS except the print button (inline, < 1 KB) and the existing theme/locale
  toggles. Budgets: LCP ≤ 2.5 s, step 2 server time < 500 ms with 500
  creators (integration benchmark), quotation generation < 3 s (SC-002).
