# Research: Creator offers (022)

Decisions taken while planning, from the clarified spec and the code as of `783ef0c`. Each item:
decision, rationale, alternatives rejected.

## R1. Where the mode, prices and frozen settings live

- **Decision**: on the brief. `briefs.offers` group: `mode` (`fixed` | `offers`, set once at sending
  from the switch), `feePercent`, `minPercent`, `maxPercent` (copied from site settings at sending),
  `sentTo` (number of creators announced to), and an array `budgets[] { persona, suggestedFils,
  amountFils }`.
- **Rationale**: FR-003 (a brief keeps the mode, fee and range it was sent with). Every later read
  (inbox, step 2, quotation, announce) decides by `brief.offers.mode`, never by the live switch.
- **Alternatives**: reading the switch live (breaks FR-003 when the team toggles it); a separate
  `offer-requests` collection (one more relation for data that is one-to-one with the brief).

## R2. The suggested price and the range

- **Decision**: `suggestedFils` per professional type = `quotePrice(rules, { personaIds: [p], duration,
  location })` (`packages/domain/src/pricing/quote.ts`), exactly what step 2 shows per section today
  (`booking/match.ts` `getMatchPage`). Range: `floor = round(suggested × minPercent / 100)`, `ceiling =
  round(suggested × maxPercent / 100)`, rounded to whole dirhams. When `quotePrice` fails
  (`no-tier`, `no-travel-fee`, `custom-value`), there is no suggestion and the only rule is
  `amount ≥ 1 AED` (US1-S5). New pure rules in `packages/domain/src/booking/offers.ts`:
  `offerRange(suggested, settings)`, `inRange(amount, range)`.
- **Rationale**: no new price source; the team keeps one place to tune prices.
- **Alternatives**: a per-creator rate on profiles (not asked for; creators counter instead).

## R3. The client's price step

- **Website**: the brief bar already shows a read-only preview per type with the one price
  (`MatchPreview.tsx`, data from `booking/preview-action.ts` `previewMatches`). In offers mode the
  preview becomes the last step "Your price": one number field per type, pre-filled with the
  suggestion, the range under it, posted with the brief as `budget.<personaSlug>` (whole AED). The
  server action returns `suggestedFils`, `minFils`, `maxFils` per type; no creator list is shown
  before sending (offers replace it).
- **App**: `features/brief/presentation/brief_bar.dart` + `BriefCubit` gain the same final step;
  prices come from a new endpoint `POST brief-builder/prices` (contract) with the answers so far.
- **Server**: `brief/commands/send-brief.ts` (`recordPrepared`) and `record-brief.ts` recompute the
  suggestions, check each amount (FR-006), fill a missing amount with the suggestion (older app,
  FR-025), and refuse with `brief.errors.budgetRange` / `brief.errors.emirateRequired`.
- **Alternatives**: a separate page after sending (two primary actions; the brief would broadcast
  before the client named a price).

## R4. Emirate required, and cities

- **Decision**: in offers mode the brief's `location` must resolve to an emirate: either an emirate
  slug, or a city slug whose parent is an emirate (`locations` is two levels). A new helper
  `emirateOf(value, locations)` replaces the inline lookup in `booking/match.ts`,
  `inbox/queries.ts` and `inbox/commands/announce-brief.ts`, but only offers-mode briefs use the
  city→parent step, so fixed-mode matching does not change (FR-002). A custom place is refused.
- **Rationale**: today a city or custom value disables the emirate filter and would broadcast to every
  creator (gap 8).

## R5. Offers are creators' answers with an amount

- **Decision**: extend `brief-answers` (feature 019), not a new collection: `amountFils` (set on
  `accepted` in offers mode), `revisions` (0–3), `clientDecision` (`declined` | null),
  `clientDecidedAt`. "Accept {price}" = `decision: accepted, amountFils: budget`. "Offer another
  price" = `accepted` with a different amount. A change of amount on an existing accepted answer
  increments `revisions`; the 4th change is refused `offers.errors.tooManyChanges`. A declined answer
  cannot be answered again (`offers.errors.declined`). Withdraw and "not for me" keep 019's
  behaviour.
