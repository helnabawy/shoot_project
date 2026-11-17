# Data model: Creator offers (022)

One migration (`<ts>_creator_offers`) adds everything below. Additions only; no column dropped or
narrowed. Access on existing collections is unchanged unless stated.

## `site-settings` (global, `quickMatch` tab)

| Field | Type | Rules |
|---|---|---|
| `quickMatch.offers.enabled` | checkbox | default `false`; effective only when `quickMatch.enabled` |
| `quickMatch.offers.feePercent` | number | default 10, 0–50 |
| `quickMatch.offers.minPercent` | number | default 70, 10–100 |
| `quickMatch.offers.maxPercent` | number | default 200, 100–500 |

`quickMatch.templates` seeded with en/ar texts for `offer-new` (client in-app, push),
`offer-declined` and `offer-lost` (creator in-app, push); `brief-new` and `brief-accepted` texts gain
`{price}`.

## `briefs` (module `brief`)

| Field | Type | Rules |
|---|---|---|
| `offers.mode` | select `fixed` \| `offers` | default `fixed`; set once by the server at sending; read-only in admin |
| `offers.feePercent` | number | copied at sending (offers mode) |
| `offers.minPercent`, `offers.maxPercent` | number | copied at sending |
| `offers.sentTo` | number | creators announced to (offers mode), set by `announceBrief` |
| `budgets[]` | array | offers mode: one row per professional type of the brief |
| `budgets[].persona` | relationship → `personas` | required, one of `persona` |
| `budgets[].suggestedFils` | number, nullable | `quotePrice` result at sending, null when none |
| `budgets[].amountFils` | number | required; within the range when `suggestedFils` is set, else ≥ 100 |

Validation (server, FR-005/006): offers mode needs a location resolving to an emirate (R4) and a
budget per persona.

## `brief-answers` (module `inbox`, feature 019)

| Field | Type | Rules |
|---|---|---|
| `amountFils` | number, nullable | offers mode, `accepted` only; within the brief's range per persona |
| `revisions` | number | default 0; +1 on each change of `amountFils`; max 3 |
| `clientDecision` | select `declined`, nullable | set by the client's decline |
| `clientDecidedAt` | date, nullable | |

State per (brief, creator, persona) in offers mode:

```text
(none) --accept/offer(amount)--> offered --change(amount), revisions<3--> offered
offered --withdraw--> (none, withdrawnAt)        offered --client declines--> declined (final)
offered --client picks + quotation accepted--> picked (locked: change/withdraw refused)
(none) --not for me--> rejected --undo--> (none)  (as 019)
any --brief closes (date passed, window ended, booking past quoted)--> closed
```

"Current offer" = `decision = accepted`, `withdrawnAt` empty, `clientDecision` empty.

## `quotations` (module `booking`)

- `lines[].kind` options gain `offer` and `fee`. `offer` lines carry `persona`; labels frozen en/ar.

## `notifications` (module `booking`)

- `event` options gain `offer-new`, `offer-declined`, `offer-lost` (from `NOTIFICATION_EVENTS`).
- Dedupe key for offer events: `brief:<briefId>:<event>:<audience>:<channel>:<recipient>:<answerId>:<revisions>`.

## Domain (`packages/domain/src/booking/offers.ts`, 100 % coverage)

- `offersOn({ quickMatchEnabled, offersEnabled })`
- `offerRange(suggestedFils | null, { minPercent, maxPercent })` → `{ min, max } | { min: 100, max: null }`
- `inRange(amount, range)`
- `feeOf(amountFils, feePercent)` (whole dirhams)
- `offerQuote(picks: { persona, labelEn, labelAr, amountFils }[], feePercent)` → `FrozenQuote`
- `canChange(answer, picked)` / `canWithdraw` → ok | `tooManyChanges` | `declined` | `picked`
- `sortOffers(offers)` (total ascending, then answered first)
- `offerStamp(parts)` (stable short hash of the list's inputs)

`pricing/types.ts` `LineKind` += `offer` | `fee`; `booking/notifications.ts` events and audiences
(`offer-new` → client, `offer-declined`/`offer-lost` → creator).

## The place (R15)

`briefs.place` (group, offers mode; required when `MAPS_PROVIDER=google`):

| Field | Type | Rules |
|---|---|---|
| `lat`, `lng` | number | the exact pin; **private**: read by the brief's member, admins, and the booked creator once the booking is `confirmed` or later |
| `placeId` | text | Google place id when picked from search, else null |
| `address` | text | reverse-geocoded address, **private** as above |
| `area` | text, localized | neighbourhood or locality from reverse geocoding (en and ar) |
| `emirate` | relationship → `locations` (emirate rows) | from reverse geocoding on the server; drives matching and travel price |
| `publicLat`, `publicLng` | number | centre of the pin's 0.02° grid cell; the only point creators get |
| `source` | select `search` \| `drag` \| `device` \| `fallback` | how it was set |

`creator-profiles.base` (group, optional): `lat`, `lng`, `area` (localized); readable by the creator and
admins only.

`locations` (emirate rows): `googleName` text (the name Google returns for that emirate, for example
"Abu Dhabi"; seeded for the seven emirates).

Bookings: the assignment view for a creator adds `place.lat`, `place.lng`, `place.address` and
`details.venue` only when `state` ∈ {confirmed, paid, scheduled, delivered, completed}.

Domain (`packages/domain/src/booking/place.ts`, 100 % coverage): `snapPublic(lat, lng)` (centre of the 0.02° cell holding the pin),
`distanceKm(from, to)` (haversine, whole km), `insideUae(lat, lng)` (bounding polygon check before
geocoding), `placeForCreator(place, base, bookingState)` → the public or the full shape.
