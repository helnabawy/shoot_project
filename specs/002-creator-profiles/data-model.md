# Data Model: Creator Profiles and Directory

All new collections declare explicit `access` (default deny). `localized` =
Payload `localized: true` with English fallback. Types are generated, never
hand-edited. Every change ships in one reviewed additive migration
(`creator_profiles`).

## New: `creator-profiles` (group "People")

Drafts enabled (`versions: { drafts: true, maxPerDoc: 25 }`, no autosave).
`useAsTitle: displayName`.

| Field | Type | Notes |
|-------|------|-------|
| `user` | relationship → users, **unique**, required, indexed | Set from `req.user` for providers; admin may set. Immutable after create. |
| `code` | text, **unique**, indexed | 5 chars from the reference alphabet, **stored without the prefix**; generated once by hook; read-only for everyone. Displayed as `{creatorCodePrefix}-{code}`; lookups normalise any spelling (research §8). |
| `displayName` | text, localized, required for publish, 2–60 | Falls back to the user's `name` in the form default. |
| `bio` | textarea, localized, ≤ 600 | |
| `personas` | relationship → personas, hasMany, 1–4, required | Default: the user's persona. Providers may choose only **audience personas** (see Visibility); editors may set any. First is the primary type. |
| `specialties` | relationship → categories, hasMany, max 12 | Each category must belong to at least one chosen persona (validate). |
| `cities` | relationship → locations, hasMany, max 12 | |
| `languages` | select hasMany (codes, `languages.ts`) | |
| `gender` | select `woman` \| `man` (labels Female / Male) | FR-011; required before review; field read: owner, editors, admins only (never public); values equal the brief's "shot by" option values |
| `nationality` | text, ISO 3166-1 alpha-2 (`countries.ts`) | FR-011; optional; name rendered with `Intl.DisplayNames` |
| `yearsExperience` | number, integer 0–60 | FR-011; optional |
| `photo` | upload → media | Profile picture; falls back to initials mark. |
| `samples` | array, maxRows 30 | Row below. |
| `social` | array, maxRows 6 | `{ platform: instagram \| linkedin \| youtube \| tiktok \| x \| website, url: https URL }` |

The pause switch, `featured`, `suspended`, `reviewNote`, `submittedAt` and
`verifiedAt` are **not** on the profile: they must change immediately without
publishing pending edits, so they live on `creator-listings` (below,
research §18).

Field-level read access: `user` is readable only by editors and the owner
(`access.read: ({ req, doc }) => isEditor || doc.user === req.user?.id`); the
public REST response omits it. `user` and `code` have `access.update` denying
everyone (the hook sets them).

`samples[]` row:

| Field | Type | Notes |
|-------|------|-------|
| `kind` | select `image` \| `video`, default `image` | |
| `image` | upload → media | Required for `image`; the **poster** for `video`. |
| `videoUrl` | text | Required for `video`; https, host on the allowlist (`samples.ts`). |
| `caption` | text, localized, ≤ 140 | Alternative text for the image is the media's own localized `alt`; the caption is shown beside it. |
| `category` | relationship → categories | Must be among the profile's `specialties`. Drives specialty counts. |

Indexes: `user`, `code`, `_status`.

### Derived status (`status.ts`, inputs: profile + listing)

| Status | Condition (in order) |
|--------|----------------------|
| `suspended` | `listing.suspended` |
| `paused` | `listing.active = false` |
| `live-with-changes` | published and a newer draft version exists |
| `live` | published |
| `in-review` | not published, `listing.submittedAt` set |
| `draft` | otherwise |

Transitions: provider `Save` → draft version of the profile (stays `live` →
`live-with-changes`); provider `Submit for review` → `listing.submittedAt =
now`; admin **Publish** (profile) → `listing.verifiedAt` (first time),
`listing.submittedAt = null`, status `live`; admin **Unpublish** → profile
hidden (counts as un-verified, content kept); admin `listing.suspended =
true` → hidden **at once**, pending edits stay unpublished, `reviewNote`
explains; provider pause (`listing.active = false`) → hidden at once, resume
the same way. With site setting `autoPublishEdits` on, a provider save on a
profile whose listing has `verifiedAt` publishes at once.

### Visibility (`visibility.ts`)

