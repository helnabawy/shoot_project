# Implementation Plan: Creator Profiles and Directory

**Branch**: `002-creator-profiles` | **Date**: 2026-11-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-creator-profiles/spec.md`

**Test-id prefix**: this feature's FR/US ids restart at 001, so tests are named
`CP-FR-004`, `CP-US1-S2` (CP = creator profiles) to stay unambiguous next to
feature 001's `FR-004`, `US1-S2`.

## Summary

Make providers visible. A provider completes a profile (per-language text,
specialties, cities, languages, up to 30 samples, social links) at
`/account/profile`; an admin publishes it in Payload, which is the
verification; only published, active, non-suspended profiles are public.
Visitors meet creators in a CMS-configured "Our network" landing block, a
filterable directory (`/creators`), a profile page (`/creators/{code}`) and
specialty pages with real sample and pro counts (`/work/{specialty}`).
"Book with this creator" opens a standalone brief page (`/book/{code}`) with
the creator fixed, so the landing page stays fully static.

The technical approach adds **one new feature module (`modules/creators`)** and
no new dependency. The review workflow uses **Payload drafts/versions**: a
provider's edits are saved as a draft while the last published version stays
public, and publishing is the admin's verification. The profile's *standing*
(pause, suspend, featured, review note, review dates) lives in a small
non-versioned `creator-listings` record, so it changes at once without ever
publishing unreviewed edits (research §18). Selection, filtering,
facet counts, ordering, code generation and form validation are pure functions
in `packages/domain/src/creators` (100% covered); the app reads one cached
list of lightweight public summaries and derives everything from it.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`), Node.js 24 LTS (unchanged from 001)

**Primary Dependencies**: unchanged (Next.js 16.4.3, React 19.2.6, Payload 3.93.0, next-intl 4.14.9, next-themes, Tailwind 4.3.5, zod 4.6.7, sharp). **No new package.** Video samples are links, so no player library; spoken-language names come from the platform's `Intl.DisplayNames`.

**Storage**: PostgreSQL 17 via the Payload adapter. One additive migration (`creator_profiles`): `creator_profiles` (+ locales, samples array, versions tables), `creator_listings`, `locations`, categories SEO fields, `media.uploaded_by`, `briefs.creator_id`, site-settings creator fields, the `creatorNetwork` landing block. No data loss, no backfill.

**Testing**: Vitest (unit for `packages/domain`, component, integration against Testcontainers PostgreSQL), Playwright (+ axe) for e2e, Lighthouse CI for `/creators` and the demo profile (`/creators/d2222`).

**Target Platform**: unchanged (Linux container, evergreen browsers + iOS Safari ≥ 16).

**Project Type**: Web application, existing pnpm monorepo; new module `apps/web/src/modules/creators/`, new domain folder `packages/domain/src/creators/`.

**Performance Goals**: same budgets as the landing page for `/creators`, `/creators/{code}`, `/work/{specialty}` (LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, Lighthouse ≥ 90). The landing page gains **0 KB of client JS** (the network block is a server component of plain links) and stays statically cached.

**Constraints**: public changes visible ≤ 60 s (tag revalidation, immediate in practice); WCAG 2.1 AA; en/ar with English fallback; light/dark; forms and filters work without JavaScript; no profession name in code (persona-extensibility); provider uploads limited to JPEG/PNG/WebP up to 5 MB, 30 samples per profile, 60 files per account, 20 uploads per account and 40 per visitor per hour; server action bodies up to 6 MB (research §15); no creators in the default seed (research §19).

