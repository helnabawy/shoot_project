---
version: 1
slug: "not-found"
primary_target: "apps/web/src/app/(site)/[locale]/not-found.tsx"
related_targets: ["apps/web/src/modules/pages/components/NotFoundView.tsx", "apps/web/src/proxy.ts"]
---

# Not found and removed

## Scope and mode

Recover. One page for two cases: an address we cannot find, and an address that used to be a page or a guide. Feature 005 (US5).

## Audience, job, action

Someone who followed an old, mistyped or removed link. Job: understand what happened in a sentence and get somewhere useful. Primary action: "Start a brief"; then the guides (only when there are some) and WhatsApp (only when a number exists).

## Proof and constraints

The status is 404 with noindex in both cases; only the words differ. A draft's address looks exactly like an address that never existed. A failing lookup never turns a 404 into an error page.

## Direction contract

THESIS: Two quiet voices in the same column as the rest of the site, with the same three bar rows as next steps. No illustration, no joke, no search box.

DELIBERATELY ABSENT: illustrations, apologies, site search, a list of popular pages.

FINISH: the impeccable finish review (`ship`) and the documenter are still to run (task T095).