- `isPublic` = profile published ∧ `listing.active` ∧ ¬`listing.suspended` → profile page by direct link.
- `isListed` = `isPublic` ∧ some `personas` ∈ **audience personas** → directory,
  landing block, specialty pages, sitemap.
- **Audience personas** (one meaning everywhere in this feature) = the
  output of 001's `resolveActivePersonas(settings.activePersonas, personas)`:
  personas listed in Site settings → Active personas **and** whose own
  `active` checkbox is on, in Site settings order (read with the existing
  `getActivePersonas(locale)`). A persona that fails either condition is not
  in the audience: its creators stay reachable by direct link but are not
  listed, and providers cannot newly choose it.
- `canBook` = `isListed` → the "Book with this creator" CTA and `/book/{code}`;
  a reachable but unlisted profile offers only "Ask on WhatsApp" (research §12).
- **Directory order** (spec US1-S2) = `orderCreators`:
  featured first, then newest publication, ties by code; profiles without
  samples last. The editor configures it through each listing's `featured`
  switch; the landing block's `rule` chooses among the same order.
- Featured on the landing block requires `listing.featured` and ≥ 1 sample.

### Access

| Operation | Rule |
|-----------|------|
| read | admin/editor: all. Anyone else (async access, research §18): `_status = published ∧ id ∉ hidden listings` (hidden = `active = false` or `suspended = true`), **or** own profile (any state, via `draft: true`). Field `user` readable by editor/owner only. |
| create | authenticated user with `accountType = provider` and no existing profile; always forced to draft; the hook creates its listing. |
| update | admin/editor; the owner. Non-editors: `code` and `user` immutable; `_status` forced to `draft` unless auto-publish applies (research §4). |
| delete | admin only; refused while briefs reference it; deletes its listing. |
| readVersions | admin/editor; owner for their own. |

## New: `creator-listings` (group "People", not versioned)

The profile's standing: one per profile, created by the profile hook,
never publicly readable (research §18). `useAsTitle: profile` code via a
read-only virtual `label`.

| Field | Type | Notes |
|-------|------|-------|
| `profile` | relationship → creator-profiles, **unique**, required, indexed | Immutable. |
| `user` | relationship → users, required, indexed | Owner id copied from the profile; immutable; used for the owner access clause. |
| `active` | checkbox, default true, indexed | Provider's pause switch; owner and admin may write. Takes effect immediately. |
| `featured` | checkbox, default false, indexed | **Admin write.** Never effective with zero samples. |
| `suspended` | checkbox, default false, indexed | **Admin write.** Hides a published profile at once, keeps content and pending edits. |
| `reviewNote` | textarea | **Admin write**, owner read. Shown in the provider's status banner. |
| `submittedAt` | date, indexed | Written only by `submitForReview` (server action, `overrideAccess` after the ownership check) and cleared by the profile publish hook. Drives the admin "awaiting review" filter. |
| `verifiedAt` | date, read-only | Written only by the profile publish hook, the first time it is published. |

