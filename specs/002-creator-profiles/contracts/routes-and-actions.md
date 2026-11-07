# Contract: Routes, server actions, cache tags and test hooks (feature 002)

Same locale rules as feature 001 (English at the root, Arabic under `/ar`,
`alternates.languages` on every page). All routes below exist in both
languages.

## Routes

| Route | Rendering | Data | Auth | Notes |
|-------|-----------|------|------|-------|
| `/creators` | server render; the list is cached (tags `creators`, `media`, `personas`, `categories`, `locations`, `site-settings`) and filtered per request | `getPublicCreators(locale)` → `filterCreators` + `facetCounts` | none | Filters via query string `?type=<persona slug>&specialty=<category slug>&place=<emirate slug>&page=n`. Plain GET form + links with counts: works without JavaScript. Unknown values are ignored. `noindex` when any filter is set. |
| `/creators/[code]` | server render, cached per `(code, locale)` | `getCreatorByCode(code, locale)` | none | `code` is normalised (`normaliseCode`: any case, with or without a prefix); a non-canonical spelling 308-redirects to `/creators/{lowercase code}`. 404 unless `isPublic` (research §12). The Book CTA renders only when `canBook`; otherwise only "Ask on WhatsApp". Not-listed profiles (none of their personas in the audience, data-model "Audience personas") still render. JSON-LD limited to real fields. |
| `/work/[specialty]` | server render, cached per `(slug, locale)` | `getSpecialtyPage(slug, locale)` | none | 404 for unknown or inactive category. Counts `samples · pros` shown only when > 0. SEO title/description/intro from `categories.seo`. |
| `/book/[code]` | server render, cached per `(code, locale)` | `getCreatorByCode`, `getBriefBuilderConfig` | none | Brief builder with the creator fixed: one listed type → professional step locked; several → the step lists only those types. 404 unless `canBook` (listed). `noindex`. Submits through `submitBrief` with a hidden `creator` field. |
| `/account/profile` | dynamic (cookie) | `getMyProfile(user)` (latest draft) | provider only → `/login?next=/account/profile`; seekers get 404 | The provider's one-page editor and sample manager. |
| `/admin/collections/creator-profiles` | Payload | — | editor/admin | Content review. Publish = verify, Unpublish = un-verify. The edit view links to the profile's listing. |
| `/admin/collections/creator-listings` | Payload | — | editor/admin | Standing: Suspend, Feature, review note; takes effect at once, never publishes pending edits. List filters: Awaiting review (`submittedAt` set), Suspended, Featured, Paused. |

`sitemap.ts` lists `/creators`, each listed creator and each active specialty
page in both languages with alternates. `robots` unchanged.

## Server actions (`modules/creators/actions.ts`)

All take `(prev: FormState, formData: FormData)`, return
`{ errors?: Record<string, string[]>; formError?: string; ok?: true } | undefined`,
validate with the zod schemas from `@shoot/domain/creators`, run as the signed
in provider (never trust an `id` field; the profile is looked up by
`user = session user`), work without JavaScript (redirect back with the
result) and are idempotent under double submit.

| Action | Fields | Effect | Errors |
|--------|--------|--------|--------|
| `saveMyProfile` | `displayName_en/_ar`, `bio_en/_ar`, `personas[]`, `specialties[]`, `cities[]`, `languages[]`, `social[i].platform/url`, `photo?` | Creates the profile on first save (code assigned by hook). Saves a **draft**, or publishes at once when `autoPublishEdits` is on and the profile is already verified. | field errors; `formError` `profile.errors.generic` |
| `addSample` (body limit 6 MB, research §15) | `kind`, `image` (file) or `videoUrl` + `poster` (file), `caption_en/_ar`, `category` | Uploads to `media` (type, size, quota and rate checked by the `media` hook), appends a row to the draft. Max 30. | `samples.limit`, `samples.type`, `samples.size`, `samples.host`, `samples.category`, `media.upload.quota`, `media.upload.tooMany` |
| `updateSample` | `index`, `caption_en/_ar`, `category` | Edits a row in the draft. | |
| `moveSample` | `index`, `direction` (`up` \| `down`) | Reorders the draft. | |
| `removeSample` | `index` | Removes the row from the draft (media cleaned later by cron). | |
| `submitForReview` | — | Validates the "submit" rules against the latest draft, sets `submittedAt` on the profile's **listing** (`overrideAccess` after the ownership check). | list of missing fields |
| `setProfileActive` | `active` | Writes `active` on the profile's **listing** (owner field access): pause / resume takes effect at once and never publishes pending edits. | |

Admin verification is Payload's own Publish / Unpublish on the profile; the
`suspended`, `featured` and `reviewNote` fields are edited on the listing
(no custom action).

### Brief integration (`modules/brief/actions.ts`, edited)

`submitBrief` accepts an optional hidden `creator` (code). It resolves the code
with `getCreatorByCode`; a missing, non-bookable (`canBook` false) or
malformed code is ignored (the brief is stored as a normal brief). A valid
code sets `briefs.creator`, requires every chosen persona to be one of the
creator's listed types (otherwise `errors.persona`; a single-type creator's
persona is filled in server-side), and appends the creator to the WhatsApp
message through the `{creator}` placeholder (`"Name (CR-7K4Q2)"`, prefix from
Site settings at send time; appended on its own line when the CMS template
has no placeholder). A client cannot set `briefs.creator` through REST.

## Cache tags and revalidation

| Tag | Revalidated by |
|-----|----------------|
| `creators` | `creator-profiles` `afterChange` / `afterDelete` (publish, unpublish, auto-published edits); `creator-listings` `afterChange` (pause, resume, suspend, feature) |
| `locations` | `locations` `afterChange` / `afterDelete` |
| `media`, `personas`, `categories`, `site-settings`, `landing-page` | existing hooks (unchanged) |

Provider draft saves do **not** revalidate public tags (nothing public
changed). Visibility changes reach pages within 60 s; in practice immediately.

## Stable test ids

| Element | `data-testid` |
|---------|---------------|
| Landing network block / directory / specialty grid | `creator-network`, `creator-directory`, `specialty-creators` |
| Creator card (carries `data-code`) | `creator-card` |
| Filter group and option (with count) | `filter-type`, `filter-specialty`, `filter-place`, `filter-option` |
| Profile sections | `profile-header`, `profile-samples`, `profile-specialties`, `profile-places`, `profile-languages`, `profile-badges` |
| Book and WhatsApp CTAs on a profile | `creator-book`, `creator-whatsapp` |
| Fixed creator chip on `/book/[code]` | `brief-creator-chip` |
| Specialty counts | `specialty-counts` |
| Provider status banner / form / sample row | `profile-status`, `profile-form`, `sample-row` |

## Configuration and environment

| Item | Where | Value |
|------|-------|-------|
| Server action body limit | `apps/web/next.config.ts` (server actions `bodySizeLimit`; confirm the key in Next 16.4) | `6mb` — sample uploads up to 5 MB plus fields (research §15) |
| `SEED_DEMO_CREATORS` | `apps/web/.env.example` (seed only, optional) | `1` loads demo creators; refused unless `NEXT_PUBLIC_SITE_URL` is a local or test host (research §19) |
