---
version: 1
slug: "creators-directory"
primary_target: "apps/web/src/app/(site)/[locale]/creators/page.tsx"
related_targets: ["apps/web/src/modules/creators/components/CreatorCard.tsx", "apps/web/src/modules/creators/components/CreatorGrid.tsx", "apps/web/src/modules/creators/components/DirectoryFilters.tsx", "apps/web/src/modules/landing/components/sections/CreatorNetwork.tsx", "apps/web/src/app/(site)/[locale]/work/[specialty]/page.tsx", "apps/web/src/modules/creators/components/SpecialtyHeader.tsx"]
---

# Creator directory, network block and specialty pages

## Scope and mode

Operate (find the right person), with the landing network block inheriting the landing surface's Persuade mode. Covers: the "Our network" block on `/`, the directory `/creators` with its filters and counts, the creator row used everywhere a creator is listed, the empty states, and the specialty pages `/work/{specialty}` (a directory pre-filtered by one specialty, with SEO text and a sample strip). Feature 002, spec `specs/002-creator-profiles/`. Inherits The Brief Bar (DESIGN.md); no new palette, type or panel style.

## Audience, job, action

The same clients as the landing page (individuals and businesses, mostly first-time, on a phone, often Arabic or dark). They arrive from the landing block, a specialty tile, or a shared link, wanting to see who does this kind of shoot where they are. Job: narrow to a creator in under 30 seconds (SC-001) and open their profile. Primary action: the Top Hit, the best match for the current filters (featured first, then most recently verified), which opens that creator's profile. Every other creator is an ordinary row. When nothing matches, the Top Hit becomes "Send a brief instead" (no dead end).

## Proof and constraints

No real portfolio photography exists yet: every creator row must look finished with an initials tile and no photo. Counts are real (computed from listed creators) and a zero count is never shown as a number: an option with no creators is hidden unless it is the current selection. No ratings, review counts, "top rated", "trusted by" or totals beyond what is literally listed. Filters are links (GET) and work without JavaScript. Budgets as the landing page; the landing page gains no client JavaScript from the network block. EN/AR with RTL; light and dark.

## Direction history

2026-11-07 (owner, T004 shaping): the owner chose Spotlight rows with a photo tile over photo-led rows with a sample strip, because the row grammar stays identical to the rest of the site and holds up with placeholders until real photography exists.

## Direction contract

THESIS: The directory is a Spotlight query already typed. The panel's field states the current search as a sentence ("Photographers for portraits in Dubai"), its filter rows refine it, and the Top Hit is the best match, exactly as Spotlight puts the best result first. Everyone else follows as result rows on the bare ground. It refuses the marketplace default (a grid of equal headshot cards with stars and badges) and adds no new component: a creator is a result row with a photo in the tile.

