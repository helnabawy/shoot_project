# Research: Creator Profiles and Directory

Decisions for everything the spec left open or the stack could answer two ways.
Format: **Decision / Rationale / Alternatives**. Items marked **Verify first**
rest on Payload behaviour that tasks.md proves with an integration test before
anything is built on it.

## 1. Where creators live: one `creator-profiles` collection, separate from `users`

**Decision**: a new collection `creator-profiles`, one document per provider
user (`user` relationship, unique), holding everything public. `users` keeps
its account fields (`accountType`, `persona`, `categories`, `phone`).

**Rationale**: `users` is readable only by self/admin (FR-024 in 001) and must
stay private; the public profile needs different access, drafts/versions,
localisation and a code. Mixing them would put public fields behind a private
collection or loosen user access.

**Alternatives**: extend `users` (rejected: access model conflict, versions on
a credentials collection); one profile per persona per user (rejected:
spec says "professional types", one profile, one code).

## 2. Verification is "publish": Payload drafts decide what is public

**Decision**: `creator-profiles` enables `versions.drafts` and holds only the
**content** (text, types, specialties, places, languages, photo, samples,
links). Provider saves create draft versions; the published version is what
the public sees. **An admin publishing the profile is the verification;
unpublishing is un-verifying.** Everything that must change *immediately*
and must never publish pending content (the provider's pause switch,
`suspended`, `featured`, `reviewNote`, `submittedAt`, `verifiedAt`) lives in a
separate, non-versioned `creator-listings` record, one per profile (§18).
Public means `profile._status = published AND listing.active AND NOT
listing.suspended`. The provider-facing status is derived (`status.ts`) from
both: `draft` → `in-review` → `live` → `live-with-changes` (a newer draft than
the published version) / `paused` / `suspended`. State table in
`data-model.md`.

**Rationale**: US3-S2/S3 ("verified appears within 60 s, un-verifying hides
it, public shows the last verified version until re-approved") is exactly the
drafts model. One admin screen shows the whole profile including samples, so
verification stays under SC-003's two minutes. Unpublishing in Payload is
"un-verify".

**Verify first**: (a) `find` without `draft: true` returns only the published
state of a profile that has a newer draft; (b) a never-published profile is
excluded by the `_status` access clause; (c) owner `findByID` with
`draft: true` sees their latest draft; (d) localized fields round-trip through
draft → publish; (e) regression guard for §18: a non-draft update of a
profile that has a newer draft publishes that draft's content (if Payload
ever changes this, §18 can be simplified, not removed silently). Failing
(a)–(d) changes this section, not the plan's shape.

**Alternatives**: a `verification` enum plus separate "pending edits" JSON
(two sources of truth, hand-built diff UI); a second `creator-profile-edits`
collection (more access rules, merge step); per-locale publish status
(`localizeStatus`, rejected: reviewers verify the whole profile once).

## 3. Reads: one cached list of public summaries; filters and counts are pure domain code

**Decision**: `getPublicCreators(locale)` runs one Payload `find` (depth 1,
`select` limited to card fields plus the ids needed for filters and sample
categories), tagged `creators`, `media`, `categories`, `personas`,
`locations`, and returns lightweight `CreatorSummary` records. Directory
filtering, facet counts, ordering, the landing selection and the specialty
sample counts are computed from that list by the pure functions in
`packages/domain/src/creators` (`filterCreators`, `facetCounts`,
`orderCreators`, `networkSelection`, `specialtyCounts`).

**Rationale**: counts per filter ("43 pros") and per specialty ("428 samples")
are the hard part of the spec; Payload cannot count array rows or facets in one
query. Doing it over a cached list is simple, testable at 100% in the domain
package, and fast at the planned scale (hundreds of profiles, ≤ 30 sample rows
each, only ids selected).

**Revisit when**: public creators exceed ~3 000 or the summary payload exceeds
~1 MB per locale. The hard ceiling is Next's data-cache limit of 2 MB per
entry (`unstable_cache` refuses larger items and the read silently stops
being cached); an integration test builds 3 000 summaries and asserts the
serialised list stays under 1.5 MB (merge, §19). The upgrade path is materialised counts per specialty/city
written by the profile `afterChange` hook; the domain function signatures stay
the same.

