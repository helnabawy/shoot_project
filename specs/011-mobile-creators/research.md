# Research: Mobile creators

## R1 Starting price (FR-005, the one open clarification)

**Finding.** Neither `creatorCardV1` nor `creatorProfileV1` carries a price, and 003's price rules
give one price per brief, not per creator. 004 (pricing packages) is not built.

**Decision.** Show no starting price anywhere in 011: cards end with "Profile", the profile's
primary action is "Book with {first name}" with no price part, rows on 18 and 19 omit the price.
The directory's order is the website's (the API's), described as "featured first, then newest"
instead of "lowest starting price first".

**Rationale.** Principle IX: no invented proof. Deriving a price on the device would write a price
rule in the app (SC-006).

**Alternatives.** Derive "lowest tier plus travel fee" in the app (rejected: SC-006); wait
(rejected: blocks the feature). **Owner decision needed**: add an additive `startingPrice` to
`creatorCardV1` and `creatorProfileV1` once 004 decides where it comes from.

## R2 Facts the API does not carry yet

`identityVerified`, the creator's availability note, the days a creator is blocked or booked are not
in the v1 contracts. The WhatsApp number is `site.whatsapp.number`.

**Decision.** The verified mark (FR-002), the availability note on cards (FR-031) and the date
limit on 17 (FR-020, AC3) are not drawn until the API provides them. **Owner decision needed**:
additive fields on 008 (`identityVerified`, `availabilityNote`, a creator availability read).

## R3 The creator restriction on 17

`creatorProfileV1.personaSlugs` narrows the persona slot; `places` (names) narrow the place slot by
matching option labels, since the profile carries names, not slugs. A creator whose places match no
option leaves 17 unable to complete and WhatsApp is offered (spec edge case).

## R4 Recording the brief

No mobile endpoint records a brief (012 extracts the command). Until then a complete brief opens
WhatsApp with the CMS template filled like the website (`renderBriefMessage`: unset optional parts
dropped with their joining words, a creator line added when the template has no `{creator}`),
through one `BriefSubmit` port that 012 replaces.

## R5 Directory state across navigation

`DirectoryCubit` is provided by a `ShellRoute` over `/creators` only; profiles are pushed on top
(`context.push`), so the list and its scroll offset stay in the tree (FR-032). "Show more" appends
pages; a changed filter restarts at page 1.

## R6 Share and external links

`ShareLink` port over `share_plus` shares `WebsiteLinks.address('/creators/{code}', languageCode)`.
Social links and videos use `UrlOpener`. WhatsApp uses `https://wa.me/...` opened externally.

## R7 Sample viewer

A full-screen route pushed from the profile (not a website path): `PageView`, dark scrim, caption,
"n of m", close; videos open their link outside the app. Baselines are the app's own (no board).

## R8 Specialty emirate filter

The specialty answer has no filter parameter; it carries every listed creator and sample. The chips
are the union of the creators' `places`; a chosen one filters creators (by place name), samples (by
creator code) and recomputes counts. Zero counts are not shown (FR-003).

## R9 Strings

Interface strings in ARB (`mc*`). Specialty titles, lines, hire titles, FAQ and every list word come
from the API. When a specialty's editor title is empty the screen uses an ARB pattern with the
specialty name.

## R10 Hire page redirect

When `HirePage.path` differs from the address asked for, the route replaces its location.
