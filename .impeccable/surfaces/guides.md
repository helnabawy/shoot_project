---
version: 1
slug: "guides"
primary_target: "apps/web/src/app/(site)/[locale]/guides/page.tsx"
related_targets: ["apps/web/src/modules/guides/components/ArticleCard.tsx", "apps/web/src/modules/guides/components/ArticleView.tsx", "apps/web/src/modules/guides/components/Pagination.tsx", "apps/web/src/modules/guides/components/CategoryNav.tsx"]
---

# Guides: listing, topics, authors and the article

## Scope and mode

Inform, then convert. `/guides`, `/guides/category/{slug}`, `/guides/author/{slug}`, `/guides/{slug}` and the feed. Feature 005 (US3).

## Audience, job, action

A client who is not ready to brief yet and wants to know how. Job: get a plain answer, then know what to do next. Primary action on an article: the "Ready to brief?" panel at its end (Start a brief; WhatsApp us as the second row). The list has no action beyond reading.

## Proof and constraints

Real authors and real dates only; no ratings, comment counts or view counts. Cover images carry alt text from the media record. Twelve to a page, newest first, paging by plain links. Guides without text in the reader's language are shown in English and marked "Available in English". A scheduled guide does not exist for visitors until its time.

## Build notes (2026-11-07)

- Rows, not cards: topic and date as meta, the title as the link (the whole row is clickable), the summary, a 112 px cover on the end side from 640 px (hidden on phones so the title leads).
- Topics are a row of links with the current one selected; the article ends with the next-step panel, then up to three related guides in the same row style.

## Direction contract

THESIS: A guide reads like a note in the same world as the brief: quiet rows on the ground, one column, one next step. It refuses the blog template (card grid with large covers, "read more" buttons, newsletter signup, share bar).

DELIBERATELY ABSENT: card grids, carousels, comment sections, newsletter boxes, tag clouds, reading-progress bars.

FINISH: the impeccable finish review (`ship`) and the documenter are still to run (task T075).