- **Rationale**: the unique index (brief, creator, persona), access rules, upsert command, outcomes
  (`other-creator`, `booked-you`, `closed`), the step-2 `acceptedFor` read and `preconfirm` all
  already exist and stay correct.
- **Alternatives**: a new `offers` collection (duplicates all of the above).

## R6. The client's choice and the "picked" lock

- **Decision**: accepting an offer is a pick, as today: the step-2 URL keeps `pick=<persona>:<code>`
  and step 3 (details) needs one pick per type (FR-015). Declining is a new command
  `inbox/commands/decline-offer.ts` (by brief reference and key, so a guest can do it), which sets
  `clientDecision: declined` and notifies the creator. Changing the choice is just picking another
  offer before the quotation is accepted (US4-S7).
- **Lock**: 019's `withdraw-answer` already refuses once a `quoted` booking names the creator
  (`inbox.errors.alreadyPicked`); the same check is applied to a price change, and extended to any
  booking of the brief past `quoted` that names the creator (FR-010).
- **Price moved while choosing**: details and the quotation request carry the amount the client saw
  (`expect.<persona>`); `issueQuotation` refuses `offers.errors.amountChanged` when the current
  answer differs, and the page shows the new amount (edge case).

## R7. Fee and quotation lines

- **Decision**: `feeOf(amount, percent) = round(amount × percent / 100)` to whole dirhams, per offer;
  the quotation's fee line is the sum of the per-offer fees, so the total the client saw on each offer
  card adds up exactly (SC-004). `offerQuote(picks, feePercent)` returns a `FrozenQuote` (`booking/
  quote.ts`) with one `offer` line per pick (label "{profession} · {creator}" in en/ar, persona set)
  and one `fee` line; `discount` 0. `LineKind` (`packages/domain/src/pricing/types.ts`) and the
  `quotations.lines.kind` options gain `offer` and `fee`. VAT: everything is inclusive; the existing
  "VAT included" text stays and no VAT line is added (FR-021).
- **Where**: `issue-quotation.ts` branches on `brief.offers.mode`: offers → `offerQuote`, no add-ons,
  no promo (FR-018); fixed → unchanged. `pickAnother` is refused in offers mode
  (`offers.errors.pickFromOffers`) and the client goes back to the offers list.
- **Payment**: unchanged: Stripe and the webhook read the quotation total (feature 020).

## R8. Step 2 in offers mode

- **Decision**: `getMatchPage` gains an offers branch returning, per type: the client's budget, and
  the current offers (accepted answers, not withdrawn, not declined) whose creator is still listed and
  free on the date, each with `amountFils`, `feeFils`, `totalFils`, `atYourPrice`, sorted by total
  then answer time (FR-013); plus `sentTo` for the waiting state (FR-016). `sentTo = 0` shows the
  existing "no one free" state with WhatsApp. Nearby dates are not offered in this mode (the brief
  was sent for its date).
- **Views**: `booking/views.ts` `matchView` and the app's `MatchPage` entity gain the offer fields.

## R9. Live lists without a realtime service

- **Decision**: a **change stamp** per list, polled every 5 s while the page or screen is visible,
  and a full refresh only when the stamp changes.
  - Stamp = short hash of the ids, amounts, revisions, decisions and withdrawals that the list depends
    on: for the client's step 2 the brief's answers; for the creator's inbox the open-brief ids that
    match them plus their own answers. Computed by `offers/stamps.ts` from the same reads, kept cheap
    (two small queries).
  - **Website**: a `LiveRefresh` client component (generalised from `booking/components/
    PaymentPending.tsx`) calls a server action `liveStamp(scope)` (server actions use the site's
    cookie session; the mobile API is Bearer-only by design, `shared/api/handler.ts:77`), pauses when
    `document.visibilityState` is hidden, stops after 30 minutes without change, and calls
    `router.refresh()` on change. Pages `/match/{ref}/{key}`, `/account/inbox` and `/account` are
    already `force-dynamic`.
  - **App**: `GET match/{ref}/{key}/stamp` and `GET me/creator/briefs/stamp`, polled by `MatchCubit`
    and `InboxCubit` with a `Timer.periodic` while the page is visible and the app is resumed; a
    foreground push (R10) triggers an immediate reload.
