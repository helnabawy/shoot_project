---
version: 1
slug: "quick-match-steps"
primary_target: "apps/web/src/app/(site)/[locale]/match/[ref]/[key]/page.tsx"
related_targets: ["apps/web/src/app/(site)/[locale]/match/[ref]/[key]/details/page.tsx", "apps/web/src/modules/booking/components/MatchResults.tsx", "apps/web/src/modules/booking/components/CreatorPickRow.tsx", "apps/web/src/modules/booking/components/NoMatch.tsx", "apps/web/src/modules/booking/components/DetailsForm.tsx"]
---

# Quick Match steps 2 and 3 — "Your creator" and "Your details"

## Scope and mode

Convert. Step 2 `/match/{ref}/{key}` (who is free, one price) and step 3 `/match/{ref}/{key}/details` (name, WhatsApp, the date only when missing, extras, a code). Feature 003 (US1, US2). Inherits The Brief Bar: the brief sentence the visitor just wrote stays the page's anchor; the creators are result rows under it.

## Audience, job, action

A client who has just tapped "See who's free". Job: see that real, checked people are free that day at a price they can accept, and pick one in one tap. Step 2 primary action: "Choose" on a creator row (one row is one action; the whole row is the link). Secondary: the "Let us choose" row; WhatsApp as a quiet Actions row. Step 3 primary action: the Top Hit "Get my quotation". Secondary: WhatsApp.

## Proof and constraints

Proof is only what is true: verified creators who serve the emirate and have not blocked the date, their photo or initials, specialties, and the computed price with what it includes (the tier's deliverables, the travel fee). No ratings, no "X people viewing", no countdowns, no "only 2 left". The price is shown once per professional type in the group header, because every creator in the group costs the same. Budgets as the landing page; no new client JS; works without JavaScript (rows are links, the form posts).

## Direction contract

THESIS: Step 2 is the Spotlight result list the brief bar promised: the query stays on top, the matches are rows grouped by type, and the price sits on the group label like a section total. Step 3 is the same panel with three fields and one Top Hit.

STORY: Step 2: the panel opens with the brief sentence as a set row (trailing "Edit"), then per professional type a group label "Photographers free on 12 Dec · AED 800" with the deliverables as one meta line, then one row per creator (photo tile, display name, code as meta, specialties as the second line, trailing forward arrow), then the "Let us choose" row (glyph tile, "Let us choose for you", "Same price. We'll assign a checked photographer."). Several types: one group each; choosing in one group keeps the other group's choice in the link. Step 3: set rows for the brief and each chosen creator, then fields Name and WhatsApp (pre-filled for members), the date field only if the brief said any date, extras as checkbox rows with their price, a native `<details>` "Have a code?" with one text field, the total as a meta line, the Top Hit "Get my quotation".

FIRST VIEWPORT: phone 390 px: brief row, the first group label with its price and at least two creator rows above the fold.

## States and ranges

- No one free that day: one open row "No one is free on 12 Dec", then up to three date rows ("Free on 13 Dec") that reload step 2 with that date, then "Let us choose" and WhatsApp. Nothing invented.
- Price on request (no price rule, or custom words in the brief): group label without a price, a row "We'll price this one on WhatsApp", and WhatsApp as the Top Hit; no quotation.
- 1 to 60 creators per group; long names truncate with the code still visible.
- Step 3 errors: inline under the field, announced (`aria-describedby`), plain language; promo problems are a sentence under the code field ("That code has expired"), never block the quotation.
- Invalid or stale link: the site 404.

## Deliberately absent

Stars, review counts, "top rated", availability calendars, per-creator prices, urgency copy, account creation prompts, cookie walls.

## RTL and dark

Photo tile at the start, arrow flips, prices and codes isolated LTR with `Bidi`. Dark uses the night tokens; no shadows added.
