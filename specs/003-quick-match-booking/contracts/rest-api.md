# Contract: Payload REST Surface and Access Results

Integration tests (`booking-access.int.test.ts`, `pricing-access.int.test.ts`)
assert each cell against a real PostgreSQL.

| Collection | Visitor | Seeker (own) | Provider (own) | Editor | Admin |
|------------|---------|--------------|----------------|--------|-------|
| service-tiers / travel-fees / add-ons | read active | read active | read active | CRUD | CRUD |
| promo-codes | none | none | none | CRUD | CRUD |
| availability-blocks | none | none | read own; create/delete own `blocked` | none | all |
| bookings | none | read own (`member`), no `adminNote`/`priceAdjustment` | none via REST | none | read, update via transitions |
| quotations | none | read own (no `accessSalt`) | none | none | read, update `supersededBy` |
| payments | none | none | none | none | create, read, update `note` |
| booking-events | none | none | none | none | read |
| notifications | none | read/update `readAt` own in-app | same | none | all |
| briefs (edit) | — | `accessSalt` never readable | — | — | not readable |
| creator-listings.matchValues | not readable | — | read own | update | update |

Direct REST writes to `bookings.state`, `bookings.revision`, timestamps,
`quotations.lines/total`, `promo-codes.usedCount` are rejected or ignored for
every role; only server transitions change them.
