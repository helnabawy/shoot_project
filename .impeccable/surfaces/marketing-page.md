---
version: 1
slug: "marketing-page"
primary_target: "apps/web/src/app/(site)/[locale]/[slug]/page.tsx"
related_targets: ["apps/web/src/modules/pages/components/PageView.tsx", "apps/web/src/modules/landing/components/RenderBlocks.tsx", "apps/web/src/shared/components/Footer.tsx", "apps/web/src/shared/ui/RichContent.tsx"]
---

# Editor-built page (Studios, About, anything later)

## Scope and mode

Inform. A page an editor builds from the landing page's sections: one `h1`, then the sections. Feature 005 (US1). Inherits The Brief Bar; nothing here introduces a new component. The footer gains the editor's groups and the three legal links.

## Audience, job, action

A visitor who followed a link (footer, search, WhatsApp) to read something about the service. Job: get the answer and carry on. Primary action: whatever the page's own call-to-action section offers, normally "Start a brief" (the brief lives on the home page, so the link goes there) with "WhatsApp us" beside it. A page without a call to action has no action: it is information.

## Proof and constraints

Only what the editor wrote. The seed ships one page (Studios) that states what the service does today and names no studio, price or photo. No stock imagery, no "trusted by", no counts. Budgets as the landing page: server-rendered, no client JavaScript added. EN/AR with RTL and per-language addresses; light and dark.

## Build notes (2026-11-07)

- The title is a Headline-size `h1` in the 680 px reading column; sections follow unchanged, so a page and the home page read as one site.
- Long text goes through one renderer (`RichContent`): 65 ch measure, quiet heading scale, links underlined, external links open safely, images carry their alt.

## Direction contract

THESIS: A page is the landing page without the brief on top: the same ground, the same column, the same section rhythm. It refuses the template tells (hero image with a headline over it, a row of three icon cards) because the content decides the layout, not the page type.

STATES: draft preview shows the preview bar; a page with no sections shows only its title; an Arabic reader without Arabic text sees the English text (marked by the language, not a banner).

DELIBERATELY ABSENT: hero imagery, breadcrumbs, "last updated", share buttons, related-page carousels, newsletter boxes.

FINISH: the impeccable finish review (`ship`) and the documenter are still to run for this surface (tasks T037); captures at 360 and 1440 px in en/ar and light/dark.