OWN-WORLD: Inherited from DESIGN.md without change, plus one documented expansion: the **photo tile**, a 44 px rounded square (10 px corners, nesting inside the row's 9 px hover shape the way the glyph tile does) holding the creator's photo cover-cropped from the `thumbnail` variant on its focal point, or, without a photo, the creator's initials (one or two letters of the display name in the current language, 15 px bold, tile stone / tile ink). Creator rows are two-line rows at a 64 px minimum: line one the display name (Row, 16 px, semibold) and, trailing, the stored code shown with its prefix (Meta, 13 px, mute, tabular, isolated left-to-right inside Arabic); line two (Meta, mute) the professional types joined by the locale's "and", a middle dot, then the first city with "+N" for the rest. In the directory, a third line lists up to three specialties as plain text ("Portrait, Wedding & engagement +1"), never pills. The photo is decorative (`alt=""`): the name beside it carries the meaning.

STORY: From the landing page the visitor scrolls past the specialties to "Our network": a section title on the ground, then up to N creator rows with hairlines, then a link row "See everyone" with a forward chevron tile. That opens `/creators`: headline, then the panel reading "All professionals, any specialty, anywhere" with three filter rows (Professional, Specialty, Emirate), each showing its current value ("Any") in the trailing slot. Opening a filter row reveals its options as rows with counts; choosing one reloads the page with the filter in the URL, the field's sentence re-composes, counts update, and the Top Hit is the new best match. Below the panel, the rest of the matches as rows, then page links. A specialty page is this same page with the specialty fixed, an intro on the ground above the panel, a counts line ("428 samples · 43 pros", hidden when zero) and a strip of up to 24 samples after the rows.

FIRST VIEWPORT: Phone 390 px: the quiet top bar; the headline ("Find your professional", Headline style, 34 px); the panel from 12 px margins: the field sentence (Field style, 20 px) with the search magnifier, a hairline, three filter rows at 44 px (glyph tile, label, current value trailing), a hairline, the "Top hit" group label and the Top Hit as a creator row in selection blue (photo tile, name and code in white, types and city at 85% white) with the Return hint on hover devices. The first two ground rows peek under the panel. Desktop: the same panel at 680 px centred, the list beneath it at the same width; nothing beside the panel.

SIGNATURE INTERACTION: Filtering is re-querying. Each filter row is a disclosure (a CSS checkbox, as the "Show N more" row already is, so it works without JavaScript); open, it lists the options as rows, each a link with its count trailing and the current option in the set state (tinted, ticked). Only one filter group is open at a time with JavaScript; without it, groups open independently. Choosing an option navigates (client-side with JavaScript, a full GET without), keeps scroll at the panel, and the sentence prints the new value as a token. A "Clear filters" row appears in the panel only when a filter is set. The rows below never animate in; the Top Hit swaps without motion. With one professional type in the audience the Professional row is not shown; an option with zero creators is hidden unless selected.

FORM: The Spotlight results list. Raises kept: a result list that reads in one sweep at a single row rhythm; the best match promoted, not decorated; state (selected filter, count) in the trailing slot, not in badges.

FINISH: unreviewed and undocumented is unfinished; each surface here ends with the impeccable detector, captures at 360 and 1440 px in en/ar and light/dark in `.impeccable/review/`, a `ship` finish review, and the documenter recording the photo tile and the two-line creator row in DESIGN.md.

## States and ranges

- Creators listed: 0, 1, 3 (the demo seed), typical tens, design for 500. Page size 24 (Site settings); page links "Previous" / "Next" as rows with chevron tiles and "Page 2 of 3" as meta between them.
- Names: 2 to 60 characters, wrap to a second line rather than truncate; Arabic names in Arabic script; a name only in English shows in English inside the Arabic page.
- No listed creators at all: the landing block is not rendered; `/creators` shows the panel with the sentence, no filter rows, one open row "No creators are listed yet" and the Top Hit "Send a brief instead" (to the landing brief), plus an Actions row for WhatsApp.
- Filters match nobody: the filter rows stay, a row "No one matches these filters yet", the "Clear filters" row, and the Top Hit "Send a brief instead" carrying nothing from the filters.
- Specialty page with no creators: intro and title shown, counts hidden, the same no-match rows; the page is `noindex`.
- Creator without photo: initials tile. Creator without samples: listed normally in the directory, sorted last, never in the landing block.
- Unknown filter values in the URL are ignored (treated as Any).

## Deliberately absent

Star ratings, review counts, "top rated", response-time claims, availability, prices (feature 004), follower counts, a total-network count in headings, pills or chips for specialties, equal-card grids, hover zoom on photos, infinite scroll, a map.

## RTL and dark

Rows mirror by logical properties only: photo tile on the start side, code on the end side, chevrons flip. The code and counts are isolated LTR runs with tabular figures. Group labels in Arabic: 12 px, no tracking, no uppercase. Dark: the Top Hit uses the night selection blue under white text; the photo tile gets no border in either theme (the photo is its own edge); the initials tile uses night tile / night tile ink.

## Constraints and open decisions

- Components: `BriefBar`, `BarField` (static sentence form, no composer here), `ResultGroup`, `ResultRow`, `TopHit`, `GlyphTile`; the photo tile and the two-line creator row are new parts of the kit (in `modules/creators/components/`, promoted to `shared/ui/bar/` only if a second module needs them).
- Copy is in `messages/{en,ar}.json` (`creators.*`); the landing block's heading, subheading and link label are CMS fields of the `creatorNetwork` block; specialty title, description and intro come from the category's `seo` group.
- Images: `thumbnail` webp, rendered at 44 px (88 px source for 2x), explicit dimensions, lazy below the fold; the Top Hit's photo is not prioritised (LCP is the headline).
- Tasks T030 and T034 follow this brief: the creator row shows photo or initials, name, code, types and first city, and in the directory up to three specialties; the bio excerpt is not shown in rows (it appears on the profile).
- Open: whether the header gains a "Creators" link (T037) is left to the finish review; default is no new header link, the landing block and specialty tiles are the way in.
