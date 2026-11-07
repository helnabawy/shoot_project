---
version: 1
slug: "creator-profile"
primary_target: "apps/web/src/app/(site)/[locale]/creators/[code]/page.tsx"
related_targets: ["apps/web/src/modules/creators/components/ProfileView.tsx", "apps/web/src/modules/creators/components/SampleGallery.tsx", "apps/web/src/app/(site)/[locale]/book/[code]/page.tsx", "apps/web/src/modules/brief/components/BriefBuilder.tsx"]
---

# Creator profile and booking a creator

## Scope and mode

Persuade. The public profile `/creators/{code}` (identity, verified row, professional types, cities, languages, bio, sample gallery, links) and `/book/{code}`, the brief builder with that creator fixed. Feature 002 (US2). Inherits The Brief Bar; the brief builder on `/book` is the landing's builder unchanged except for the creator row.

## Audience, job, action

A client who has found a creator (from the directory, the landing block, a specialty page, or a link someone sent on WhatsApp) and is deciding whether this is their person. Job: trust them enough to book, quickly, on a phone. Primary action: the Top Hit "Book with {display name}" (the full display name: no first name is guessed, since names and studio names do not split reliably across cultures), which opens `/book/{code}`. Secondary: "Ask on WhatsApp", a row in the Actions group with the creator's code in the message. A creator whose professional types have all left the site's audience is reachable but not bookable: their Top Hit is "Ask on WhatsApp" and there is no Book row.

## Proof and constraints

The only proof is what the creator uploaded and an admin approved: their samples, their stated cities and languages, and the fact that the profile was checked before it was listed. No ratings, reviews, job counts, response times, prices or availability exist; none are shown or implied. The verified row says only what is true ("Profile checked by our team before it was listed"; copy in messages so the owner can change it). Samples may be absent: the page must be complete without them. Budgets as the landing page; the gallery must not push LCP or CLS. EN/AR with RTL; light and dark; works without JavaScript (the gallery links to each large image; the viewer is an enhancement).

## Build notes (2026-11-07)

- Fact rows are single 44 px rows (value, with what it is in the trailing slot) so the Top Hit stays above the fold on a 360 x 640 phone; only the Verified row keeps a second line. A fifth fact, "Shoots" (specialties), was added to the four above.
- The site's floating WhatsApp button steps aside while the profile panel or the booking panel is on screen (both carry `data-floating-hide`; both already offer WhatsApp), so it never covers their rows.
- Gallery images are all lazy: the identity panel sits above them on every viewport.

## Direction history

2026-11-07 (owner, T004 shaping): the owner chose an identity panel with the portfolio below over a portfolio-first page with a pinned booking bar, because the action stays above the fold on a 360 × 640 phone, the page works before any real photography exists, and a pinned bar would be a second floating panel.

## Direction contract

THESIS: A profile is one Spotlight result opened up: the panel is the creator, its rows are the facts, and its Top Hit is the booking. The work follows on the ground, the way Quick Look shows a file under its name. It refuses the category default (cover photo, avatar, star rating, "Hire me" button among six others) and keeps one action.

OWN-WORLD: Inherited from DESIGN.md. Uses the photo tile from `creators-directory.md` at a larger step for the panel header: 64 px, 12 px corners, same initials fallback. The display name inside the panel is the page's `h1` at Section Title size (26 px, 30 px from 640 px), not Headline: the panel, not a page title, carries the identity. The code is Meta, mute, tabular, isolated left-to-right. The gallery is a grid on the ground at the 680 px column (two columns on phones, three from 640 px), 4:5 cover crops on each image's focal point, 8 px corners (the tile radius), 8 px gaps; no hover zoom, no captions on the grid, no shadow.

