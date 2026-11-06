# Feature Specification: Pricing, Packages and Promotions

**Feature Branch**: `004-pricing-packages`

**Created**: 2026-11-06

**Status**: Draft (spec only)

**Input**: Inspired by shootix.ae /pricing ("Every price, in full, before you book"; photography / video / photo + video tabs; 1 h–full day tiers with edited-photo counts; WELCOME20; included / not included; travel fees per emirate; multi-day partner rates; "Call" and WhatsApp CTAs) and /corporate (monthly retainers with term tabs 1/3/6/12 months and savings, Essential / Growth / Brand Studio packages, add-ons, three steps, "before you hire in-house" comparison, FAQ).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See every price before booking (Priority: P1)

A visitor opens the pricing page, switches between service tabs, and sees
each tier's duration, deliverables, list price and promo price, what is
included and excluded, travel fees by location, and multi-day rates, with
WhatsApp and call actions per tier. Editors manage all of it per language.

**Acceptance Scenarios**:

1. **Given** published pricing, **When** the visitor opens the page,
   **Then** tabs, tiers, inclusions, travel fees and multi-day rates render
   from the content store in the page language and currency.
2. **Given** a promo code configured with a percentage, **Then** the
   discounted price is shown next to the list price with the code.
3. **Given** the editor adds a tier or changes a fee and publishes, **Then**
   the page updates within 60 seconds.

---

### User Story 2 - Corporate packages (Priority: P2)

A business visitor opens the corporate page, picks a term, compares
packages (shoot days, videos, photos, monthly price with term savings),
sees add-ons, the three-step process, the in-house comparison and FAQ, and
books a planning call on WhatsApp with the package pre-filled.

### User Story 3 - Price rules power quotations (Priority: P2)

The same tiers, travel fees, add-ons and promo codes are exposed as rules
so that feature 003 computes one fixed price for a brief (type × duration ×
location + extras − promo).

### User Story 4 - Promotions and deals (Priority: P3)

Editors publish time-boxed deals (flash deals), extras and membership
("Plus") offers as content with validity windows; expired deals disappear
automatically.

### Edge Cases

- Promo code expired or over its usage limit: not applied, clear message.
- Tier without a price in one currency/language: falls back to the default
  with a warning in the content area.
- Travel fee for a location not in the list: "contact us" instead of a
  number.

## Requirements *(mandatory)*

- **FR-001**: Pricing MUST be modelled as data: services, tiers (duration,
  deliverables, price), inclusions/exclusions, travel fees per location
  (from the Locations option set), multi-day rates, add-ons, promo codes
  (type, value, validity, usage limit), corporate packages with terms.
- **FR-002**: All price-bearing text MUST be localised; amounts MUST be
  stored once with a currency and formatted per language.
- **FR-003**: A pure price-calculation rule MUST compute a brief's price
  from these records and be unit-tested exhaustively.
- **FR-004**: Pricing and corporate pages MUST be built from reusable
  blocks and meet the performance budgets, in both languages and both
  themes, following the recorded visual direction.
- **FR-005**: Deals MUST have start/end times and hide themselves outside
  the window without a publish action.

### Key Entities

Service, Tier, TravelFee, MultiDayRate, AddOn, PromoCode, CorporatePackage,
Term, Deal.

## Success Criteria *(mandatory)*

- **SC-001**: A visitor can find the price of a 2-hour shoot in Sharjah
  including travel in under 20 seconds.
- **SC-002**: Computed prices match the published tables exactly for every
  combination of service, duration, location, add-on and promotion.
- **SC-003**: Editors change any price without a developer.

## Assumptions

- Currency is AED; a second currency is configuration, not code.
- Taxes are shown as included unless the owner decides otherwise.
