---
version: 1
slug: "creator-home"
primary_target: "apps/web/src/app/(site)/[locale]/creator-home/page.tsx"
related_targets: ["apps/web/src/modules/creator-home/components/CreatorHome.tsx", "apps/web/src/modules/creator-home/components/RequestCard.tsx", "apps/web/src/modules/creator-home/components/DeclineStep.tsx", "apps/web/src/modules/creator-home/components/HomeSummary.tsx", "apps/web/src/modules/creator-home/components/NotLive.tsx"]
---

# Creator home

## Scope and mode

Operate. What a signed-in creator (provider) sees at `/` and `/ar` instead of the client landing
(feature 023). Approved boards: Shoot canvas 64 to 67 (`specs/design-system/canvas/S14*.dc.html`). The
owner asked for "a more professional look and simple actions" (2026-11-17), after a denser first version
with a week strip, a free-today switch and per-row buttons was set aside.

## Audience, job, action

A creator opens the site to answer what is waiting. One queue merges booking requests (nearest
answer-by first) and matching briefs (newest first); one request is the card, with two actions:
Accept (the page's only Top Hit) and Decline (secondary, opens the existing optional reason). After an
answer the next request is the card. Nothing waiting: "You are up to date", no Top Hit. Not live: the
missing steps and "Finish my profile" as the Top Hit; in review: the message and no Top Hit.

## Direction contract

THESIS: a work queue in The Brief Bar world, read top to bottom in one column.

- Identity row: 44 px scene tile (or photo), name as the h1 at 20 px / 700, profession and code in mute,
  the status badge at the inline end (Live in success, Not live yet in attention, In review neutral).
- Three counts between hairlines, a three-column grid of links: the number at 26 px / 700 tabular, the
  label in mute. They are links, not tiles.
- "Needs your answer": group label with "1 of N" at the end; the card is the page's one `panel-solid`
  (radius 14, shadow-lift): kind in mute 13 px / 600, the answer-by badge in attention, title 22 px /
  700, labelled lines (`dl`, label in mute, value at the end in ink 500, tabular), then Accept (red,
  1.4 share) and Decline (outlined, 1 share), both 50 px, then one line in mute saying what Accept does.
  The following requests are plain rows on the ground marked "Next", without buttons.
- "Next shoot": one row with a 44×48 date tile, title, date line in mute, the payment badge, chevron.
- "Manage": glyph-tile rows (Bookings, Availability with Free today / Busy today, My profile).
- Column 560 px (`account-column`) from 768 px, centred; gutter 12 px on phones.

## Proof and constraints

Counts are real or 0. No price except the client's price on a brief when creators offer prices (022);
never the platform fee. The client is a first name and initial. Nothing is invented to fill an empty
state.

## Deliberately absent

A greeting, a hero, tips, earnings, charts, a week strip, a switch, more than two actions on the card,
any second red element.

## RTL and dark

Logical properties only; chevrons mirror; numbers and references isolated with `bdi`; Arabic labels
carry no letter-spacing and 1.6+ line height (board 66). Dark from the tokens' `.dark` values.