STORY: The visitor lands on the panel: photo tile, name and code; beneath, the rows Verified (drawn check tile), Professional types ("Photographer and videographer" when several, from the persona names), Works in (cities), Speaks (language names in the visitor's language); then the "Top hit" group label and the blue row "Book with Sara Khan"; then an Actions group with "Ask on WhatsApp" and, when present, a link row per social profile. Under the panel, on the ground: the bio as body text (52 to 60 characters per line), a "Work" section title and the gallery. Tapping a sample opens it large (the viewer: a native dialog with previous, next, the caption and the specialty, Escape and the back gesture close it; without JavaScript, the link opens the large image). A video sample shows its poster with a drawn play tile in the end corner and a "YouTube" or "Vimeo" meta line; it opens the video in a new tab. "Book with Sara Khan" opens `/book/{code}`: headline "Book Sara Khan", then the landing's brief bar with one extra set row at the top of the panel, the creator (photo tile, name, code, trailing "Change" link back to the normal brief), and the professional step already answered when the creator has one type, or offering only the creator's types when they have several.

FIRST VIEWPORT: Phone 390 px: the quiet top bar; the panel from 12 px margins: header (64 px photo tile at the start, name at 26 px, code beneath as meta), a hairline, four fact rows at 44 px, the "Top hit" label and the Top Hit, all above the fold on a 360 × 640 phone; the Actions group may fall just below. Desktop: the panel at 680 px centred, the bio and gallery under it at the same width; nothing beside the panel.

SIGNATURE INTERACTION: The facts are rows, not badges: each is a glyph tile, a label and, where useful, a trailing value, so the profile reads with the same sweep as the brief. The gallery opens in place (native dialog, focus returns to the tapped image on close, arrow keys and swipe move between samples, reduced motion: no transition). On `/book/{code}` the creator is a set row the visitor never has to answer, so the brief is one step shorter than on the landing page.

FORM: A Spotlight result with Quick Look under it. Raises kept: facts as rows at one rhythm; one action, promoted; the work shown plainly at a uniform crop so no sample is decorated over another. Surface-scope addition: no new concept roll. It inherits the owner-pinned Spotlight world (re-roll round 1 of seed 0ba1ece0, recorded in the landing contract).

FINISH: unreviewed and undocumented is unfinished; profile and book pages end with the impeccable detector, captures at 360 and 1440 px in en/ar and light/dark, a `ship` finish review, and the documenter recording the larger photo tile, the fact rows and the gallery grid in DESIGN.md.

## States and ranges

- Samples: 0 to 30; images and video links mixed; captions 0 to 140 characters per language.
- No samples: the gallery is replaced by one open row on the ground, image tile, "Sara hasn't added work yet." No empty grid, no placeholder squares.
- No photo: initials tile. No bio: the bio paragraph is omitted. No social links: those rows are omitted. One city / one language: singular rows.
- Professional types: one ("Photographer"), several ("Photographer and videographer"; Arabic joins with "و"). Only types in the audience are shown.
- Unlisted but reachable: Top Hit "Ask on WhatsApp", no Book row, `/book/{code}` returns 404.
- Paused, suspended, unpublished or unknown code: the site's 404 page, identical to any unknown URL (no hint the creator exists).
- Code spellings: `/creators/CR-D2222` and `/creators/D2222` redirect to `/creators/d2222`.

## Deliberately absent

Stars, review counts, "verified" as a blue badge or checkmark seal (verification is a row with a plain sentence), cover photos, hover zoom, autoplaying or embedded video, share buttons, "similar creators" carousels, prices, availability, contact details other than the business WhatsApp.

## RTL and dark

Photo tile on the start side, code on the end, forward arrow in the Top Hit flips; the gallery grid flows from the start edge. Codes and counts isolated LTR. Dark: the viewer's backdrop is the night ground at 92% (no blur, no second panel material), images are never dimmed or filtered.

## Constraints and open decisions

- Components: `BriefBar`, `ResultGroup`, `ResultRow`, `TopHit`, `GlyphTile`, the photo tile, `CmsImage` (sized variants), the existing `BriefBuilder` with a new optional `creator` prop; the viewer is the page's only client island besides the builder.
- Images: the gallery uses `card` webp with `sizes` for two/three columns, explicit dimensions from the 4:5 crop, the first image eager and the rest lazy; the panel's photo tile is the `thumbnail` variant at 64 px.
- JSON-LD: `ProfilePage` with a `Person` limited to real fields (name, image, job titles from types, area served from cities); no `aggregateRating`.
- Copy in `messages/{en,ar}.json` (`creators.profile.*`): verified row sentence, row labels, "Book with {name}" (full display name), "Ask on WhatsApp", the empty-gallery sentence, the viewer controls.
- Open: whether the verified sentence should name what is checked (identity and portfolio, per spec US3) is the owner's call; default is the neutral sentence above.