**Alternatives**: SQL aggregates through Drizzle (bypasses Payload, loses
access control and localisation, couples to schema); a separate samples
collection (rejected in §5); search engine (new service, Principle VIII).

## 4. Providers can never publish themselves

**Decision**: on `creator-profiles`, `user` and `code` are set by a
`beforeValidate` hook and are immutable afterwards (field `access.update`
denies everyone; the hook rejects changes). A `beforeChange` hook forces
`_status = 'draft'` for every non-editor write unless the site setting
`autoPublishEdits` is on **and** the profile's listing already has
`verifiedAt`. The hook runs on REST as well as server actions, so a provider
cannot skip review by calling `PATCH /api/creator-profiles/:id?draft=false`.
The moderation flags are not on the profile at all (§18); on
`creator-listings` every field except `active` is admin-write, and the
collection is never publicly readable.

**Private fields are not readable by the public**: the profile's `user`
relationship has field-level `access.read` limited to editors and the owner
(the public REST response omits it). `reviewNote`, `submittedAt`,
`suspended`, `featured` and `verifiedAt` live on `creator-listings`, whose
collection `read` is editors plus the owner only, so no anonymous or
other-provider request can see them. Public pages get `featured` and
`verifiedAt` through server-side Local API reads, never through REST.

**Rationale**: Principle VII; the guard must live in the collection, not in
the UI.

**Alternatives**: trusting the server action (bypassed by REST); disabling
REST updates for providers (breaks the admin-style tooling and future clients).

## 5. Samples are an array inside the versioned profile, not a collection

**Decision**: `samples` is an array field (max 30) of `{ kind: image | video,
image (upload → media), videoUrl, caption (localized), category, order }`.
Order is the array order.

**Rationale**: samples then ride the same draft/publish cycle (a verified
creator cannot add an unreviewed sample that goes live at once), the admin
reviews one document, and the 30-row cap is a single `maxRows`.

**Cost**: Payload cannot query array rows, so specialty pages load the public
profiles that contain the specialty and read the rows in code (§3). Accepted.

**Alternatives**: `creator-samples` collection (needs its own approval flag,
per-sample moderation UI, join queries); JSON column (loses validation and
localisation).

## 6. Provider uploads reuse `media`, bounded

**Decision**: `media` gains `uploadedBy` (relationship to `users`, set by a
hook). Access: create → editors **or** provider accounts; update/delete →
editors or the uploader; read stays public. For non-editors a `beforeChange`
hook rejects anything other than JPEG, PNG or WebP and files over 5 MB, and
requires the localized `alt` (already required). The existing `thumbnail`,
`card` and `hero` webp variants satisfy FR-008. The existing cron cleanup
(`/api/cron/cleanup`) also deletes provider-uploaded media not referenced by
any profile after 24 hours.

**Quotas and rate limits** (registration is open to anyone, so provider
access must be bounded per account *and* per visitor): in the same
`beforeChange` hook, a non-editor upload is refused when
- the account already owns **60** media files (`uploadedBy = user`; 30
  samples + photo + slack for replacements; at most 60 × 5 MB = 300 MB per
  account) → `media.upload.quota`;
- the account has uploaded **20** files in the last hour → `media.upload.tooMany` (429);
- the visitor key (cookie or IP, the existing `visitorKey`) has uploaded
  **40** files in the last hour across accounts → `media.upload.tooMany` (429).

The hourly counters reuse the `rate-limits` collection: `consumeBriefAllowance`
in `modules/brief/limits.ts` is generalised into
`consumeAllowance(req, key, limit)` in `shared/payload/rate-limit.ts`
(brief keeps a thin wrapper, so its behaviour and tests are unchanged), keyed
`upload:user:<id>` and `upload:visitor:<key>`. The numbers are constants in
`samples.ts`, not settings: they protect the system, not the product. The
24-hour orphan cleanup also deletes the files that count against the quota
once they are unreferenced.

**Rationale**: reuses the upload pipeline, S3 storage and image sizes that
already exist; the type, size, quota and rate bounds make the access
broadening safe.

