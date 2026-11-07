# Quickstart & Validation: Creator Profiles and Directory

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/) | **Model**: [data-model.md](data-model.md)

## Prerequisites

Everything from feature 001's quickstart (Node 24 via `nvm use`, pnpm,
Docker, `apps/web/.env`). One new optional seed-only variable,
`SEED_DEMO_CREATORS` (research §19).

## Setup and run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter web payload migrate   # includes the creator_profiles migration
pnpm --filter web seed              # adds locations, code prefix, category SEO, the network block — no creators
SEED_DEMO_CREATORS=1 pnpm --filter web seed   # local/e2e only: demo creators D2222…D8888 (refused on non-local hosts)
pnpm --filter web dev               # http://localhost:3000
```

## Manual walk-through (five minutes)

0. Without the demo seed, `/` shows no network block and `/creators` shows its
   honest empty state (nothing invented). Then load the demo seed.
1. `/` shows the "Our network" block with the demo verified creators (not the
   unverified, paused or sample-less ones) and a link to the directory.
2. `/creators`: filter by professional type, specialty and emirate; each option
   shows a count; the list narrows; clear the filters to reset.
3. Open a card (`/creators/d2222`, shown as `CR-D2222`): samples gallery,
   specialties, cities, languages, verified badge. `/creators/CR-D2222` and
   `/creators/xx-d2222` redirect to `/creators/d2222`. "Book with this creator"
   opens `/book/d2222` with the creator chip and the professional step already
   answered; on the multi-type creator the step lists only its types. Send
   the brief and check the WhatsApp text names the creator. Change the code
   prefix in Site settings: every displayed code follows.
4. `/work/<specialty>`: intro, "N samples · M pros", sample grid, creators.
5. Sign in as a provider (register with "I'm a …"), open `/account/profile`,
   fill the form, add samples (include a 4 MB photo: accepted; a 6 MB one:
   refused with the size message), press **Submit for review**. In `/admin` open
   Creator listings → **Awaiting review**, follow it to the profile and press
   **Publish**: the profile is on `/creators` within seconds. Edit it as the
   provider: the public page keeps the old text until you publish again (or
   turn on Site settings → Creators → *Publish edits immediately*). With that
   edit still pending, tick **Suspended** on the listing: the profile
   disappears at once and the pending text is still unpublished. Untick it,
   then pause the profile as the provider: it disappears at once too.
6. Repeat 1–4 at `/ar`, in dark theme, at 360 px.

## Automated validation (what CI runs)

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage                  # domain 100 %, app ≥ 80 %
pnpm --filter web build
pnpm test:e2e -- --grep @smoke      # adds cp-us1…cp-us4 specs
npx @lhci/cli autorun               # adds /creators, /creators/d2222, a specialty page (en, ar, light, dark); runs on the demo seed
```

## Scenario → test mapping (Principle III)

Test names start with the id in the first column.

