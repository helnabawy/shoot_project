---
version: 1
slug: "apps-web-src-app-site-locale-page-tsx"
primary_target: "apps/web/src/app/(site)/[locale]/page.tsx"
related_targets: ["apps/web/src/modules/brief/components/BriefBuilder.tsx"]
---

# Landing page and client brief flow

## Scope and mode

Persuade. Public landing page (`/` and `/ar`) with the brief builder as the first viewport, plus the client flow it starts: confirmation, WhatsApp hand-off, and the account "my briefs" list. Login and register inherit this world.

## Audience, job, action

Individuals booking a one-off shoot and businesses booking content, equally; mostly first-time, on a phone, often in Arabic or dark mode. Job: say what they need and reach a person fast. Primary action: the Top Hit row "See who's free for this". Secondary: WhatsApp directly. No account needed to brief.

## Proof and constraints

No real photography, logos, testimonials or counts exist yet; never invent them. Imagery slots accept CMS media later. Budgets: LCP 2.5 s, CLS 0.1, landing JS 200 KB. EN/AR with RTL; light and dark; works without JavaScript.

## Direction history

2026-11-07: "The Shoot Pass" (seed 0ba1ece0, assigned) was replaced by the owner after review: the ticket concept felt gimmicky, not premium enough, and harder to read. The owner took the round's runner-up, Bilingual Wayfinding, steered toward premium restraint. Later the same day the owner re-opened the decision: Wayfinding read too municipal and cold, too literal a costume, and not warm or premium enough. Re-roll round 1 of seed 0ba1ece0 dealt The Set Menu (the roll), The Credit Line (impeccable's pick) and Dawn Cyc (competitive), with Akari Lanterns, Datamatics Field, VU-meter Bridge, Torn Billboard and Pulp Rocket Plate declined. The owner then pinned a direction of their own, macOS Spotlight and Quick Actions, and chose it over the hand. Spent sketches stay in `.impeccable/mocks/decision/` (`assigned.html`, `wayfinding.html`, `set-menu.html`, `credit-line.html`, `dawn-cyc.html`) as history only; the payloads are `payload.json`, `payload-reroll1.json` and `payload-reroll1-steered.json`.

## Direction contract

THESIS: The brief is one search field. Like Spotlight, the visitor types or taps what they need into a single floating bar, the options fall into place as grouped result rows beneath it, and the Top Hit is the shoot. It refuses the category default (moody photo hero, serif headline, booking widget) and the previous sign-panel costume: no world is painted on the page, the page is the one panel the audience already knows how to use.

OWN-WORLD: Warm stone ground (#EFE9E3) and near-black ink (#1D1D1F), muted text (#8A8580); one floating panel, white at 86 percent over a 20 px blur with an opaque fallback, 14 px corners, a 1 px hairline, and the only shadow in the system (soft, single, low). Selection blue (#0A60FF; #4D8DFF in dark) is reserved for the Top Hit row, the caret and focus rings, never for text or decoration. Glyph tiles (30 px, 8 px corners, #F1EEEA) lead every row; key hints trail. Type is the system UI stack (SF Pro on Apple, Segoe UI on Windows, Roboto on Android, with their Arabic companions), zero font bytes; display at 700 weight with tight tracking, rows at 16 px, tabular figures. No gradients beyond one faint blue wash at the top of the ground, no icon sets copied from Apple, no second panel style. Dark theme: ground #141416, panel #28282C at 82 percent, ink #F5F5F7, tiles #3A3A3F; the phone-at-night scene is the first-class rendering.

STORY: The visitor reads "You brief. We shoot." in their language, sees the bar already holding a sensible sentence ("Photographer for a wedding in Dubai"), changes any part by tapping a row or typing, watches the sentence re-compose, and presses the Top Hit. The confirmation is the same bar with the sentence fixed, a reference, what happens next and the reply time; WhatsApp opens with the sentence written. Below the fold, on the bare ground: how it works as three numbered rows, why it is safe as rows, specialties as a result group, the creator invitation as a second, smaller bar with its own Top Hit, FAQ as expanding rows, and a closing Top Hit.

FIRST VIEWPORT: Phone 390 px: a quiet top bar (wordmark, language, menu); the headline "You brief. We shoot." at 38 px bold with the Arabic line beneath, right-aligned; the panel from 12 px margins: the field at 22 px with a live caret, a hairline, then TOP HIT as the one blue row "See who's free for this ↩", then the groups Occasion, When and how long, Emirate, Shot by, Actions (WhatsApp us instead, I'm a photographer), each row a glyph tile, label and trailing state. The Top Hit sits above the fold on a 360 × 640 phone. Desktop: the same panel centred at 680 px where Spotlight sits, the headline left-aligned to its edge above it, nothing beside it.

SIGNATURE INTERACTION: Owner-amended 2026-11-07: the brief is built one step at a time, like a Spotlight query growing token by token. The bar opens as one field, "Type what you're looking for", with only the first group beneath it. Choosing a row prints its value into the sentence as a tinted token and the next group takes the old one's place (a 160 ms rise, opacity and 4 px); the field's caret always sits where the next answer goes, its placeholder naming what is asked ("what occasion"). The Top Hit appears only once every part is answered; a group that takes several choices has its own Continue Top Hit; an optional group offers a skip row. Tapping a token reopens that step; Backspace in the empty field takes back the last token. Typing searches every group at once; arrow keys move the highlight between rows, Return fires the Top Hit, Escape clears the filter. Setting a row ticks it and prints its value into the sentence; an unset row reads as an invitation ("pick a date"); a row needing attention carries its one-sentence message in the trailing slot. Without JavaScript the bar is a form: the sentence is a row of labelled selects, the groups are radio rows, the Top Hit is the submit button. Reduced motion: the highlight moves without animation.

FORM: macOS Spotlight and Quick Actions, owner-pinned on re-roll round 1 of seed 0ba1ece0 and chosen over the dealt hand (The Set Menu led). Raises kept from the round: identical row rhythm so the whole brief reads in one sweep (VU-meter bridge), state carried by material not icons (Akari), no decorative greys (Datamatics), a choice once made stays printed in the sentence (Torn billboard), one direction of travel from headline to Top Hit (Pulp rocket).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Approved sketch

`.impeccable/mocks/decision/brief-bar.html` (code-led; the build matches its arrangement, palette, type and density).

## Unresolved

- Final brand name and wordmark (working name "Shoot Project").