**Known limit**: media files are served from a public path, so an image of an
unreviewed profile is fetchable by anyone who has its URL. Filenames are not
guessable and nothing links to them until publication; acceptable for
portfolio images, documented in the profile form ("images you upload may be
reachable by direct link").

**Alternatives**: a second collection with private storage (duplicates
config, signed URLs, more moving parts).

## 7. Video samples are links with a poster, not embeds

**Decision**: a video sample stores an https URL on an allowlist of hosts
(`youtube.com`, `youtu.be`, `vimeo.com`, in `samples.ts`) and a required
poster image. The gallery shows the poster with a play mark and opens the URL
in a new tab (`rel="noopener noreferrer"`).

**Rationale**: no third-party iframe or script on first paint (Principle II),
no player package, no cookie banner, works without JavaScript. Spec only asks
for "optional video links".

**Alternatives**: click-to-load iframe facade (more JS, third-party cookies,
CLS risk); uploaded video files (storage and transcoding scope).

## 8. Creator code: stored without the prefix, shown as `PREFIX-XXXXX`

**Decision** (amended in the merge, §19): the stored `code` is **5
characters** from the same unambiguous alphabet as brief references (no
0/O/1/I/L), generated once at creation by a `beforeValidate` hook (retries on
collision, unique indexed) and then immutable. It is **displayed** as
`{prefix}-{code}` (e.g. `CR-7K4Q2`), with the prefix read at render time from
Site settings → Creators → `creatorCodePrefix` (default `CR`, 2–4 letters).
Lookups go through `normaliseCode(input)`: trim, upper-case, drop any leading
`LETTERS-` prefix, reject characters outside the alphabet (no look-alike
substitution). So `cr-7k4q2`, `7K4Q2` and a code quoted with an old prefix all
resolve to the same creator. Canonical URL: `/creators/7k4q2` (lower case, no
prefix); any other spelling 308-redirects to it.

**Rationale**: FR-007 needs a stable, speakable code usable in support chats,
and the brand name (hence the prefix) is not decided yet. Storing the prefix
inside the code would leave every creator who joins before the rebrand with a
stale prefix forever; storing only the identifying part makes the prefix
cosmetic, and a support agent can still look up a code from an old chat.
31⁵ ≈ 28.6 M codes is ample.

**Alternatives**: storing `PREFIX-XXXXX` with "a prefix change affects only
new codes" (the parallel plan's first draft: two prefixes in circulation after
the rebrand); sequential numbers (guessable, leaks network size); UUID (not
speakable); rewriting codes on a prefix change (breaks support history).

## 9. Locations: `locations` collection with optional parent

**Decision**: `locations` (name localized, slug, `parent` self-reference,
order, active). A location with no parent is an emirate; one with a parent is
a city. A profile lists `cities` (locations, any level, max 12). The
directory's location filter is by emirate: a creator matches an emirate if any
of their locations is that emirate or a child of it. Counts follow the same
rule.

**Rationale**: spec filters by emirate but profiles list cities; both bilingual
CMS data. One collection, one self-reference, nothing hard-coded.

**Alternatives**: free-text cities (not filterable); reusing the brief's
location option set (couples this feature to 001's brief config; 003 may unify
them once quotations need prices per location).

**Alignment with the brief (merge, §19)**: the seed gives each emirate the
same slug as the value of the brief builder's `locations` option
(`dubai`, `abu-dhabi`, `sharjah`, `ajman`, `ras-al-khaimah`, `fujairah`,
`umm-al-quwain`), and `al-ain` is seeded as a city under `abu-dhabi`. Feature
003 can then match a brief's `{location}` value to creators by slug (a city
matches through its parent) with no mapping table. The slug field is
immutable, so the alignment holds unless an editor creates a mismatching
location; 003 owns any check for that.

## 10. Spoken languages: codes, names from `Intl.DisplayNames`

**Decision**: profile `languages` is a multi-select of language codes
(`en`, `ar`, `hi`, `ur`, `fr`, `ru`, `tl`, … a curated list in
`languages.ts`). Display names come from `Intl.DisplayNames(locale)`, so both
site languages get correct names without translation entries.