**Scale/Scope**: designed for hundreds of public creators per instance, up to a few thousand before the cached-summary approach is revisited (research §3). Routes: `/creators`, `/creators/[code]`, `/work/[specialty]`, `/book/[code]`, `/account/profile` × 2 locales. 3 new collections (`creator-profiles`, `creator-listings`, `locations`), 1 new landing block, 1 site-settings tab, fields added to categories, media and briefs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Spec-Driven | Spec exists; decisions the spec left open are recorded in research.md; no `NEEDS CLARIFICATION` remains | PASS — see research §1–§14 |
| II. Performance budgets | Server components, cached summaries, sized webp variants, no player embeds, no client JS on landing | PASS by design — Lighthouse CI adds `/creators` and the demo profile (`/creators/d2222`) (quickstart) |
| III. Test-first | Every scenario mapped to a test layer in `quickstart.md`; domain at 100% | PASS by design — mapping table in quickstart |
| IV. Content in CMS | Network block copy/rule/count, code prefix, auto-publish switch, locations, specialty SEO text, creator text all CMS data; seed data is not a fallback (no demo creators outside local/test hosts) | PASS — `data-model.md`, research §19 |
| V. Modular monolith | One module; cross-module use only through `index.ts` (brief gains an optional creator reference; personas/categories read via their queries) | PASS — structure below |
| VI. Responsive, accessible, bilingual, themed | Verified at 4 widths × en/ar × light/dark; logical CSS; localized fields; message keys | PASS by design — Playwright `ar-mobile` and `dark` projects |
| VII. Secure by default | Explicit access on every new collection; providers cannot self-publish, self-feature, change code or touch others' profiles/uploads; moderation fields and the owner id never publicly readable; uploads bounded by type, size, per-account quota and hourly rate limits; URL validation at the boundary | PASS — access matrices in `data-model.md`, hook guard and field read access in research §4, listing state in §18, upload bounds in §6 |
| VIII. Simplicity | No new package; Payload drafts instead of a hand-built approval table; samples inline instead of a collection | PASS — 3 justified items below |
| IX. Designed, not generated | New surface briefs under `.impeccable/surfaces/`, impeccable craft floor + detector + finish review; no invented counts, ratings or testimonials (counts are real, hidden at zero) | PASS by design — tasks include shaping, finish review, DESIGN.md update |

**Post-Phase-1 re-check (2026-11-07)**: the data model adds no service and no
package; the only access broadening (providers may create `media`) is bounded
by file type, size, ownership and a cleanup job (research §6). All gates pass.

**Analysis remediation (2026-11-07)**: `/speckit-analyze` found three high
issues, now resolved in the design: (1) moderation flags stored on a
drafts-enabled profile would either be delayed or publish pending edits,
confirmed in Payload 3.93.0's `updateByID`; they move to the non-versioned
`creator-listings` collection (research §18, Complexity Tracking); (2)
private fields (`reviewNote`, owner id, review dates) are now unreadable by
the public by construction (research §4); (3) provider uploads gain a
per-account quota and per-account / per-visitor hourly limits reusing
`rate-limits` (research §6). Gates re-checked: all pass.

**Merge with the parallel plan (2026-11-07)**: a second 002 plan was written
in another worktree; this plan stays the base and takes eight changes from it
or from comparing them (research §19 merge record): the default seed creates
no creators (demo creators are opt-in and host-guarded), the server action
body limit is raised to 6 MB so photo uploads work, codes are stored without
the prefix, multi-type creators keep a choice of type when booked, only
listed creators are bookable, seeded emirate slugs match the brief's
location values, the summary cache entry is size-tested, and US4 gets
numbered scenarios. No new package, service or collection; gates re-checked:
all pass (Principle IX is now also met by the seed).

## Project Structure

### Documentation (this feature)

