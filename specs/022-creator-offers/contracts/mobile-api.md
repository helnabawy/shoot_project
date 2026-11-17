# Contract: mobile API changes (022)

All under `/api/mobile/v1`, through `defineHandler`, registered in
`packages/domain/src/api/v1/endpoints.ts`, zod shapes in `packages/domain/src/api/v1/{site,brief,
booking,inbox}.ts`, examples in `examples/`, snapshot `specs/contracts/mobile-api/v1.schema.json`
regenerated. **Additive only**: new fields are optional; no existing field changes type or meaning.

New error codes (problem+json, message keys): `brief.errors.budgetRange` (422),
`brief.errors.emirateRequired` (422), `offers.errors.outOfRange` (422), `offers.errors.tooManyChanges`
(409), `offers.errors.declined` (409), `offers.errors.amountChanged` (409),
`offers.errors.pickFromOffers` (409).

## Site and brief builder

- `GET site` → `siteV1.offersEnabled?: boolean`.
- `GET brief-builder` → `offers?: { enabled: boolean, minPercent: number, maxPercent: number }`.
- **New** `POST brief-builder/prices` (auth none, `no-store`): body `{ values, custom }` as the brief
  builder answers so far. Answer:

```json
{ "prices": [ { "persona": "photographer", "suggestedFils": 80000, "minFils": 56000, "maxFils": 160000 } ],
  "emirate": "abu-dhabi" }
```

`suggestedFils`/`maxFils` are `null` when there is no suggestion (then `minFils` = 100). `emirate`
null → the app asks for an emirate before sending.

- `POST briefs` → body gains `budgets?: { persona: string, amountFils: number }[]`. In offers mode a
  missing budget is the suggestion; an out-of-range one is `brief.errors.budgetRange`.

## Client: step 2 (`GET match/{ref}/{key}`, `matchV1`)

New optional fields:

```json
{
  "mode": "offers",
  "sentTo": 7,
  "sections": [
    {
      "persona": "photographer",
      "budgetFils": 80000,
      "offers": [
        { "creator": { "...": "matchCreatorV1" }, "amountFils": 80000, "feeFils": 8000,
          "totalFils": 88000, "atYourPrice": true, "answeredAt": "2026-11-17T09:12:00Z" }
      ]
    }
  ]
}
```

In offers mode `sections[].creators` = the offering creators (old apps), `priceFils` = budget + fee.

- **New** `POST match/{ref}/{key}/offers/decline` (auth optional, the key authorises): `{ "persona":
  "photographer", "creator": "C-1042" }` → the updated `matchV1`.
- **New** `GET match/{ref}/{key}/stamp` → `{ "stamp": "k3f9a2" }` (`no-store`).
- `POST match/{ref}/{key}/quotation` → body gains `expect?: { persona: string, amountFils: number }[]`;
  `409 offers.errors.amountChanged` when an offer moved.
- `POST quotations/{ref}/{key}/pick-another` → `409 offers.errors.pickFromOffers` in offers mode.

## Quotation view (`bookingViewV1`)

`lines[].kind` may now be `offer` or `fee` (old apps render any kind by label and amount).

## Creator inbox

- `GET me/creator/briefs` → `briefItemV1` gains optional `budgetFils`, `range: { minFils, maxFils }`,
  `offerFils`, `revisionsLeft`, `declined`; `outcome` unchanged.
- `POST me/creator/briefs/{ref}/answer` → `briefAnswerRequestV1` gains optional `amountFils`. Accept
  without it = the client's price.
- **New** `GET me/creator/briefs/stamp` → `{ "stamp": "..." }`.
- `GET me/creator/account` → `briefs.soonest.budgetFils?`.

## Push data

`data.event` may be `offer-new` (path `/match/{ref}/{key}`), `offer-declined` and `offer-lost` (path
`/account/inbox`). Old apps route by `path` and ignore unknown events.

## The place (R15)

- `POST briefs` → `place?: { lat, lng, placeId?, source }` (required in offers mode when maps are on;
  the server reverse-geocodes and refuses `brief.errors.placeOutside` (422) outside the emirates served).
- **New** `POST places/autocomplete` (auth none, rate-limited): `{ q, sessionToken, locale }` →
  `{ results: [{ placeId, main, secondary }] }`.
- **New** `GET places/{placeId}?sessionToken=` → `{ lat, lng, area, emirate }`.
- **New** `POST places/reverse` → `{ lat, lng }` → `{ area, emirate | null, inside: boolean }` (after a drag).
- `GET brief-builder` → `maps?: { enabled: boolean }`.
- Creator `briefItemV1` gains `place?: { area, emirate, mapUrl, distanceKm | null }`; `mapUrl` is a
  signed Static Maps URL of the public point. Never `lat`, `lng` or `address`.
- Creator booking view gains `place?: { lat, lng, address, area, directionsUrl }` only from
  `confirmed` on.
- `GET/PUT me/creator/profile` gains `base?: { lat, lng, area }`.