**Rationale**: no new collection or translation set; names are standard data,
not copy. Adding a code is a one-line change reviewed in a PR.

**Alternatives**: a `languages` collection (overkill, no editor need today).

## 11. "Book with this creator": a standalone `/book/{code}` page

**Decision**: the CTA links to `/book/{code}`, a server-rendered page that
renders the existing `BriefBuilder` with the creator fixed, and a chip shows
the creator (name, code) with a "choose someone else" link back to the normal
flow. The professional step (amended in the merge, §19):
- **one listed professional type** → pre-answered and locked (the step is
  skipped);
- **several** → the step lists **only the creator's listed types** and the
  visitor picks one or more (nothing pre-selected, as in 001 FR-067). Locking
  all of them would force a photo + video brief on someone who only wants
  photos, which matters once 003 prices the brief.

`submitBrief` accepts a hidden `creator` code, resolves it server-side to a
**bookable** creator (`canBook` = listed, §12; otherwise the code is ignored
and the brief is stored as a normal brief), rejects any chosen persona outside
the creator's listed types (`errors.persona`), stores `briefs.creator`, and
adds the creator line to the WhatsApp message through a new optional
`{creator}` placeholder in the message template (when the CMS template lacks
it, a final line is appended).

**Rationale**: reading a `?creator=` query on `/` would make the landing page
dynamic and endanger its static cache, LCP and TTFB. A separate route keeps
one primary action per screen (Principle IX), works without JavaScript, and is
cacheable by code.

**Alternatives**: query parameter on `/` (dynamic landing); client-side
`useSearchParams` (hydration cost on the hero, no-JS path breaks); a modal on
the profile (more JS, second brief flow to keep in sync).

## 12. Listing rules for deactivated personas, accounts and empty profiles

