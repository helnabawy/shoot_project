# Data Model: Landing Page, Member Accounts and CMS-Managed Content

**Date**: 2026-11-06 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

All entities are Payload collections or globals stored in PostgreSQL (Payload's Postgres adapter creates and migrates the tables; localised fields and arrays live in Payload-managed side tables).

**Localisation (FR-037, FR-038)**: Payload `localization` is enabled with
locales `en` (default) and `ar` (`rtl: true`), `fallback: true`. Fields
marked **L** below are `localized: true` and hold one value per language;
everything else is shared. Localisation is applied to leaf text fields
(including those inside blocks, arrays and groups), never to a whole
`blocks`/`array` field, so section structure, order, images and anchors are
identical in both languages and only the words differ. Reads pass
`locale: 'en' | 'ar'` with `fallbackLocale: 'en'`; untranslated fields are
detected by reading `locale: 'all'` and comparing.

**Theme (FR-043)**: images that must stay legible on dark backgrounds carry
an optional dark variant (`logoDark`, `logos[].imageDark`). No other entity
is theme-dependent; the theme is a visitor preference, not content. Access functions
(`shared/payload/access.ts`): `anyone`, `authenticated`, `isAdmin`
(`roles` ∋ admin), `isEditor` (`roles` ∋ admin | editor), `isAdminOrSelf`
(admin → true; member → `{ id: { equals: user.id } }`). Default for anything
not listed is deny.

## Collections

### `users` (auth-enabled) — FR-019…FR-025

| Field | Type | Rules |
|-------|------|-------|
| `email` | email (auth) | unique, required, lowercase on save |
| `password` | auth | ≥ 8 chars (zod `registerSchema`), hashed by Payload, never returned |
| `name` | text | required, 2–80 chars |
| `roles` | select hasMany | options `admin`, `editor`, `member`; default `['member']`; `saveToJWT`; field access `create/update: isAdmin` |
| `accountType` | select | required; `seeker` \| `provider` |
| `persona` | relationship → `personas` | required when `accountType = provider`; must be active at registration (validated in server action via `isProviderRegistrationValid`) |
| `categories` | relationship → `categories` hasMany | optional; providers only |
| `phone` | text | optional; normalised E.164 if present |
| auth internals | — | `loginAttempts`, `lockUntil`, sessions (managed by Payload) |

Auth options: `tokenExpiration 604800`, `maxLoginAttempts 5`, `lockTime 900000`,
`verify false`, cookies `{ sameSite: 'Lax', secure: prod }`.

Access: `admin: isEditor` (panel entry), `create: anyone`, `read: isAdminOrSelf`,
`update: isAdminOrSelf`, `delete: isAdmin`.

State: `active` → (5 failed logins) → `locked` (until `lockUntil`) → `active`.

### `media` (upload) — FR-017

| Field | Type | Rules |
|-------|------|-------|
| `alt` | text **L** | required (English), Arabic falls back |
| file | upload | images only (`image/*`), max 10 MB; sizes `thumbnail` 400w, `card` 800w, `hero` 1600w (webp); `focalPoint` on |

Access: `read: anyone`, `create/update/delete: isEditor`. Hook: `afterChange` → `revalidateTag('media','max')`.

### `personas` — FR-026, FR-029, FR-030

| Field | Type | Rules |
|-------|------|-------|
| `singular` | text **L** | required, 2–40 chars ("Photographer" / "مصوّر") |
| `plural` | text **L** | required ("Photographers" / "مصوّرون") |
| `slug` | text | required, unique, indexed, kebab-case, read-only after create (admin `condition` + `beforeValidate` guard) |
| `description` | textarea **L** | optional, ≤ 300 chars |
| `icon` | relationship → `media` | optional |
| `order` | number | default 100 |
| `active` | checkbox | default true |
| `copy` | group | `seekerCta` text **L**, `providerCta` text **L**, `providerPitch` textarea **L** — placeholders allowed |

Access: `read: anyone`, `create/update/delete: isAdmin`.
Hooks: `afterChange`/`afterDelete` → `revalidateTag('personas','max')`;
`beforeDelete` → throw `ValidationError` if any `users.persona`,
`categories.personas` or `site-settings.activePersonas` references it.

### `categories` — FR-026, FR-029

| Field | Type | Rules |
|-------|------|-------|
| `name` | text **L** | required |
| `slug` | text | required, unique, indexed, immutable (shared) |
| `description` | textarea **L** | optional |
| `image` | relationship → `media` | optional |
| `personas` | relationship → `personas` hasMany | required, ≥ 1 |
| `order` | number | default 100 |
| `active` | checkbox | default true |

Access: `read: anyone`, `create/update/delete: isAdmin`.
Hooks: revalidate `categories`; `beforeDelete` refuses if referenced by `users.categories`.

### `option-sets` — FR-047, FR-048

| Field | Type | Rules |
|-------|------|-------|
| `name` | text **L** | required ("Occasions") |
| `slug` | text | required, unique, immutable (`occasions`, `durations`, `locations`, `shot-by`) |
| `options` | array | ≥ 1 |
| `options[].label` | text **L** | required ("an event" / "فعالية") |
| `options[].value` | text | required, kebab-case, unique within the set, immutable |
| `options[].order` | number | default 100 |
| `options[].active` | checkbox | default true |
| `options[].personas` | relationship → `personas` hasMany | empty = applies to every persona |

Access: `read: anyone`, `create/update/delete: isEditor` (editors manage
options, FR-051). Hooks: revalidate `option-sets`; `beforeDelete` refuses while a landing-page slot references it.

### `briefs` — FR-049, FR-050, FR-052, FR-054

| Field | Type | Rules |
|-------|------|-------|
| `persona` | relationship → `personas` | required |
| `selections` | array | `{ token, value, label, custom: boolean }` per slot, in sentence order |
| `date` | date | optional; not before today (Asia/Dubai) |
| `sentence` | text | the rendered sentence in the submission language (for admins/export) |
| `locale` | select | `en` \| `ar` |
| `member` | relationship → `users` | set from the session when signed in |
| `contact` | group | `name`, `whatsapp` (E.164) — optional for anonymous submissions |
| `sourcePath` | text | page the brief came from |
| `status` | select | `new` (default) \| `contacted` \| `closed`; admin-only |
| `reference` | text, unique | short human code (e.g. `B-7K4Q2`) generated in `beforeChange`; shown on confirmation (FR-055, FR-059) |
| `fingerprint` | text, indexed | hash of selections + visitor id; duplicate within 60 s is ignored |

Access: `create: anyone`, guarded by a `beforeChange` hook that enforces the
honeypot and the per-visitor limit (`site-settings.briefLimitPerHour`) for
every write path (server action and REST); the server action adds
fingerprint dedupe; `read: isAdmin or own member`, `update: isAdmin`
(status), `delete: isAdmin`. Admin list: columns persona/date/status/created,
filters, CSV export. Index on `createdAt`, `status`, `member`.

### `rate-limits` (internal) — FR-050

`{ key: 'brief:<visitorId>' (unique), count, windowStart }`; written by the
brief server action, which treats a row whose `windowStart` is older than one
hour as a fresh window; a scheduled cleanup deletes rows older than one hour;
never exposed in the admin. Access: every operation `() => false`; written
only through the Local API with `overrideAccess: true`; `admin.hidden: true`;
expired rows deleted by `/api/cron/cleanup`.

## Globals

### `site-settings` — FR-010…FR-012, FR-027

| Field | Type | Rules |
|-------|------|-------|
| `siteName` | text **L** | required |
| `logo` | relationship → `media` | required |
| `logoDark` | relationship → `media` | optional; used on dark theme (FR-043) |
| `whatsappNumber` | text | required, shared; `validate: isE164` from domain; stored normalised (`beforeValidate` → `normaliseE164`) |
| `whatsappDefaultMessage` | textarea **L** | default "Hi! I'd like to book a shoot." / Arabic equivalent (placeholders allowed) |
| `contactEmail` | email | optional |
| `social` | array | `{ platform: select(instagram, linkedin, youtube, tiktok, x), url }` |
| `activePersonas` | relationship → `personas` hasMany (ordered) | ≥ 0; warning banner in admin when empty |
| `labels` | group | `seekerLabel` **L**, `providerLabel` **L** templates with placeholders |
| `phoneNumber` | text | optional, E.164; "Call" CTA kind |
| `briefLimitPerHour` | number | default 5 anonymous briefs per visitor per hour (FR-050) |
| `expectedReplyTime` | text **L** | e.g. "within 15 minutes"; shown on the brief confirmation (FR-059) |

Access: `read: anyone`, `update: isAdmin`. Hook: revalidate `site-settings`.

### `landing-page` — FR-001…FR-003, FR-008, FR-009, FR-013…FR-015, FR-018

`versions: { drafts: true }`; `_status` draft/published; Payload records
`updatedAt` and, via `beforeChange`, `publishedBy` (user id) when `_status`
becomes `published`.

| Field | Type | Rules |
|-------|------|-------|
| `hero` | group | `eyebrow` **L** ("Quick match"), `headline` text **L** (required, ≤ 80, default "You brief. We shoot."), `subheadline` **L** (≤ 300), `trustChips` array (≤ 3, `text` **L** ≤ 40), `layout: briefBuilder \| ctas` (default `briefBuilder`: the builder is the primary action and a WhatsApp link the secondary), `primaryCta` and `secondaryCta` groups used by the `ctas` layout (`label` **L**, `kind: whatsapp\|link\|call`, `href?`), `image` → media, `imageMobile` → media |
| `briefBuilder` | group | `enabled` (default true); `sentence` **L** (default "I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}."); `slots` array — `{ token, kind: persona\|options\|date\|number, optionSet → option-sets (kind options), defaultValue, placeholder **L**, required, allowCustom }`; `submitLabel` **L** ("See who's free"); `helperText` **L** ("Free to search. Tap any word to change it, or write it in your own words."); `whatsappTemplate` **L** ("Hi! I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}."); `successMessage` **L**; `steps` array `{ title **L**, description **L** }` (the four-step outline shown as context; only step 1 is interactive in this feature) |
| `navigation` | array | `{ label` **L**`, target }` where `target` is a section anchor or path (shared) |
| `sections` | blocks | ordered, shared structure; text leaves inside blocks are **L** |
| `seo` | group | `title` **L** (≤ 60), `description` **L** (≤ 160), `ogImage` → media |

Access: `read: anyone` (published only; draft reads require `isEditor`),
`update: isEditor`, `readVersions: isEditor`. Hooks: `afterChange` →
`revalidateTag('landing-page','max')` + `revalidatePath('/')`.

#### Blocks (`sections`)

| Block `slug` | Fields | Renders as |
|--------------|--------|------------|
| `howItWorks` | `anchor` (default `how-it-works`), `heading`, `subheading`, `steps[]` {`title`, `body`, `icon`?} (3–6), `cta`? | numbered steps |
| `features` | `anchor`, `heading`, `subheading`, `items[]` {`title`, `body`, `icon`?} (≤ 8) | "Why us" grid |
| `categoriesGrid` | `anchor`, `heading`, `subheading`, `source: active\|manual`, `categories[]` (manual), `cta`? | specialties grid from `categoriesForPersonas` |
| `personaBand` | `anchor`, `heading` (placeholders), `body`, `layout: combined\|perPersona`, `cta` | "Are you a {persona.singular}?" |
| `faq` | `anchor` (default `faq`), `heading`, `items[]` {`question`, `answer` richText} | accordion + FAQPage JSON-LD |
| `logoCloud` | `anchor`, `heading`, `logos[]` {`image` → media, `imageDark`? → media} | trusted-by strip (dark variant on dark theme) |
| `richText` | `anchor`?, `content` richText | prose |
| `callToAction` | `anchor`?, `heading`, `body`, `primary` cta, `secondary` cta? | banner |

`briefBuilder.sentence` is validated in `beforeValidate`: every `{token}` in
it must match a slot and every slot token must appear in the sentence (for
each locale); the slot order is the sentence order.

Every block has `anchor` (kebab-case, unique per page, shared across
languages — validated in a global `beforeValidate` hook) so in-page
navigation (FR-004) is data-driven. Inside every block, `heading`,
`subheading`, `body`, item `title`/`body`/`question`/`answer`, CTA `label`
and rich text are **L**; `anchor`, `layout`, `source`, icons, images and
relationships are shared.
A block whose item array is empty is skipped by `RenderBlocks` (FR-008).

## Static interface strings (FR-039)

`apps/web/messages/en.json` and `apps/web/messages/ar.json` hold every
string that is not CMS content: navigation ("Login", "Register", "Account",
"Logout"), form labels and validation messages, the account page, the
language and theme controls, empty states and error pages. A unit test
asserts both files have identical key sets.

## Visitor preferences (not persisted server-side)

| Preference | Storage | Values |
|------------|---------|--------|
| language | cookie `NEXT_LOCALE` (1 year) set by the switcher / negotiation | `en`, `ar` |
| theme | `localStorage` key `theme` | `light`, `dark`, `system` |

## Shared domain types (`packages/domain`)

```ts
type Locale = 'en' | 'ar'
type Persona = { id: string; slug: string; singular: string; plural: string; order: number; active: boolean; copy?: {...} }  // already resolved for one locale
interpolatePersonaCopy(template, personaOrList, { locale })   // list conjunctions: en "or"/"and", ar "أو"/"و"
type Category = { id: string; slug: string; name: string; order: number; active: boolean; personas: string[] }
type Cta = { label: string; kind: 'whatsapp' | 'link' | 'call'; href?: string }
type SlotDef = { token: string; kind: 'persona' | 'options' | 'date' | 'number'; optionSet?: string; defaultValue?: string; required: boolean; allowCustom: boolean }
parseSentence(template) → Array<{ text } | { token }>          // tokens in order, unknown tokens flagged
optionsForSlot(set, personaId) → Option[]                       // persona filter + order + active
briefSchema(slots) → zod schema for a submission                 // required, date ≥ today (Asia/Dubai), custom text ≤ 80
renderBriefMessage(template, selections, { locale }) → string    // WhatsApp text
briefFingerprint(selections, visitorId) → string
registerSchema = { name, email, password, accountType, persona?, categories? }   // zod
loginSchema = { email, password }
whatsappNumberSchema = E.164 (8–15 digits)
```

## Relationships

```
site-settings.activePersonas ──▶ personas (ordered, many)
categories.personas          ──▶ personas (many)
users.persona                ──▶ personas (one, providers)
users.categories             ──▶ categories (many)
landing-page.hero.image      ──▶ media
landing-page.sections[*]     ──▶ media (logos, icons), categories (manual grid)
personas.icon / categories.image ──▶ media
site-settings.logo / logoDark  ──▶ media
landing-page.hero.imageMobile / seo.ogImage ──▶ media
landing-page.briefBuilder.slots[].optionSet ──▶ option-sets
option-sets.options[].personas ──▶ personas (many)
briefs.persona               ──▶ personas (one)
briefs.member                ──▶ users (one, optional)
```

## Indexes and constraints

All `unique` fields are database unique constraints; relationships are foreign keys managed by Payload.

`users.email` (unique, Payload), `personas.slug` (unique), `categories.slug`
(unique), `option-sets.slug` (unique), `briefs.reference` (unique),
`briefs.createdAt` / `status` / `member` / `fingerprint`, `rate-limits.key`
(unique), `categories.personas` (Payload relationship join table, indexed), `users.persona`.

## Seed data (FR-032)

- Admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (only when no users exist).
- Personas: `photographer`, `videographer`.
- Categories (both personas unless noted): `portrait`, `events`,
  `fashion-beauty`, `wedding-engagement`, `corporate-branding`,
  `real-estate-architecture`.
- Site settings: siteName "Shoot Project", logo placeholder (light + dark),
  `whatsappNumber` placeholder `+971500000000`, default message in `en` and
  `ar`, `activePersonas` = both.
- Landing page (published): hero "You brief. We shoot." / "أنت تحدّد. نحن
  نصوّر." + sub-headline + 3 trust chips +
  `layout: briefBuilder` (the builder primary, "Rather talk? WhatsApp us"
  secondary); sections: howItWorks (Choose → Book →
  Shoot), features (6), categoriesGrid (active), personaBand (combined),
  faq (6), callToAction — every **L** field seeded in both languages.
- Option sets (en + ar): `occasions` — a wedding or engagement, an event
  (default), a portrait session, a family or newborn shoot, friends or a
  party, a fashion or beauty shoot, a clinic, products, food and drinks, a
  property, a brand or corporate shoot, social media content, a car, sport
  or fitness, travel or lifestyle, a documentary or editorial, music or
  entertainment, aerial or drone shots, something else; `durations` — 1, 2
  (default), 3, 4, 8 hours; `locations` — Dubai (default), Abu Dhabi, Al
  Ain, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain; `shot-by` —
  anyone (default), a woman, a man.
- Brief builder: sentence, six slots (persona, occasion, date, duration,
  location, shotBy), labels, WhatsApp template, four step titles and
  descriptions from shootix.ae ("Your shoot", "Your creator", "Your
  details", "Your quotation").
- Personas and categories seeded with Arabic names (مصوّر / مصوّر فيديو,
  بورتريه, فعاليات, أزياء وجمال, أعراس وخطوبة, شركات وعلامات تجارية, عقارات
  وعمارة).
- Idempotent: upsert by `slug`; the seed writes `en` first then `ar` via
  `locale: 'ar'`; globals updated in place; all writes with
  `context.disableRevalidate`.