- **Rationale**: Vercel serverless (no long-lived connections, two replicas in the Docker option),
  no new service (owner's decision), 5 s target (SC-001).
- **Alternatives**: SSE/WebSocket (no persistent process on Vercel), Postgres LISTEN/NOTIFY (pooled
  Neon connections), Ably/Pusher (new vendor and package, declined by the owner).

## R10. Push while the app is open

- **Decision**: `core/push/push_messaging.dart` subscribes `FirebaseMessaging.onMessage`;
  `PushService` exposes `Stream<PushEvent> events` (`event`, `path`). `InboxCubit` reloads on
  `brief-new`, `offer-declined`, `offer-lost`; `MatchCubit` on `offer-new` for its brief path. No
  system banner is shown in the foreground (the list updates instead), so no
  `flutter_local_notifications` package.

## R11. Notifications

- **Decision**: `NOTIFICATION_EVENTS` gains `offer-new` (client: an offer was made or changed),
  `offer-declined` (creator), `offer-lost` (creator: the client accepted another creator's quotation
  for that type). `brief-new` and `brief-accepted` texts gain `{price}`. Templates are CMS content in
  `quickMatch.templates` (seeded en/ar). Dedupe keys include the answer's revision so each change
  notifies once. Push goes only to members: a guest who sent a brief sees offers on the open page and
  in WhatsApp's private link (021 keeps briefs open to guests).
  - Booking accepted → creator: the existing `accepted` booking event already reaches assignments.
- **Where**: `inbox/commands/notify-brief.ts` (`onOffer`, `onDeclined`) and `booking` acceptance
  (`offer-lost` to every other current offer of the same type).

## R12. Switch and settings

- **Decision**: site-settings `quickMatch` tab gains a group `offers { enabled (default off),
  feePercent (10), minPercent (70), maxPercent (200) }` with validation `min ≤ 100 ≤ max`. Offers mode
  also requires `quickMatch.enabled`. Wire: `siteV1.offersEnabled?` and `briefBuilderV1.offers?
  { enabled, minPercent, maxPercent }` (optional fields, additive). Rules in
  `packages/domain/src/booking/offers.ts` `offersOn(settings)`.

## R13. Older app versions (FR-025)

- `answer` without `amount` → client's price. `POST briefs` without budgets in offers mode → the
  suggestions. Old step 2 still receives `matchV1` with `sections[].creators` = the offerers and
  `priceFils` = the client's budget + fee, so it shows a sensible single price; the quotation it
  issues uses the offer amounts and shows them before Accept. Old inbox shows briefs without a price;
  accept means the client's price.

## R14. Design authority

- **Approved 2026-11-17**: boards 44–56 in `specs/design-system/canvas/` (feature
  `022-creator-offers` in `manifest.json`), drawn on the design canvas
  https://claude.ai/artifact/WsKfpwik9wJXjuoENA9UKw:

  | Id | Board | Replaces, while the switch is on |
  |---|---|---|
  | 44 | `S01p-brief-price` brief · name your price | — (new last step) |
  | 45 | `S02o-offers-waiting` | 08 none free (when offers are awaited) |
  | 46 | `S02p-offers` offers list | 07 swipe to choose |
  | 47 | `S02q-offers-two-types` | — |
  | 48 | `S02r-offer-changed` (409 `offers.errors.amountChanged`) | — |
  | 49 | `S03o-details-offer` | 09 details |
  | 50 | `S04o-quote-fee` | 12 quotation to accept |
  | 51 | `S07h-inbox-price` | S07e (019, unmanifested) |
  | 52 | `S07i-offer-sheet` | — |
  | 53 | `S07j-account-creator-offers` | S07g / 27 Up next |
  | 54 | `S07k-account-client-offers` | 24 Up next and briefs |
  | 55, 56 | Arabic dark of 46 and 51 (designer variants) | — |
  | 57 | `S01q-brief-place` mark the place on the map, pin set (R15, approved 2026-11-17) | the emirate slot |
  | 58 | `S01r-brief-no-place` brief before the place; the price waits | — |
  | 59 | `S01s-place-empty` place step, nothing marked | — |
  | 60 | `S01t-place-search` search results (OF-US1-S4a) | — |
  | 61 | `S01u-place-location-off` location not allowed (OF-US1-S4c) | — |
  | 62 | `S01v-place-outside` pin outside the area served (OF-US1-S4) | — |
  | 63 | `S01w-place-fallback` map did not load: emirate and area (spec edge case) | — |

  58–63 were added the same day to show every state before and after choosing the place, and were
  approved by the owner on 2026-11-17.

  51 and 56 were revised the same day with the place row (area, rough map, distance); 49 now asks for
  the building, floor or gate under the pin.

- With the switch off, boards 07–14, 24 and 27 stay the authority. Other variants of 44–54
  (en-dark, ar-light, ar-dark) are derived as for every board. The boards style from one shared
  block inlined in each file, so restyling one means re-exporting all thirteen.
- Website surfaces follow the same boards at 360 px and go through the impeccable gates in "The
  Brief Bar" world.

## R15. The place: a map pin, private until booked (added 2026-11-17)

- **Decision**: the client marks the place with a required pin (Google Maps). The server stores, on
  the brief, `place { lat, lng, placeId, address, area, emirate, publicLat, publicLng }`:
  - `area` and `emirate` come from **server-side reverse geocoding** (Google Geocoding API) of the pin,
    never from the browser, so a client cannot claim another emirate; `emirate` is matched to the
    `locations` collection (emirate rows) by name with a slug map kept in `locations` (new optional
    field `googleName` per emirate, content-managed).
  - `publicLat/publicLng` = the pin snapped to a 0.02° grid (≈ 2 km cells), so it is always ≥ 1 km
    from the true pin's neighbours in a predictable way and never reveals it (FR-005b).
  - The distance shown to a creator = straight-line (haversine) km from their starting point to the
    **public** point, rounded to whole km, prefixed "about". No routing API.
- **Creator starting point**: `creator-profiles.base { lat, lng, area }`, optional, set on the profile
  editor with the same picker; never shown to clients.
- **Who sees what**: inbox items, Up next, `brief-new` pushes and every creator endpoint carry
  `area`, `emirate`, `publicLat/Lng`, `distanceKm` only. The booked creator's assignment view adds
  `lat`, `lng`, `address` and the details' address line once the booking is `confirmed` or later.
- **Maps on screens**:
  - Client pin picker (web): Google Maps JavaScript API + Places Autocomplete, loaded **only when the
    place step opens** (dynamic `<script>`; no package; keeps landing JS ≤ 200 KB, SC-007).
  - Creator card (web and app): a **Static Maps** image of the public point with a translucent circle
    (radius 1.5 km), URL signed on the server; no interactive map, no client key needed.
  - App pin picker: `google_maps_flutter` (exact pin) plus Places Autocomplete over the server
    (`POST places/autocomplete`, `GET places/{id}`), so the Places key stays on the server; "Use my
    location" via `geolocator`.
  - Booked creator: "Directions" opens `https://www.google.com/maps/dir/?api=1&destination=lat,lng`
    (web) or the platform maps app (app, `url_launcher`, already pinned).
- **Keys** (owner inputs): `GOOGLE_MAPS_BROWSER_KEY` (Maps JS + Places, HTTP-referrer restricted),
  `GOOGLE_MAPS_SERVER_KEY` (Geocoding, Places, Static Maps signing secret `GOOGLE_MAPS_URL_SECRET`),
  and per-platform app keys via `--dart-define-from-file` (`GOOGLE_MAPS_IOS_KEY`,
  `GOOGLE_MAPS_ANDROID_KEY`, restricted to the bundle id and certificate). A `MAPS_PROVIDER` switch
  `google` | `off` (off in tests and when keys are missing) falls back to the emirate list and a
  typed area (spec edge case), the same provider pattern as push and payments.
- **Alternatives rejected**: OpenStreetMap (weaker UAE address search, owner chose Google); showing
  the exact pin before booking (owner chose privacy); computing the emirate in the browser (trusts the
  client).