**Decision** (all in `visibility.ts`, unit-tested; `active` and `suspended`
are read from the profile's `creator-listings` record, §18):
`isPublic` = published ∧ active ∧ ¬suspended (direct link works).
`isListed` = `isPublic` ∧ at least one of the creator's professional types is
in the audience personas — 001's `resolveActivePersonas`: listed in Site
settings → Active personas *and* with their own `active` switch on (directory, landing, specialty pages,
sitemap). A profile with zero samples is public but shows the "awaiting
samples" state, is never featured on the landing block, and sorts last.
`canBook` = `isListed` (merge, §19): the builder offers only audience
personas, so a creator whose types have all left the audience is reachable
but not bookable; their profile shows only "Ask on WhatsApp", and
`/book/{code}` returns 404 for them.
A provider pausing their profile (`active = false`) hides it everywhere,
direct link included (404). Deleting a user or a profile is refused while
briefs or the profile reference it (existing `refuseDeleteWhileReferenced`
pattern); admins suspend instead.

**Rationale**: matches the spec's edge cases without a new field per case.

## 13. The landing block and the existing categories grid

**Decision**: add a `creatorNetwork` block to the landing page-builder:
`heading`, `subheading`, `rule` (`featuredThenNewest` | `newest` |
`featuredOnly`), `count` (3–12, default 6), `cta` (to `/creators`). It renders
`CreatorGrid` server-side from the cached summaries; with no listed creators
it renders nothing (safe empty state, Principle IV). The existing
`categoriesGrid` block links each specialty to `/work/{slug}` and shows the
real sample/pro counts only when above zero (no invented numbers,
Principle IX).

**Rationale**: FR-003 asks for an editor-configured rule and count; the block
mechanism already exists and keeps section order editable.

## 14. Specialty pages and SEO text

**Decision**: `categories` gains a localized `seo` group (`title`,
`description`, `intro`). `/work/{slug}` shows the intro, counts
("428 samples · 43 pros"), up to 24 samples (newest creators first, one
sample per creator before a second from the same creator) and a creator
grid for the specialty. Feature 005 may add long-form content to the same
route; the route and data are owned here.

**Rationale**: spec US4 and the ROADMAP list `/work/{specialty}` under 002.

## 15. Provider profile form: one page, per-language fields side by side

**Decision**: `/account/profile` is a single server-rendered form (works
without JS) in sections — Basics, Specialties and places, Samples, Links —
with one primary action ("Submit for review" or "Save", per state). Localized
fields show English and Arabic inputs together (Arabic optional, English
fallback applies). Samples are managed on the same page (add, caption,
specialty, reorder with up/down buttons, remove). The visual design is shaped
with the `impeccable` workflow before building (tasks), inside "The Brief
Bar".

**Rationale**: the spec's SC-003 (10 minutes) and Principle IX favour one
page and plain labels over a wizard.

**Upload body size (merge, §19)**: `addSample` receives the file through a
server action so the form works without JavaScript. Next.js caps server
action bodies at **1 MB** by default and `next.config.ts` sets no limit, so
every photo above 1 MB would fail before the `media` hook's 5 MB check runs.
Set the server actions body size limit to `6mb` in `next.config.ts` (5 MB
file + form fields; confirm the option's exact key in Next 16.4 when
implementing) and prove it with an upload of a 4 MB image in the
integration and e2e tests. The limit applies to every action; the other
actions validate their fields with zod, so a bigger body gains an attacker
nothing beyond bandwidth, which the upload rate limits (§6) already bound.
Rejected: uploading through REST from a client island (breaks the no-JS form
and adds a second upload path).

## 16. Test naming and shape

**Decision**: tests are named `CP-US1-S2` / `CP-FR-004` (see plan header).
Integration tests (Testcontainers) cover: access matrix, the force-draft
guard (including REST), publish/unpublish visibility, code generation and
immutability, upload limits, deletion guards, brief `creator` resolution.
Domain unit tests cover every exported function. E2E: browse/filter, profile
CTA → `/book/{code}`, provider edits and admin publish, specialty counts, in
`en` and `ar-mobile`, light and dark, with axe.

## 18. Listing state lives outside the versioned profile: `creator-listings`

**Finding (verified in Payload 3.93.0 source, 2026-11-07)**:
`collections/operations/updateByID.js` loads the document to update with
`getLatestCollectionVersion` (`latest: true`), i.e. the newest version **even
when it is a draft**, and `utilities/update.js` then writes that merged data
to the main (published) row whenever the update is not a draft save. So on a
drafts-enabled collection there is no API call that changes one field
immediately without either staying in draft (no public effect) or publishing
the provider's pending, unreviewed edits along with it. A pause switch, a
suspension or a "featured" toggle stored on the profile would therefore be
either delayed or a moderation bypass.

**Decision**: a non-versioned collection `creator-listings`, exactly one per
profile, created by the profile's `afterChange` hook on create, deleted with
it. Fields: `profile` (unique, immutable), `user` (owner id copied from the
profile, immutable, used for the owner access clause), `active` (owner and
admin write), `featured`, `suspended`, `reviewNote` (admin write),
`submittedAt` (written only by the `submitForReview` server action and the
profile publish hook), `verifiedAt` (written only by the profile publish
hook). Changes take effect at once and revalidate tag `creators`.

How the two collections combine:
- **Public REST** on `creator-profiles`: the `read` access function is async;
  for non-editors it returns
  `{ or: [ { and: [ { _status: { equals: 'published' } }, { id: { not_in: <hidden profile ids> } } ] }, { user: { equals: req.user.id } } ] }`,
  where the hidden ids are the listings with `active = false` or
  `suspended = true` (a small set, read with `overrideAccess` and `select`).
- **Site pages**: `getPublicCreators` reads published profiles and their
  listings server-side (Local API) and applies `isPublic` / `isListed` in the
  domain layer; the cached query is tagged `creators`, which both
  collections revalidate.
- **Publish hook**: on a profile publish (`doc._status === 'published'` after
  a non-draft write), the profile's `afterChange` sets `verifiedAt` on the
  listing the first time and clears `submittedAt` (guarded by `req.context`
  to avoid loops).

**Rationale**: separates *content* (reviewed, versioned) from *standing*
(immediate, never reviewed), which is what the spec's pause, suspend and
feature rules need, and keeps every admin note out of public reach by
construction rather than by field rules.

**Alternatives**: the flags on the profile (rejected by the finding above);
the flags on `users` (users are private, an admin-only `featured` on an
account is misplaced, and access clauses across collections are harder to
prove); writing the main row directly with `payload.db.updateOne` (bypasses
hooks and validation, and the next publish would overwrite it from the
draft); keeping one flag (`active`) on the profile and accepting the delay
(contradicts the spec's "profile hidden" edge case and the contract's
"immediate").

## 17. Open items deliberately left to the owner (not blockers)

- **Brand prefix** for creator codes: seeded as `CR`; change in Site settings
  at any time, and every displayed code follows (§8).
- **Auto-publish edits**: defaults to **off** (every edit reviewed); the
  admin can switch it on per the spec's "or immediately, per an admin setting".
- **Identity documents**: out of scope per the spec's assumptions.

## 19. Seed and demo data; merge record (2026-11-07)

Two plans for 002 were written in parallel (worktrees
`claude/creator-profiles-feature-6713c4` and
`claude/creator-profiles-plan-002-c38e13`). This document is the first one,
which had been through `/speckit-analyze`, with the following points taken
from the second or found while comparing them.

**Seed (decision)**: the default seed (`pnpm seed`, which CI and every
environment run) creates the locations tree, the `creatorCodePrefix`, category
SEO text and the `creatorNetwork` block (which renders nothing until a creator
is listed), and **no creators and no provider accounts**. PRODUCT.md records
that no real creators, samples or counts exist yet, and Principle IX bans
invented proof; seeding three "verified" creators into every environment would
publish exactly that on the live site, and would also create provider
accounts with known passwords in production.

Demo creators are an **opt-in** seed, `SEED_DEMO_CREATORS=1 pnpm seed`
(documented in `apps/web/.env.example`): 3 verified creators + 1 unverified
(the spec's independent test), plus one multi-type creator, one with no
samples and one paused, each with its provider account and listing, fixed
codes (`D2222`, `D3333`, `D4444`, `D5555`, `D6666`, `D7777`, `D8888`) and
placeholder sample images generated with sharp (flat token-coloured squares
with an index, clearly not photography; real alt text saying so). The demo
seed refuses to run unless `NEXT_PUBLIC_SITE_URL` is a local or test host
(`localhost`, `127.0.0.1`, `*.localhost`, `*.test`). The guard is on the host,
not `NODE_ENV`, because CI runs `next start` with `NODE_ENV=production`.
Playwright and Lighthouse CI set the flag; the deploy pipeline never does.

**Merge record** (what changed relative to the first plan, and why):

| # | Change | Why |
|---|--------|-----|
| 1 | Default seed has no creators; demo creators are opt-in and host-guarded (this section) | No invented proof on the live site; no known-password provider accounts in production |
| 2 | Server action body limit raised to 6 MB (§15) | 001 sets no limit and Next's default is 1 MB, so most photo uploads would fail |
| 3 | Code stored without the prefix, displayed with the current prefix, any spelling resolves (§8) | The brand is undecided; codes must survive the rebrand |
| 4 | Multi-type creators: the professional step lists only their types, not locked (§11) | Booking a photo + video creator for photos only must stay possible |
| 5 | `canBook` = listed; unlisted reachable profiles show WhatsApp only, `/book` 404 (§12) | The builder cannot offer a persona outside the audience |
| 6 | Seeded emirate slugs equal the brief's location values (§9) | 003 matches briefs to creators with no mapping table |
| 7 | Cache entry size test at 3 000 creators (§3) | Next's 2 MB data-cache item limit fails silently |
| 8 | US4 gets numbered acceptance scenarios in the spec | `CP-US4-S1`/`S2` test names must trace to the spec |

Kept from the first plan over the second plan's alternatives: the
`creator-listings` record (the second plan worked around the same Payload
behaviour with a flag that still published pending edits on suspend),
`locations` as a collection (emirate → city) instead of reusing the option
set, `media` with bounded provider uploads instead of a separate upload
collection, the standalone `/book/{code}` page, `/creators` URLs, spoken
languages as codes, and the `CP-` test-id prefix.
