---
version: 1
slug: "brief-price-and-place"
primary_target: "apps/web/src/modules/brief/components/BriefBuilder.tsx"
related_targets: ["apps/web/src/modules/brief/components/PriceStep.tsx", "apps/web/src/modules/brief/components/PlaceStep.tsx", "apps/web/src/modules/booking/components/OffersResults.tsx", "apps/web/src/modules/inbox/components/OfferBits.tsx", "apps/web/src/modules/booking/components/DetailsForm.tsx", "apps/web/src/modules/creators/components/BaseSection.tsx"]
---

# Creator offers: the price step, the place step, the offers list and the creator's offer

## Scope and mode

Convert, behind the site setting "Creators offer prices" (off by default). Feature 022 (US1–US5), boards 44–63 in `specs/design-system/canvas/`, which are the authority. Inherits The Brief Bar: one panel, rows on the ground, one Top Hit per screen.

## Audience, job, action

A client who has just finished the brief sentence and wants to say what they will pay and where. A creator who sees the brief and wants to answer in two taps. The client's primary action: the Top Hit that sends the brief. On the offers list: "Accept {name}" on the first offer (Decline is secondary on every card). The creator's primary action: "Accept {price}"; "Offer another price" is a quiet row.

## Proof and constraints

Only what is true. The price shown is the usual price from the price rules and the range the team allows; the total shows the offer plus the service fee with "VAT included". Creators never see the fee and never see the pin: the area, a rough circle and the distance only (FR-005b); the exact place goes to the booked creator after confirmation. No countdowns, no "N creators viewing", no invented ratings. The page says "Sent to N creators" with the real number. Works without JavaScript where a form can carry it (the price field and the Accept and Decline forms post); live refresh is an addition, never a requirement.

## Direction contract

THESIS: the offers list is the brief sentence with creators answering under it, one card each: who, their price, the fee, the total, then two buttons. The price step is one large number you can nudge, with the range said in one line.

Craft floor: a 44 px target on every button and field; labelled number fields with `inputmode="numeric"` and `dir="ltr"`; `aria-live="polite"` on the offers list so a new offer is announced; Western digits and the Arabic comma in Arabic; logical CSS only; light and dark through tokens; 360, 768, 1024 and 1440 px.

## Open

The draggable map (browser map key) is still to be designed into the place step; until then the place is set by search or the person's location.
