# Quickstart & Validation: Marketing, Legal and SEO Pages

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/routes.md](contracts/routes.md) | **Model**: [data-model.md](data-model.md)

## Prerequisites

Everything from feature 001's quickstart (Node 24 via `nvm use`, pnpm, Docker,
`apps/web/.env`). One new optional seed-only variable, `SEED_DEMO_GUIDES`
(research R10): demo authors, categories, articles and intent pages, refused
on non-local hosts like `SEED_DEMO_CREATORS`.

## Setup and run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter web payload migrate      # includes the marketing_pages migration
pnpm --filter web seed                 # footer group, Studios page, legal documents (v1)
SEED_DEMO_GUIDES=1 SEED_DEMO_CREATORS=1 pnpm --filter web seed   # local/e2e only
pnpm --filter web dev                  # http://localhost:3000
```

## Manual walk-through (ten minutes)

1. **Page (US1)**: in `/admin` → Pages create "Studios" (en + ar), add a
   heading section and a text section, place it in the footer group
   "Company", save as draft: `/studios` is the not-found page; press
   **Preview**: the draft shows with the preview bar. Publish: `/studios` and
   `/ar/<arabic-slug>` render, the footer lists it, `/sitemap.xml` lists it
   with both alternates. Rename its English slug: the old address redirects
   permanently. Try the slug `login`: refused naming the conflict. Delete the
   page: the footer link disappears and the old address shows the "removed"
   wording.
2. **Legal (US2)**: the footer links Terms, Professional Terms and Privacy at
   `/terms`, `/terms/professional`, `/privacy` (and `/ar/…`). Register an
   account: the checkbox states acceptance with links; unticked is refused;
   in `/admin` → Legal acceptances the new account has rows (terms, privacy;
   plus professional terms for a provider). Add version 2 of the Terms with a
   future effective date: `/terms` still shows version 1 and announces "applies
   from {date}"; change the date to the past: version 2 shows within a minute;
   `/terms/versions` lists both. Try to publish a row ticked *Placeholder*:
   refused.
3. **Guides (US3)**: `/guides` lists the demo articles newest first, 12 per
   page, category links filter, `/guides/<slug>` shows author, date, reading
   time, related guides and the brief/WhatsApp call to action. Set an article's
   `publishedAt` one minute ahead: absent from the listing, feed and sitemap
   until the time passes (≤ 60 s after). `/guides/feed` and `/ar/guides/feed`
   are valid RSS (the Arabic feed lists only articles with Arabic text).
4. **Intent page (US4)**: open `/hire/proposal-photographer-dubai` (demo): the
   brief bar shows the preset answers (change them freely), up to six matching
   creators with real counts, the FAQ, and JSON-LD for `FAQPage` and `Service`
   (view source or Rich Results Test). Disable the preset persona in `/admin`:
   the page still renders with that step open, and the editor sees the warning
   when saving.
5. **Not found (US5)**: `/nope`, a draft's address, and a deleted page's
   address all return the designed page with a 404 status; only the last says
   "removed".
6. Repeat 1–5 at `/ar`, in dark theme, at 360 px.

**Launch checklist**: all three legal documents have a published version
without the *Placeholder* tick, reviewed by counsel; footer groups defined; the
Studios page and guides contain real copy only (no invented proof).

## Automated validation (what CI runs)

```bash
pnpm typecheck
pnpm lint
pnpm check:scenarios               # runs for 002 and 005 (prefix per quickstart)
pnpm test:coverage                 # domain 100 %, app ≥ 80 %
pnpm --filter web build
pnpm test:e2e -- --grep @smoke     # adds mp-us1…mp-us5 specs
npx @lhci/cli autorun              # adds /terms, /guides, a guide, /hire/…, /studios (en, ar, light, dark)
```

## Scenario → test mapping (Principle III)

Test names start with the id in the first column.

| Id | Layer | Test file |
|----|-------|-----------|
| MP-US1-S1 published page reachable in both languages ≤ 60 s, in sitemap | integration, e2e | `pages-routes.int.test.ts`, `mp-us1-pages.spec.ts` |
| MP-US1-S2 draft invisible to the public, previewable by editors | integration, e2e | `pages-access.int.test.ts`, `mp-us1-pages.spec.ts` |
| MP-US1-S3 English fallback in Arabic; the two languages' addresses lead to each other | integration, e2e | `pages-routes.int.test.ts`, `mp-us1-pages.spec.ts` |
| MP-US1-S4 placement updates header/footer in both languages | unit, integration, component | `domain/pages/navigation.test.ts`, `pages-navigation.int.test.ts`, `server-components.test.tsx` |
| MP-US1-S5 reserved, malformed or duplicate address refused | unit, integration | `domain/pages/slug.test.ts`, `pages-slug.int.test.ts` |
| MP-US1-S6 delete removes links, marks the address removed, drops it from the sitemap | integration | `pages-removed.int.test.ts` |
| MP-FR-003 rename keeps a permanent redirect | integration | `pages-slug.int.test.ts` |
| MP-US2-S1 legal pages linked from footer at stable addresses | integration, e2e | `legal-routes.int.test.ts`, `mp-us2-legal.spec.ts` |
| MP-US2-S2 registration states acceptance, refuses without it, records versions | unit, component, integration, e2e | `domain/auth/schemas.test.ts`, `forms.test.tsx`, `legal-acceptance.int.test.ts`, `mp-us2-legal.spec.ts` |
| MP-US2-S3 future effective date; new version takes over without an editor action | unit, integration | `domain/pages/legal.test.ts`, `legal-versions.int.test.ts` |
| MP-US2-S4 earlier versions readable, never overwritten | integration, e2e | `legal-versions.int.test.ts`, `mp-us2-legal.spec.ts` |
| MP-US2-S5 Arabic fallback notice, English governs | component, integration | `LegalView.test.tsx`, `legal-routes.int.test.ts` |
| MP-FR-006 placeholder cannot publish; published rows immutable for editors | unit, integration | `domain/pages/legal.test.ts`, `legal-access.int.test.ts` |
| MP-FR-018 legal and acceptances access matrix | integration (REST) | `legal-access.int.test.ts` |
| MP-US3-S1 listing newest first, 12 per page, prev/next without JS, category filter | unit, integration, component, e2e (`nojs`) | `domain/pages/articles.test.ts`, `guides-queries.int.test.ts`, `Pagination.test.tsx`, `mp-us3-guides.spec.ts` |
| MP-US3-S2 future article absent everywhere then appears ≤ 60 s | unit, integration | `domain/pages/articles.test.ts`, `guides-scheduling.int.test.ts` |
| MP-US3-S3 article shows author, date, reading time, cover alt, related, CTA | unit, component, e2e | `domain/content/richtext.test.ts`, `ArticleView.test.tsx`, `mp-us3-guides.spec.ts` |
| MP-US3-S4 valid feed of 20 live articles per language | unit, integration | `domain/pages/feed.test.ts`, `guides-feed.int.test.ts` |
| MP-US3-S5 Arabic RTL; English fallback marked and excluded from the Arabic feed | integration, e2e (`ar-mobile`) | `guides-feed.int.test.ts`, `mp-us3-guides.spec.ts` |
| MP-US3-S6 author page lists their guides | integration, e2e | `guides-queries.int.test.ts`, `mp-us3-guides.spec.ts` |
| MP-US4-S1 builder opens with preset answers, still changeable | unit, component, e2e | `modules/brief/preset.test.ts`, `BriefBuilder.preset.test.tsx`, `mp-us4-intent.spec.ts` |
| MP-US4-S2 disabled preset dropped at render, warned at save | unit, integration | `modules/brief/preset.test.ts`, `pages-intent.int.test.ts` |
| MP-US4-S3 FAQ and Service structured data, unique metadata, alternates | unit, integration, e2e | `domain/pages/structured-data.test.ts`, `pages-intent.int.test.ts`, `mp-us4-intent.spec.ts` |
| MP-US4-S4 up to six matching creators, none → section omitted | integration, component | `pages-intent.int.test.ts`, `IntentView.test.tsx` |
| MP-US4-S5 duplicate preset warning | unit, integration | `domain/pages/intent.test.ts`, `pages-intent.int.test.ts` |
| MP-US4-S6 sitemap lists specialty and intent pages once each | integration | `pages-intent.int.test.ts` |
| MP-US5-S1 unknown address: designed not-found, localised, 404, noindex | component, e2e | `NotFoundView.test.tsx`, `mp-us5-notfound.spec.ts` |
| MP-US5-S2 deleted page/article: "removed" wording, 404, noindex | integration, e2e | `pages-removed.int.test.ts`, `mp-us5-notfound.spec.ts` |
| MP-US5-S3 draft address identical to unknown address | integration | `pages-access.int.test.ts` |
| MP-FR-013 metadata, canonical, alternates and sitemap entries per language | unit | `seo.test.ts`, `seo-routes.test.ts` |
| MP-FR-015 long-form text never renders raw HTML or unsafe links | component | `RichContent.test.tsx` |
| MP-FR-016 publish visible ≤ 60 s (tags) and time-based pages revalidate | integration | `pages-routes.int.test.ts`, `guides-scheduling.int.test.ts` |
| MP-FR-017 en/ar, RTL, light/dark, 360–1440 px, budgets | e2e (`ar-mobile`, `dark`), Lighthouse CI | all `mp-*.spec.ts`, `lighthouserc.json` |
| Honesty: default seed creates no articles, authors or intent pages; demo seed refused on non-local hosts; production seed never publishes placeholder legal text | integration | `seed.int.test.ts` |
| Edge: zero sections refused at publish; footer/header limits | unit, integration | `domain/pages/navigation.test.ts`, `pages-navigation.int.test.ts` |
| Edge: category/author in use cannot be deleted; empty ones unlisted | integration | `guides-guards.int.test.ts` |

## Success criteria checks

- **SC-001**: scripted Playwright path (create a bilingual page through the
  admin UI with seeded editor credentials, publish, see it live) asserted
  under a time budget; manual timing with an editor recorded in `usability.md`.
- **SC-002**: Lighthouse CI budgets on the routes above, mobile, light and dark.
- **SC-003**: `legal-versions.int.test.ts` (new version live ≤ 60 s) and
  `legal-acceptance.int.test.ts` (every created account has its rows).
- **SC-004**: `guides-scheduling.int.test.ts` with a pinned clock.
- **SC-005**: manual timing of an intent page build, recorded; e2e asserts the
  brief submits from `/hire/…` in the same number of steps as from `/`.
- **SC-006**: this table, enforced by `pnpm check:scenarios` (prefix `MP-`).