```text
specs/002-creator-profiles/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions, rationale, alternatives
├── data-model.md        # Phase 1: collections, fields, access, states, validation
├── quickstart.md        # Phase 1: setup + validation per story + scenario→test map
├── contracts/
│   ├── routes-and-actions.md  # public routes, server actions, cache tags, test ids
│   └── rest-api.md            # Payload REST surface and access results
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
packages/domain/src/creators/             # framework-free, 100% covered
├── code.ts              # generateCreatorCode(), normaliseCode(input), formatCreatorCode(prefix, code)
├── visibility.ts        # isPublic(profile), isListed(profile, activePersonaIds)
├── status.ts            # profileStatus(): draft | in-review | live | live-with-changes | suspended
├── selection.ts         # orderCreators, networkSelection(rule, count)
├── filter.ts            # filterCreators(filters), facetCounts(creators, filters)
├── samples.ts           # sample kind rules, video host allowlist, caps, specialtyCounts
├── languages.ts         # curated spoken-language codes (names via Intl.DisplayNames)
├── schemas.ts           # zod: profile form, sample, social links
└── index.ts

apps/web/src/
├── app/(site)/[locale]/
│   ├── creators/page.tsx                # directory (GET filters, counts)
│   ├── creators/[code]/page.tsx         # profile
│   ├── work/[specialty]/page.tsx        # specialty page with counts
│   ├── book/[code]/page.tsx             # brief builder with the creator fixed (bookable creators only)
│   └── account/profile/page.tsx         # provider's "My profile" (+ samples)
├── modules/creators/
│   ├── collections/{CreatorProfiles,CreatorListings,Locations}.ts
│   ├── hooks.ts             # assign user + code, force-draft guard, create listing, verifiedAt on publish, revalidate
│   ├── queries.ts           # getPublicCreators(locale), getCreatorByCode, getSpecialtyPage, getMyProfile
│   ├── actions.ts           # saveMyProfile, addSample, removeSample, reorderSamples, submitForReview, setActive
│   ├── components/{CreatorCard,CreatorGrid,DirectoryFilters,ProfileView,SampleGallery,
│   │               SpecialtyHeader,ProfileForm,SampleManager,StatusBanner}.tsx
│   └── index.ts
├── modules/landing/blocks/CreatorNetwork.ts           # block schema (heading, rule, count, cta)
├── modules/landing/components/sections/CreatorNetwork.tsx
├── modules/brief/ (edit)    # Briefs.creator, submit/parse accept creator code, {creator} placeholder
├── modules/media/collections/Media.ts (edit)          # uploadedBy, provider create access, type/size/quota/rate limits
├── shared/payload/rate-limit.ts (new, from brief/limits.ts)  # consumeAllowance(req, key, limit); brief keeps a wrapper
├── modules/personas/collections/Categories.ts (edit)  # localized seo group
├── modules/site-settings/globals/SiteSettings.ts (edit)  # "Creators" tab
├── app/sitemap.ts (edit)    # creators and specialty pages with alternates
├── shared/payload/seed/     # locations, code prefix, category SEO, landing block; demo-creators.ts (opt-in, host-guarded, research §19)
├── migrations/<ts>_creator_profiles.{ts,json}
└── payload.config.ts (edit) # register collections

apps/web/messages/{en,ar}.json          # creators.* namespace
apps/web/tests/{integration,e2e,fixtures}   # creators-*.int.test.ts, cp-us1…us4 specs
.impeccable/surfaces/                   # creators, profile, provider-profile briefs
```

**Structure Decision**: one new module `modules/creators` following the 001
module layout, plus one domain folder. Existing modules are edited only at
their seams (brief gets an optional creator, media gets provider uploads,
categories get SEO text, landing gets one block); nothing reaches into another
module's internals.

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|-------------------------------------|
| `locations` collection (emirate → city) | FR-004 filters by emirate, profiles list cities; both are CMS data (Principle IV) and must be bilingual | A text field per profile cannot be filtered or counted; a code constant breaks Principle IV; reusing the brief's location option set couples two features (revisit in 003) |
| Providers may create `media` (bounded) | Providers upload their own samples (FR-001) without admin help | A separate provider-media collection duplicates upload config, sizes and S3 setup; unbounded access is rejected by file type, size, ownership and cleanup (research §6) |
| Payload drafts/versions on `creator-profiles` | US3-S3: public keeps the last verified version while edits await approval | A hand-built "pending copy" table is more code and more bugs than the platform primitive already pinned in the stack |
| `creator-listings` collection (1:1 with a profile, not versioned) | Pause, suspend and feature must take effect at once, and admin notes must stay private; on a drafts-enabled collection every immediate update publishes the latest draft (verified in Payload 3.93.0 `updateByID`), research §18 | Flags on the profile (delayed or a moderation bypass); flags on `users` (private collection, misplaced admin fields, cross-collection access clauses); direct `db.updateOne` writes (skip hooks and are overwritten by the next publish) |