| Id | Layer | Test file |
|----|-------|-----------|
| CP-US1-S1 landing block shows ≤ N by rule, link to directory | integration (selection + query), component, e2e | `domain/creators/selection.test.ts`, `creators-landing.int.test.ts`, `CreatorNetwork.test.tsx`, `cp-us1-directory.spec.ts` |
| CP-US1-S2 filters narrow, featured-then-newest order, counts per filter | unit, component, e2e | `domain/creators/filter.test.ts`, `DirectoryFilters.test.tsx`, `cp-us1-directory.spec.ts` |
| CP-US1-S3 unverified/deactivated never appear on any page | integration (access + queries + sitemap), e2e | `creators-access.int.test.ts`, `creators-visibility.int.test.ts`, `cp-us1-directory.spec.ts` |
| CP-US2-S1 gallery: alt text, lazy loading, sized variants | component, e2e (axe, network) | `SampleGallery.test.tsx`, `cp-us2-profile.spec.ts` |
| CP-US2-S2 "Book with this creator" fixes creator and type | integration (`submitBrief` + creator), component, e2e | `creators-brief.int.test.ts`, `BriefBuilder.creator.test.tsx`, `cp-us2-profile.spec.ts` |
| CP-US3-S1 provider edits every field, uploads, per-language text | unit (schemas), component, integration, e2e | `domain/creators/schemas.test.ts`, `ProfileForm.test.tsx`, `creators-actions.int.test.ts`, `cp-us3-provider.spec.ts` |
| CP-US3-S2 admin publish → public ≤ 60 s; unpublish hides | integration, e2e | `creators-verification.int.test.ts`, `cp-us3-provider.spec.ts` |
| CP-US3-S3 edits stay draft until re-approved, or publish at once by setting | integration (incl. REST bypass attempt) | `creators-verification.int.test.ts` |
| CP-FR-002 pause / suspend / feature take effect at once and never publish pending edits | integration | `creators-listings.int.test.ts` |
| CP-FR-002 private fields (`reviewNote`, owner id, review dates) never readable by the public or other providers | integration (REST) | `creators-access.int.test.ts` |
| CP-US4-S1 specialty page lists creators/samples with real counts | unit, integration, e2e | `domain/creators/samples.test.ts`, `creators-specialty.int.test.ts`, `cp-us4-specialty.spec.ts` |
| CP-US4-S2 reachable from the landing grid; per-language SEO text | component, e2e | `CategoriesGrid.test.tsx`, `cp-us4-specialty.spec.ts` |
| CP-FR-001 provider-only create, one per user | integration | `creators-access.int.test.ts` |
| CP-FR-002 verification state and visibility | unit, integration | `domain/creators/visibility.test.ts`, `domain/creators/status.test.ts`, `creators-verification.int.test.ts` |
| CP-FR-003 editor rule and count | unit, integration | `selection.test.ts`, `creators-landing.int.test.ts` |
| CP-FR-007 stable code, prefix from CMS (display only), immutable, any spelling resolves, canonical redirect | unit, integration, e2e | `domain/creators/code.test.ts`, `creators-code.int.test.ts`, `cp-us2-profile.spec.ts` |
| CP-US2-S2 multi-type creator: step lists only its types; persona outside them rejected; unlisted creator not bookable | component, integration | `BriefBuilder.creator.test.tsx`, `creators-brief.int.test.ts` |
| CP-FR-008 4 MB upload accepted through the server action (body limit) | integration, e2e | `creators-actions.int.test.ts`, `cp-us3-provider.spec.ts` |
| Honesty: default seed creates no creators or provider accounts; demo seed refused on non-local hosts | integration | `seed.int.test.ts` |
| Directory summary list < 1.5 MB at 2 000 creators | unit | `modules/creators/summary.test.ts` |
| CP-FR-008 sample alt, variants, upload limits | integration, e2e | `creators-uploads.int.test.ts`, `cp-us2-profile.spec.ts` |
| CP-FR-009 new persona gets profiles with no code change | integration, e2e | `creators-persona.int.test.ts` |
| CP-FR-010 en/ar, RTL, light/dark, 360–1440 px, budgets | e2e (`ar-mobile`, `dark`), Lighthouse CI | all `cp-*.spec.ts`, `lighthouserc.json` |
| Edge: no samples → "awaiting samples", never featured | unit, component | `selection.test.ts`, `ProfileView.test.tsx` |
| Edge: creator pauses profile → 404 at once, briefs keep reference | integration | `creators-visibility.int.test.ts`, `creators-listings.int.test.ts` |
| Edge: persona deactivated → direct link works, not listed | unit, integration | `visibility.test.ts`, `creators-persona.int.test.ts` |
| Edge: oversize/invalid upload rejected with message | integration, component | `creators-uploads.int.test.ts`, `SampleManager.test.tsx` |
| CP-FR-008 upload quota (60 per account) and hourly limits (20 per account, 40 per visitor) | unit, integration | `shared/payload/rate-limit.test.ts`, `creators-uploads.int.test.ts` |
| Edge: JS disabled filters, profile form, book page | e2e (`nojs` project) | `cp-us1-directory.spec.ts`, `cp-us3-provider.spec.ts` |

## Success criteria checks

- **SC-001** (30 s to find a creator): scripted Playwright path
  landing → directory → filter → profile, asserted at ≤ 5 interactions;
  manual timing with three people recorded in `usability.md` style notes.
- **SC-002**: Lighthouse CI budgets on `/creators`, the demo profile `/creators/d2222` and a specialty page.
- **SC-003**: manual timing of the provider form (≤ 10 min) and admin
  verification (≤ 2 min), recorded after the first build.
- **SC-004**: this table; CI fails when a listed test file is missing
  (a small script in `scripts/` checks test names against the table).
