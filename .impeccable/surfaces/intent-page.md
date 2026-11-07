---
version: 1
slug: "intent-page"
primary_target: "apps/web/src/app/(site)/[locale]/hire/[slug]/page.tsx"
related_targets: ["apps/web/src/modules/pages/components/IntentView.tsx", "apps/web/src/modules/brief/components/BriefBuilder.tsx", "apps/web/src/modules/brief/preset.ts"]
---

# Intent page: "Hire a proposal photographer in Dubai"

## Scope and mode

Convert. `/hire/{slug}`: the brief builder opened with the answers the page is about, then who can do it, the questions people ask and the editor's sections. Feature 005 (US4). Inherits The Brief Bar and `/book/{code}`'s structure.

## Audience, job, action

A visitor who searched for exactly this job. Job: describe it and get a reply. Primary action: the brief, which already carries the page's answers (still changeable). Nothing on the page competes with it.

## Proof and constraints

Real creators only (listed ones that fit the page; the count appears only when above zero). The FAQ is the editor's real answers and becomes structured data. No testimonials, prices, ratings or invented availability. If an answer the page presets no longer exists (a persona switched off), that step is simply open.

## Build notes (2026-11-07)

- Same column as `/book/{code}`: `h1`, one short intro, the builder; the creator strip uses the directory's rows; the FAQ is a definition list between hairlines.
- The builder gets a `preset` prop (answered, changeable) distinct from `locked`.

## Direction contract

THESIS: The page is the brief with a headline: one panel, one action, the proof below it.

DELIBERATELY ABSENT: a hero image, a second call to action above the brief, "as seen in" strips, star ratings, countdowns.

FINISH: the impeccable finish review (`ship`) and the documenter are still to run (task T088).