| Operation | Rule |
|-----------|------|
| read | admin/editor: all; owner: own (`user = req.user`); **anonymous and other accounts: none**. |
| create | none through the API (the profile hook creates it with `overrideAccess`). |
| update | admin/editor: all fields except `profile`, `user`, `verifiedAt`; owner: `active` only (field access denies the rest). |
| delete | none through the API (deleted by the profile's `afterDelete`). |

Hooks: `afterChange` revalidates tag `creators` (every change here is public
in effect).

## New: `locations` (group "Audience")

| Field | Type | Notes |
|-------|------|-------|
| `name` | text, localized, required | "Dubai", "Jumeirah" |
| `slug` | slug field (immutable) | |
| `parent` | relationship → locations (self) | Empty = emirate; set = city. One level only (validate: parent must have no parent). |

Seeded emirate slugs equal the brief builder's `locations` option values
(`dubai`, `abu-dhabi`, …; `al-ain` is a city under `abu-dhabi`) so feature 003
can match briefs to creators by slug (research §9).
| `order` | number, default 100 | |
| `active` | checkbox, default true | |

Access: read anyone; create/update/delete admin. `afterChange`/`afterDelete`
revalidate tag `locations`. Delete refused while a profile references it.

## Changed collections and globals

| Target | Change |
|--------|--------|
| `briefs` | `creator` relationship → creator-profiles (optional, indexed, read-only). Set server-side only (the create hook ignores any client value and the action resolves the code). Public create access is unchanged. |
| `media` | `uploadedBy` relationship → users (hook-set, read-only, indexed). Access and limits per research §6: non-editor uploads JPEG/PNG/WebP only, ≤ 5 MB, ≤ 60 files per account, ≤ 20 per account per hour, ≤ 40 per visitor key per hour. |
| `categories` | `seo` group, localized: `title` (≤ 70), `description` (≤ 160), `intro` (textarea). |
| `site-settings` | New tab **Creators**: `creatorCodePrefix` (2–4 letters A–Z, default `CR`; display only, every code follows a change), `autoPublishEdits` (checkbox, default off), `directoryPageSize` (6–60, default 24). |
| `landing-page` | New block `creatorNetwork` (below). |
| `users` | No schema change. Provider registration unchanged; the account page links to "My profile" for providers. |

## New landing block: `creatorNetwork`

`anchor`, `heading` (localized, required), `subheading` (localized),
`rule` select (`featuredThenNewest` default \| `newest` \| `featuredOnly`),
`count` number (3–12, default 6), `cta` group (label empty hides it; default
href `/creators`).

## Domain types (`packages/domain/src/creators`)

```ts
interface CreatorSummary {
  id: string; code: string; displayName: string; bio: string
  photo: { url: string; alt: string; width?: number; height?: number } | null
  personaIds: string[]; specialtyIds: string[]; locationIds: string[]  // cities and their emirates
  emirateIds: string[]; languages: string[]
  sampleCounts: Record<string, number>   // category id → sample rows (counts only: the cached list stays < 1.5 MB at 2 000 creators)
  sampleCount: number
  featured: boolean; publishedAt: string  // newest-first ordering
}
interface DirectoryFilters { personaId?: string; specialtyId?: string; emirateId?: string }
type FacetCounts = { personas: Record<string, number>; specialties: Record<string, number>; emirates: Record<string, number> }
```

`facetCounts(creators, filters)` returns, for each facet, the count the
result would have if that facet's value were chosen while the **other two**
filters stay applied (standard faceted counting). `specialtyCounts(creators)`
returns `{ samples, pros }` per specialty id.

## Validation (zod, `schemas.ts`, shared by server actions and tests)

- `displayName` 2–60 trimmed; `bio` ≤ 600; caption ≤ 140.
- `personas` 1–4 distinct; `specialties`, `cities` ≤ 12 distinct; `languages`
  from the curated list.
- `samples` ≤ 30; image sample needs `image`; video sample needs an https
  `videoUrl` on the allowlist and a poster; `category` ∈ `specialties`.
- `social.url`: https only, matches the platform's host (`website` any https host).
- Upload (non-editor): JPEG/PNG/WebP, ≤ 5 MB, `alt` present; account owns
  < 60 files; account < 20 uploads in the last hour; visitor key < 40 uploads
  in the last hour (`media.upload.quota`, `media.upload.tooMany`).
- Submit for review requires: displayName, ≥ 1 persona, ≥ 1 specialty, ≥ 1 city,
  ≥ 1 language, and (to be featured, not to publish) samples.

## Seed (versioned, idempotent; research §19)

**Default seed** (every environment): the locations tree (all seven
emirates, slugs equal to the brief's location values, a few cities each
including `al-ain` under `abu-dhabi`, English + Arabic names), code prefix
`CR`, `seo` text for the seeded categories, and the `creatorNetwork` block
after the pro band. **No creators and no provider accounts.**

**Demo seed** (`SEED_DEMO_CREATORS=1`, refused unless `NEXT_PUBLIC_SITE_URL`
is a local or test host): 3 verified creators + 1 unverified (the spec's
independent test) across two personas, three emirates and several
specialties, plus one multi-type creator, one without samples and one
paused; each with a provider account, a listing and English + Arabic text;
fixed codes `D2222`…`D8888`; placeholder sample images generated with sharp
(flat token-coloured squares with an index, alt text saying they are
placeholders). Used by Playwright and Lighthouse CI only.
